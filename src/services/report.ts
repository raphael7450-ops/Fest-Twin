/**
 * 파일 : src/services/report.ts
 * 내용 : 사전 진단 리포트, 리스크 점수 및 기획 보완 추천안(Recommendation) 생성 엔진
 * 수정 : 2026-07-24. B2G 예산 효율성, 군중 안전 및 상권 파급 리스크 종합 진단 보고서 작성
 */

import type {
  FestivalPlan,
  ForecastResult,
  PlanningReport,
  Recommendation,
  RiskLevel,
  RiskScore,
  SimulationResult,
} from "../domain/types";
import { clamp } from "./forecast";
import {
  createCapacityPressureMetric,
  createSuccessPotentialMetric,
} from "./impactMetrics";

export function scoreToLevel(score: number): RiskLevel {
  if (score >= 85) return "critical";
  if (score >= 65) return "high";
  if (score >= 35) return "medium";
  return "low";
}

export function createPlanningReport(
  plan: FestivalPlan,
  forecast: ForecastResult,
  simulation: SimulationResult,
): PlanningReport {
  const successPotential = createSuccessPotentialMetric(forecast);
  const capacityPressure = createCapacityPressureMetric(plan, forecast);
  const promotionShare =
    (plan.promotionBudgetMillionKrw / plan.totalBudgetMillionKrw) * 100;
  const congestionRisk = clamp(
    simulation.congestionScore + simulation.bottlenecks.length * 7,
    0,
    100,
  );
  const budgetWasteRisk = clamp(
    Math.abs(plan.totalBudgetMillionKrw / Math.max(forecast.expectedVisitors / 1000, 1) - 18) *
      3 +
      Math.max(promotionShare - 22, 0) * 1.6,
    0,
    100,
  );
  const satisfactionRisk = clamp(
    congestionRisk * 0.7 + capacityPressure.displayPercent * 0.3,
    0,
    100,
  );
  const scores: RiskScore[] = [
    {
      label: "흥행 가능성",
      score: successPotential.score,
      level: scoreToLevel(successPotential.score),
      reason:
        "관광 매력도, 유사 축제 추정 수요와 트렌드 관심도 프록시, 프로그램 매력도를 종합했습니다.",
    },
    {
      label: "밀집 위험",
      score: Math.round(congestionRisk),
      level: scoreToLevel(congestionRisk),
      reason: "피크 시간대 밀집도와 병목 지점 수를 반영했습니다.",
    },
    {
      label: "예산 낭비 위험",
      score: Math.round(budgetWasteRisk),
      level: scoreToLevel(budgetWasteRisk),
      reason: "예상 방문객 대비 예산 규모와 홍보 예산 비중을 비교했습니다.",
    },
    {
      label: "만족도 저하 위험",
      score: Math.round(satisfactionRisk),
      level: scoreToLevel(satisfactionRisk),
      reason: "밀집 위험과 수용률 압박을 함께 반영했습니다.",
    },
  ];
  const recommendations: Recommendation[] = [
    {
      id: "program-split",
      title: "피크 프로그램 분산",
      detail:
        "메인 공연 시간대에 보조 프로그램을 배치해 중앙 무대 집중을 낮춥니다.",
      expectedEffect: "피크 시간 밀집 완화",
    },
    {
      id: "entrance-staff",
      title: "출입구 안내 인력 재배치",
      detail:
        "주요 출입구와 병목 구역에 임시 안내 사인과 안전 인력을 우선 배치합니다.",
      expectedEffect: "초기 유입 쏠림 완화",
    },
    {
      id: "booth-layout",
      title: "먹거리 부스 동선 분리",
      detail:
        "먹거리 부스를 메인 무대 접근 동선에서 분리해 대기열이 이동 흐름을 막지 않게 합니다.",
      expectedEffect: "대기시간 및 이동 충돌 완화",
    },
    {
      id: "tour-route",
      title: "주변 관광지 연계 코스 운영",
      detail:
        "TourAPI 주변 관광지를 사전·사후 방문 코스로 안내해 방문 시간대를 분산합니다.",
      expectedEffect: "행사장 체류 과밀 완화",
    },
  ];

  return {
    summary: `${plan.name}은 흥행 가능성이 높지만 ${forecast.peakHour}:00 피크 시간대 밀집 관리와 예산 효율 검토가 필요합니다.`,
    scores,
    findings: [
      `수용 정원률 ${capacityPressure.displayPercent}%로 ${
        capacityPressure.status === "over"
          ? "정원 초과가 예상됩니다."
          : capacityPressure.status === "caution"
            ? "정원 근접이 예상됩니다."
            : "선택 기획안 정원 내입니다."
      }`,
      `${forecast.peakHour}:00 이후 방문객 집중 가능성이 높습니다.`,
      `예상 방문객은 ${forecast.expectedVisitors.toLocaleString("ko-KR")}명입니다.`,
      `감지된 병목 지점은 ${simulation.bottlenecks.length}곳입니다.`,
      `홍보 예산은 총 예산의 ${promotionShare.toFixed(1)}%입니다.`,
    ],
    recommendations,
    governmentReviewNote:
      "본 리포트는 지자체가 축제 예산 집행 전 기획안을 객관적으로 검토하기 위한 사전 진단 자료입니다.",
  };
}
