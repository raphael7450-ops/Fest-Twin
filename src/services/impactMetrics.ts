/**
 * 파일 : src/services/impactMetrics.ts
 * 내용 : 흥행 예측 지수, 안전요원/의료진 추천 배치, 주차 차오름 및 경제적 파급효과 지표 종합 산출기
 * 수정 : 2026-07-24. 안전관리 지침 배치 인원 산출 공식 및 상권 소비지출 ROI 계산기 통합
 */

import type {
  DemandBackdataContext,
  FestivalPlan,
  ForecastResult,
  MetricEstimate,
  SafetyDecisionMetrics,
  SimulationResult,
  SpendingContext,
  TourismContext,
  TrafficContext,
} from "../domain/types";
import { createSafetyDecisionProfiles } from "./safetyDecisionMetrics";

// Metric contracts kept separate so opportunity and load are not conflated.

export interface SummaryKpiMetrics {
  successPotential: SuccessPotentialMetric;
  capacityPressure: CapacityPressureMetric;
  peakDensity: MetricEstimate;
  budgetEfficiency: {
    costPerVisitorKrw: number;
    description: string;
  };
  spillover: {
    nearbyInflowRate: number;
    description: string;
  };
}

export interface SuccessPotentialMetric {
  score: number;
  grade: "상" | "중" | "하";
  description: string;
}

export interface CapacityPressureMetric {
  ratio: number;
  displayPercent: number;
  status: "within" | "caution" | "over";
}

