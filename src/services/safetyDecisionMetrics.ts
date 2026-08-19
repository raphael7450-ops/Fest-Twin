import type {
  FestivalPlan,
  ForecastResult,
  MetricEstimate,
  SafetyDecisionMetrics,
  SafetyDecisionProfiles,
  SafetyZoneGuardAllocation,
  SimulationResult,
  StaffingRange,
  TrafficContext,
} from "../domain/types";
import { occupancySeries } from "./visitorOccupancy";

const STAFFING_BASIS =
  "피크 방문객, 병목 후보, 상대 혼잡 점수를 사용한 사전 배치 범위";

function clampScore(value: number) {
  return Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), 100);
}

function peakOccupancy(
  forecast: Pick<ForecastResult, "visitorsByHour" | "occupancyByHour">,
) {
  return Math.max(
    ...occupancySeries(forecast).map((item) =>
      Number.isFinite(item.visitors) ? item.visitors : 0,
    ),
    0,
  );
}

function staffingRange(
  peakVisitors: number,
  bottleneckCount: number,
  relativeScore: number,
): StaffingRange {
  const recommended = Math.max(
    8,
    Math.ceil(peakVisitors / 820 + bottleneckCount * 2 + relativeScore / 50),
  );

  return {
    min: Math.max(8, Math.floor(recommended * 0.85)),
    recommended,
    max: Math.ceil(recommended * 1.15),
    unit: "people",
    confidence: "low",
    basis: STAFFING_BASIS,
  };
}

function allocateByNormalizedWeights(
  plan: FestivalPlan,
  bottleneckCount: number,
  recommended: number,
): SafetyZoneGuardAllocation[] {
  const definitions = [
    {
      zoneName: "무대 구역",
      weight: Math.max(plan.facilities.filter((facility) => facility.type === "stage").length, 1),
      reason: "무대 주변 집중 인파의 흐름과 관람 동선을 관리합니다.",
    },
    {
      zoneName: "출입구 구역",
      weight: Math.max(
        plan.facilities.filter((facility) => facility.type === "entrance").length,
        1,
      ),
      reason: "주요 출입구의 입퇴장 흐름과 교차 동선을 관리합니다.",
    },
    {
      zoneName: "병목 구역",
      weight: Math.max(bottleneckCount, 1),
      reason: "시뮬레이션에서 확인된 상대 혼잡 병목 후보를 관리합니다.",
    },
  ];
  const totalWeight = definitions.reduce((total, definition) => total + definition.weight, 0);
  const exactAllocations = definitions.map(
    (definition) => (recommended * definition.weight) / totalWeight,
  );
  const roundedAllocations = exactAllocations.map(Math.floor);
  let remainder = recommended - roundedAllocations.reduce((total, value) => total + value, 0);
  const remainderOrder = exactAllocations
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  for (let index = 0; index < remainder; index += 1) {
    roundedAllocations[remainderOrder[index].index] += 1;
  }

  return definitions.map((definition, index) => ({
    zoneName: definition.zoneName,
    recommendedGuards: roundedAllocations[index],
    priority:
      roundedAllocations[index] >= Math.ceil(recommended * 0.4)
        ? "high"
        : roundedAllocations[index] >= Math.ceil(recommended * 0.2)
          ? "medium"
          : "low",
    reason: definition.reason,
  }));
}

function physicalDensity(plan: FestivalPlan, peakVisitors: number): MetricEstimate {
  const area = plan.venueAreaSquareMeters;

  if (!Number.isFinite(area) || (area ?? 0) <= 0) {
    return {
      status: "unavailable",
      unit: "people_per_square_meter",
      confidence: "low",
      reason: "행사장 면적 정보가 없어 물리 밀도를 산출할 수 없습니다.",
    };
  }

  return {
    status: "available",
    value: peakVisitors / area!,
    unit: "people_per_square_meter",
    confidence: "low",
    basis: `피크 방문객 ${peakVisitors.toLocaleString("ko-KR")}명 / 행사장 면적 ${area!.toLocaleString("ko-KR")}m²`,
  };
}

