import type {
  FestivalPlan,
  ForecastResult,
  SimulationResult,
  TourismContext,
  TrafficContext,
} from "../domain/types";

export type DensityRiskStatus = "normal" | "caution" | "warning";

export interface SummaryKpiMetrics {
  demandIndex: {
    percent: number;
    grade: "상" | "중" | "하";
    description: string;
  };
  peakDensity: {
    peoplePerSquareMeter: number;
    status: DensityRiskStatus;
    label: "정상" | "주의" | "경고";
  };
  budgetEfficiency: {
    costPerVisitorKrw: number;
    description: string;
  };
  spillover: {
    nearbyInflowRate: number;
    description: string;
  };
}

export interface SafetyLogisticsMetrics {
  safetyStaff: number;
  medicalStaff: number;
  parkingOccupancyRate: number;
  trafficRiskScore: number;
  trafficRiskLabel: "낮음" | "보통" | "높음";
  trafficRoadName: string;
  trafficSourceLabel: string;
  trafficSourceStatusLabel: string;
  parkingBaseOccupancyRate: number;
  peakDensity: number;
  peakVisitors: number;
}

export interface EconomicImpactMetrics {
  totalBudgetKrw: number;
  expectedLocalSpendingKrw: number;
  averageSpendPerVisitorKrw: number;
  roiMultiplier: number;
}

const AVERAGE_SPEND_PER_VISITOR_KRW = 62000;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function average(values: number[]) {
  return values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function calculatePeakDensityPerSquareMeter(
  simulation: SimulationResult,
) {
  const peakCellDensity = Math.max(
    ...simulation.cells.map((cell) => cell.density),
    0,
  );

  return Math.round(clamp((peakCellDensity / 100) * 6.2, 0.2, 6.2) * 10) / 10;
}

export function getDensityRisk(
  peoplePerSquareMeter: number,
): SummaryKpiMetrics["peakDensity"] {
  if (peoplePerSquareMeter >= 5) {
    return {
      peoplePerSquareMeter,
      status: "warning",
      label: "경고",
    };
  }

  if (peoplePerSquareMeter >= 3) {
    return {
      peoplePerSquareMeter,
      status: "caution",
      label: "주의",
    };
  }

  return {
    peoplePerSquareMeter,
    status: "normal",
    label: "정상",
  };
}

export function calculateBudgetPerVisitor(
  plan: FestivalPlan,
  forecast: ForecastResult,
) {
  const totalBudgetKrw = plan.totalBudgetMillionKrw * 1_000_000;

  return Math.round(totalBudgetKrw / Math.max(forecast.expectedVisitors, 1));
}

export function calculateCommercialSpilloverRate(tourism: TourismContext) {
  const nearbyAppeal = average(
    tourism.nearbySpots.map((spot) => spot.appealScore),
  );
  const nearbyCountBonus = Math.min(tourism.nearbySpots.length * 3, 12);

  return Math.round(clamp(nearbyAppeal * 0.72 + nearbyCountBonus, 25, 88));
}

export function createSummaryKpiMetrics(
  plan: FestivalPlan,
  forecast: ForecastResult,
  simulation: SimulationResult,
  tourism: TourismContext,
): SummaryKpiMetrics {
  const demandIndex = Math.round(
    clamp((forecast.expectedVisitors / Math.max(plan.expectedCapacity, 1)) * 100, 0, 145),
  );
  const demandGrade =
    demandIndex >= 90 ? "상" : demandIndex >= 70 ? "중" : "하";
  const peakDensity = getDensityRisk(
    calculatePeakDensityPerSquareMeter(simulation),
  );
  const costPerVisitorKrw = calculateBudgetPerVisitor(plan, forecast);
  const nearbyInflowRate = calculateCommercialSpilloverRate(tourism);

  return {
    demandIndex: {
      percent: demandIndex,
      grade: demandGrade,
      description: `${forecast.peakHour}:00 피크 수요와 행사장 수용력 기준`,
    },
    peakDensity,
    budgetEfficiency: {
      costPerVisitorKrw,
      description: "총 예산을 예상 방문객 수로 나눈 사전 검토값",
    },
    spillover: {
      nearbyInflowRate,
      description: "TourAPI 주변 관광지 매력도 기반 연계 가능성",
    },
  };
}

export function createSafetyLogisticsMetrics(
  plan: FestivalPlan,
  forecast: ForecastResult,
  simulation: SimulationResult,
  traffic?: TrafficContext,
): SafetyLogisticsMetrics {
  const peakVisitors = Math.max(
    ...forecast.visitorsByHour.map((item) => item.visitors),
    0,
  );
  const peakDensity = calculatePeakDensityPerSquareMeter(simulation);
  const criticalCells = simulation.cells.filter(
    (cell) => cell.level === "critical",
  ).length;
  const highRiskCells = simulation.cells.filter(
    (cell) => cell.level === "high" || cell.level === "critical",
  ).length;
  const bottleneckWeight = simulation.bottlenecks.length * 2;
  const safetyStaff = Math.max(
    8,
    Math.ceil(peakVisitors / 820 + peakDensity * 2 + bottleneckWeight),
  );
  const medicalStaff = Math.max(
    2,
    Math.ceil(peakVisitors / 7200 + criticalCells / 14),
  );
  const estimatedCars = peakVisitors * 0.18;
  const assumedParkingCapacity = Math.max(
    180,
    plan.expectedCapacity * 0.08 + highRiskCells * 8,
  );
  const parkingBaseOccupancyRate = Math.round(
    clamp((estimatedCars / assumedParkingCapacity) * 100, 0, 100),
  );
  const trafficRiskScore = traffic?.riskScore ?? 0;
  const trafficParkingAdjustment = Math.round(trafficRiskScore * 0.12);
  const parkingOccupancyRate = Math.round(
    clamp(parkingBaseOccupancyRate + trafficParkingAdjustment, 0, 100),
  );

  return {
    safetyStaff,
    medicalStaff,
    parkingOccupancyRate,
    trafficRiskScore,
    trafficRiskLabel: traffic?.riskLabel ?? "낮음",
    trafficRoadName: traffic?.links[0]?.roadName ?? "교통량 기준 도로 없음",
    trafficSourceLabel: traffic?.provenance.sourceName ?? "KTDB/View-T 교통량",
    trafficSourceStatusLabel:
      traffic?.status === "sample-fallback" ? "샘플 대체" : `${traffic?.year ?? 2024}년 기준`,
    parkingBaseOccupancyRate,
    peakDensity,
    peakVisitors,
  };
}

export function createEconomicImpactMetrics(
  plan: FestivalPlan,
  forecast: ForecastResult,
): EconomicImpactMetrics {
  const totalBudgetKrw = plan.totalBudgetMillionKrw * 1_000_000;
  const expectedLocalSpendingKrw =
    forecast.expectedVisitors * AVERAGE_SPEND_PER_VISITOR_KRW;

  return {
    totalBudgetKrw,
    expectedLocalSpendingKrw,
    averageSpendPerVisitorKrw: AVERAGE_SPEND_PER_VISITOR_KRW,
    roiMultiplier:
      Math.round((expectedLocalSpendingKrw / Math.max(totalBudgetKrw, 1)) * 10) /
      10,
  };
}