export interface LogisticsMetrics {
  parkingOccupancyRate: number;
  trafficRiskScore: number;
  trafficRiskLabel: "낮음" | "보통" | "높음";
  trafficRoadName: string;
  trafficSourceLabel: string;
  trafficSourceStatusLabel: string;
  parkingBaseOccupancyRate: number;
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

function clamp(value: number, min: number, max: number) {
  const safeMin = Number.isFinite(min) ? min : 0;
  const safeMax = Number.isFinite(max) ? max : safeMin;
  const orderedMin = Math.min(safeMin, safeMax);
  const orderedMax = Math.max(safeMin, safeMax);
  const safeValue = Number.isFinite(value) ? value : orderedMin;
  return Math.min(Math.max(safeValue, orderedMin), orderedMax);
}

function average(values: number[]) {
  const finiteValues = values.filter((value) => Number.isFinite(value));
  return finiteValues.length === 0
    ? 0
    : finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length;
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

export function calculateBudgetPerVisitor(
  plan: FestivalPlan,
  forecast: ForecastResult,
  demandBackdata?: DemandBackdataContext,
) {
  const totalBudgetKrw =
    Math.max(Number.isFinite(plan.totalBudgetMillionKrw) ? plan.totalBudgetMillionKrw : 0, 0) *
    1_000_000;
  const expectedVisitors = Math.max(
    Number.isFinite(forecast.expectedVisitors) ? forecast.expectedVisitors : 0,
    1,
  );
  const plannedCostPerVisitor = totalBudgetKrw / expectedVisitors;
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

export function createSuccessPotentialMetric(
  forecast: ForecastResult,
): SuccessPotentialMetric {
  const score = Math.round(clamp(forecast.successScore, 0, 100));

  return {
    score,
    grade: score >= 85 ? "상" : score >= 70 ? "중" : "하",
    description: "예측 모델의 성공 가능성을 0~100점 범위로 정규화한 점수입니다.",
  };
}

export function createCapacityPressureMetric(
  plan: FestivalPlan,
  forecast: ForecastResult,
): CapacityPressureMetric {
  const expectedVisitors = Math.max(
    Number.isFinite(forecast.expectedVisitors) ? forecast.expectedVisitors : 0,
    0,
  );
  const expectedCapacity = Math.max(
    Number.isFinite(plan.expectedCapacity) ? plan.expectedCapacity : 0,
    1,
  );
  const ratio = expectedVisitors / expectedCapacity;

  return {
    ratio,
    displayPercent: Math.max(Math.round(ratio * 100), 0),
    status: ratio <= 0.85 ? "within" : ratio <= 1 ? "caution" : "over",
  };
}

export function createSummaryKpiMetrics(
  plan: FestivalPlan,
  forecast: ForecastResult,
  simulation: SimulationResult,
  tourism: TourismContext,
  demandBackdata?: DemandBackdataContext,
  safetyMetrics?: SafetyDecisionMetrics,
): SummaryKpiMetrics {
  const benchmark = demandBackdataBenchmark(demandBackdata);
  const peakDensity =
    safetyMetrics?.peakDensity ??
    createSafetyDecisionProfiles(plan, forecast, simulation).summary.peakDensity;
  const costPerVisitorKrw = calculateBudgetPerVisitor(plan, forecast, demandBackdata);
  const backdataSpilloverBonus =
    benchmark.visitors > 0
      ? clamp(Math.log10(Math.max(benchmark.visitors, 1) / 10_000) * 4, 0, 12)
      : 0;
  const nearbyInflowRate = Math.round(
    clamp(calculateCommercialSpilloverRate(tourism) + backdataSpilloverBonus, 25, 95),
  );
  return {
    successPotential: createSuccessPotentialMetric(forecast),
    capacityPressure: createCapacityPressureMetric(plan, forecast),
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

export function createLogisticsMetrics(
  plan: FestivalPlan,
  forecast: ForecastResult,
  simulation: SimulationResult,
  traffic?: TrafficContext,
): LogisticsMetrics {
  const peakVisitors = Math.max(
    ...forecast.visitorsByHour.map((item) =>
      Number.isFinite(item.visitors) ? item.visitors : 0,
    ),
    0,
  );
  const highRiskCells = simulation.cells.filter(
    (cell) => cell.level === "high" || cell.level === "critical",
  ).length;
  const estimatedCars = peakVisitors * 0.18;
  const assumedParkingCapacity = Math.max(
    180,
    Math.max(Number.isFinite(plan.expectedCapacity) ? plan.expectedCapacity : 0, 0) * 0.08 +
      highRiskCells * 8,
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
    parkingOccupancyRate,
    trafficRiskScore,
    trafficRiskLabel: traffic?.riskLabel ?? "낮음",
    trafficRoadName: traffic?.links[0]?.roadName ?? "교통량 기준 도로 없음",
    trafficSourceLabel: traffic?.provenance.sourceName ?? "KTDB/View-T 교통량",
    trafficSourceStatusLabel:
      traffic?.status === "sample-fallback" ? "샘플 대체" : `${traffic?.year ?? 2024}년 기준`,
    parkingBaseOccupancyRate,
  };
}

export function createEconomicImpactMetrics(
  plan: FestivalPlan,
  forecast: ForecastResult,
  spending?: SpendingContext,
): EconomicImpactMetrics {
  const safeBudgetKrw =
    Math.max(Number.isFinite(plan.totalBudgetMillionKrw) ? plan.totalBudgetMillionKrw : 0, 0) *
    1_000_000;
  const averageSpendPerVisitorKrw =
    Math.max(
      Number.isFinite(spending?.averageSpendPerVisitorKrw)
        ? spending?.averageSpendPerVisitorKrw ?? FALLBACK_SPEND_PER_VISITOR_KRW
        : FALLBACK_SPEND_PER_VISITOR_KRW,
      0,
    );
  const expectedVisitors = Math.max(
    Number.isFinite(forecast.expectedVisitors) ? forecast.expectedVisitors : 0,
    0,
  );
  const expectedLocalSpendingKrw =
    expectedVisitors * averageSpendPerVisitorKrw;

  return {
    totalBudgetKrw: safeBudgetKrw,
    expectedLocalSpendingKrw,
    averageSpendPerVisitorKrw,
    roiMultiplier:
      Math.round((expectedLocalSpendingKrw / Math.max(safeBudgetKrw, 1)) * 10) /
      10,
    spendingBasisLabel: spending?.basisLabel ?? "공공데이터 구조 기반 샘플",
    spendingSourceName: spending?.sourceName ?? "한국관광공사 관광 소비 백데이터 샘플",
    spendingConfidence: spending?.confidence ?? "low",
  };
}
