/**
 * 파일 : src/services/impactMetrics.ts
 * 내용 : 흥행 예측 지수, 안전요원/의료진 추천 배치, 주차 차오름 및 경제적 파급효과 지표 종합 산출기
 * 수정 : 2026-07-24. 안전관리 지침 배치 인원 산출 공식 및 상권 소비지출 ROI 계산기 통합
 */

import type {
  DemandBackdataContext,
  FestivalPlan,
  ForecastResult,
  SimulationResult,
  SpendingContext,
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
  spendingBasisLabel: string;
  spendingSourceName: string;
  spendingConfidence: "high" | "medium" | "low";
}

const FALLBACK_SPEND_PER_VISITOR_KRW = 58400;
const PEAK_DENSITY_STANDARD_PEOPLE_PER_SQUARE_METER = 6.2;
const PEAK_DENSITY_DISPLAY_MAX_PEOPLE_PER_SQUARE_METER = 9.9;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function average(values: number[]) {
  return values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function demandBackdataBenchmark(demandBackdata?: DemandBackdataContext) {
  const festivals =
    demandBackdata?.similarFestivalBaselines.filter((festival) => festival.visitors) ?? [];
  const totalWeight = festivals.reduce(
    (sum, festival) => sum + Math.max(festival.similarityScore, 1),
    0,
  );

  if (festivals.length === 0 || totalWeight === 0) {
    return { visitors: 0, costPerVisitorKrw: 0 };
  }

  const visitors =
    festivals.reduce(
      (sum, festival) => sum + (festival.visitors ?? 0) * Math.max(festival.similarityScore, 1),
      0,
    ) / totalWeight;
  const costBenchmarks = festivals
    .filter((festival) => festival.visitors && festival.budgetMillionKrw)
    .map(
      (festival) =>
        ((festival.budgetMillionKrw ?? 0) * 1_000_000) / Math.max(festival.visitors ?? 1, 1),
    );

  return {
    visitors,
    costPerVisitorKrw: Math.round(average(costBenchmarks)),
  };
}

export function calculatePeakDensityPerSquareMeter(
  simulation: SimulationResult,
) {
  const peakCellDensity = Math.max(
    ...simulation.cells.map((cell) => cell.density),
    0,
  );

  return Math.round(
    clamp(
      (peakCellDensity / 100) * PEAK_DENSITY_STANDARD_PEOPLE_PER_SQUARE_METER,
      0.2,
      PEAK_DENSITY_DISPLAY_MAX_PEOPLE_PER_SQUARE_METER,
    ) * 10,
  ) / 10;
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
  demandBackdata?: DemandBackdataContext,
) {
  const totalBudgetKrw = plan.totalBudgetMillionKrw * 1_000_000;
  const plannedCostPerVisitor = totalBudgetKrw / Math.max(forecast.expectedVisitors, 1);
  const benchmark = demandBackdataBenchmark(demandBackdata);

  if (benchmark.costPerVisitorKrw > 0) {
    return Math.round(plannedCostPerVisitor * 0.65 + benchmark.costPerVisitorKrw * 0.35);
  }

  return Math.round(plannedCostPerVisitor);
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
  demandBackdata?: DemandBackdataContext,
): SummaryKpiMetrics {
  const benchmark = demandBackdataBenchmark(demandBackdata);
  const forecastDemandIndex = Math.max(
    (forecast.expectedVisitors / Math.max(plan.expectedCapacity, 1)) * 100,
    0,
  );
  const benchmarkDemandIndex =
    benchmark.visitors > 0
      ? Math.max((benchmark.visitors / Math.max(plan.expectedCapacity, 1)) * 100, 0)
      : 0;
  const demandIndex = Math.round(
    benchmarkDemandIndex > 0
      ? forecastDemandIndex * 0.68 + benchmarkDemandIndex * 0.32
      : forecastDemandIndex,
  );
  const demandGrade =
    demandIndex >= 90 ? "상" : demandIndex >= 70 ? "중" : "하";
  const backdataDensityAdjustment =
    benchmark.visitors > 0
      ? clamp((benchmark.visitors / Math.max(plan.expectedCapacity, 1) - 1) * 0.42, 0, 2.4)
      : 0;
  const peakDensity = getDensityRisk(
    Math.round((calculatePeakDensityPerSquareMeter(simulation) + backdataDensityAdjustment) * 10) /
      10,
  );
  const costPerVisitorKrw = calculateBudgetPerVisitor(plan, forecast, demandBackdata);
  const backdataSpilloverBonus =
    benchmark.visitors > 0
      ? clamp(Math.log10(Math.max(benchmark.visitors, 1) / 10_000) * 4, 0, 12)
      : 0;
  const nearbyInflowRate = Math.round(
    clamp(calculateCommercialSpilloverRate(tourism) + backdataSpilloverBonus, 25, 95),
  );
  const backdataLabel = benchmark.visitors > 0 ? "DB 실적 반영" : "추정값";

  return {
    demandIndex: {
      percent: demandIndex,
      grade: demandGrade,
      description: `${forecast.peakHour}:00 피크 수요와 유사축제 ${backdataLabel}`,
    },
    peakDensity,
    budgetEfficiency: {
      costPerVisitorKrw,
      description:
        benchmark.costPerVisitorKrw > 0
          ? "기획 예산과 지역축제 DB 1인당 예산을 함께 반영"
          : "총 예산을 예상 방문객 수로 나눈 사전 검토값",
    },
    spillover: {
      nearbyInflowRate,
      description:
        benchmark.visitors > 0
          ? "주변 관광지 매력도와 DB 방문객 규모를 함께 반영"
          : "TourAPI 주변 관광지 매력도 기반 연계 가능성",
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
  spending?: SpendingContext,
): EconomicImpactMetrics {
  const totalBudgetKrw = plan.totalBudgetMillionKrw * 1_000_000;
  const averageSpendPerVisitorKrw =
    spending?.averageSpendPerVisitorKrw ?? FALLBACK_SPEND_PER_VISITOR_KRW;
  const expectedLocalSpendingKrw =
    forecast.expectedVisitors * averageSpendPerVisitorKrw;

  return {
    totalBudgetKrw,
    expectedLocalSpendingKrw,
    averageSpendPerVisitorKrw,
    roiMultiplier:
      Math.round((expectedLocalSpendingKrw / Math.max(totalBudgetKrw, 1)) * 10) /
      10,
    spendingBasisLabel: spending?.basisLabel ?? "공공데이터 구조 기반 샘플",
    spendingSourceName: spending?.sourceName ?? "한국관광공사 관광 소비 백데이터 샘플",
    spendingConfidence: spending?.confidence ?? "low",
  };
}