function evacuationTime(plan: FestivalPlan, peakVisitors: number): MetricEstimate {
  const exitWidth = plan.totalExitWidthMeters;
  const distance = plan.evacuationDistanceMeters;
  const missingInputs = [
    !Number.isFinite(exitWidth) || (exitWidth ?? 0) <= 0 ? "총 출구 폭" : null,
    !Number.isFinite(distance) || (distance ?? 0) <= 0 ? "피난 거리" : null,
  ].filter((value): value is string => value !== null);

  if (missingInputs.length > 0) {
    return {
      status: "unavailable",
      unit: "seconds",
      confidence: "low",
      reason: `${missingInputs.join("과 ")} 정보가 없어 피난 시간을 산출할 수 없습니다.`,
    };
  }

  const flowCapacity = exitWidth! * 1.3;
  const queueSeconds = peakVisitors / flowCapacity;
  const walkingSeconds = distance! / 1.0;

  return {
    status: "available",
    value: queueSeconds + walkingSeconds,
    unit: "seconds",
    confidence: "low",
    basis: `총 출구 폭 ${exitWidth}m, 출구 폭 1m당 초당 1.3명 유동, 피난 거리 ${distance}m, 보행 속도 초당 1.0m 가정`,
  };
}

function createMetrics(
  plan: FestivalPlan,
  simulation: SimulationResult,
  peakVisitors: number,
): SafetyDecisionMetrics {
  const safePeakVisitors = Math.max(Number.isFinite(peakVisitors) ? peakVisitors : 0, 0);
  const relativeScore = clampScore(simulation.congestionScore);
  const bottleneckCount = simulation.bottlenecks.length;
  const staffing = staffingRange(safePeakVisitors, bottleneckCount, relativeScore);
  const criticalCellCount = simulation.cells.filter((cell) => cell.level === "critical").length;
  const medicalStaffValue = Math.max(
    2,
    Math.ceil(safePeakVisitors / 7200 + criticalCellCount / 14),
  );

  return {
    staffing,
    zoneAllocations: allocateByNormalizedWeights(
      plan,
      bottleneckCount,
      staffing.recommended,
    ),
    relativeCongestion: {
      status: "available",
      value: relativeScore,
      unit: "score",
      confidence: "low",
      basis: `${simulation.hour}:00 시뮬레이션 격자의 상대 혼잡 점수 평균`,
    },
    peakDensity: physicalDensity(plan, safePeakVisitors),
    medicalStaff: {
      status: "available",
      value: medicalStaffValue,
      unit: "people",
      confidence: "low",
      basis: "피크 방문객과 임계 상대 혼잡 격자를 사용한 사전 의료 인력 추정",
    },
    ambulances: {
      status: "available",
      value: Math.max(1, Math.ceil(medicalStaffValue / 2.5)),
      unit: "people",
      confidence: "low",
      basis: "추천 의료 인력 2.5명당 구급차 1대 가정",
    },
    evacuationTime: evacuationTime(plan, safePeakVisitors),
  };
}

export function createSafetyDecisionProfiles(
  plan: FestivalPlan,
  forecast: ForecastResult,
  simulation: SimulationResult,
  _traffic?: TrafficContext,
): SafetyDecisionProfiles {
  const fallbackPeakVisitors = peakOccupancy(forecast);
  const summaryPeakVisitors = forecast.dayTypeProfiles?.summary
    ? peakOccupancy(forecast.dayTypeProfiles.summary)
    : fallbackPeakVisitors;
  const weekdayPeakVisitors = forecast.dayTypeProfiles?.weekday
    ? peakOccupancy(forecast.dayTypeProfiles.weekday)
    : summaryPeakVisitors;
  const weekendPeakVisitors = forecast.dayTypeProfiles?.weekend
    ? peakOccupancy(forecast.dayTypeProfiles.weekend)
    : summaryPeakVisitors;

  return {
    summary: createMetrics(plan, simulation, summaryPeakVisitors),
    weekday: createMetrics(plan, simulation, weekdayPeakVisitors),
    weekend: createMetrics(plan, simulation, weekendPeakVisitors),
  };
}
