import type {
  FestivalPlan,
  ForecastResult,
  MetricEvidence,
  MetricEvidenceId,
  SimulationResult,
  TourismContext,
  TrendContext,
} from "../domain/types";
import {
  createEconomicImpactMetrics,
  createSafetyLogisticsMetrics,
  createSummaryKpiMetrics,
} from "./impactMetrics";

function confidenceLabel(confidence: MetricEvidence["confidence"]) {
  if (confidence === "high") return "높음";
  if (confidence === "medium") return "보통";
  return "낮음";
}

function sourceConfidence(
  tourism: TourismContext,
  trends: TrendContext,
): MetricEvidence["confidence"] {
  if (
    tourism.provenance.sourceStatus === "live" &&
    trends.provenance.sourceStatus === "live"
  ) {
    return "high";
  }

  if (
    tourism.provenance.sourceStatus === "live" ||
    tourism.provenance.sourceStatus === "partial-fallback"
  ) {
    return "medium";
  }

  return "low";
}

function fallbackLimitations(tourism: TourismContext, trends: TrendContext) {
  const limitations = [
    "본 수치는 실제 방문객 집계가 아닌 사전 의사결정용 예측값입니다.",
    "현장 동선, 기상, 교통 통제, 민간 소비 데이터가 추가되면 결과가 달라질 수 있습니다.",
  ];

  if (tourism.provenance.sourceStatus !== "live") {
    limitations.push(
      "TourAPI 조회가 불완전한 경우 샘플 또는 보완 데이터를 함께 사용합니다.",
    );
  }

  if (trends.provenance.sourceType === "trend-sample") {
    limitations.push(
      "소셜 트렌드는 현재 샘플 신호를 사용하므로 실시간 여론 지표로 해석하면 안 됩니다.",
    );
  }

  return limitations;
}

function effectFromScore(score: number): MetricEvidence["contributors"][number]["effect"] {
  if (score >= 70) return "positive";
  if (score >= 40) return "neutral";
  return "risk";
}

export function createMetricEvidenceSet(
  plan: FestivalPlan,
  forecast: ForecastResult,
  simulation: SimulationResult,
  tourism: TourismContext,
  trends: TrendContext,
): Record<MetricEvidenceId, MetricEvidence> {
  const summary = createSummaryKpiMetrics(plan, forecast, simulation, tourism);
  const safety = createSafetyLogisticsMetrics(plan, forecast, simulation);
  const economy = createEconomicImpactMetrics(plan, forecast);
  const confidence = sourceConfidence(tourism, trends);
  const limitations = fallbackLimitations(tourism, trends);
  const peakVisitors = Math.max(
    ...forecast.visitorsByHour.map((item) => item.visitors),
    0,
  );

  return {
    "demand-index": {
      metricId: "demand-index",
      title: "흥행 예측 지수",
      summary: `예상 방문객 ${forecast.expectedVisitors.toLocaleString("ko-KR")}명을 수용 인원 ${plan.expectedCapacity.toLocaleString("ko-KR")}명과 비교한 지표입니다.`,
      dataSources: [
        "TourAPI 주변 관광지 매력도",
        "TourAPI 유사 축제 후보",
        "소셜 트렌드 관심도",
        "사용자 입력 수용 인원",
      ],
      formulaSummary:
        "예상 방문객 = 유사 축제 수요, 수용 인원, 주변 관광 매력도, 트렌드 관심도, 프로그램 매력도, 예산 규모를 가중 반영한 값입니다.",
      assumptions: [
        "유사 축제 방문 수요는 주제 유사도에 따라 보정합니다.",
        "18~20시 프로그램은 피크 시간대 가중치를 적용합니다.",
      ],
      confidence,
      confidenceLabel: confidenceLabel(confidence),
      limitations,
      contributors: forecast.reasons.map((reason) => ({
        label: reason.label,
        value: `${reason.impact.toLocaleString("ko-KR")}점`,
        effect: effectFromScore(reason.impact),
      })),
    },
    "peak-density": {
      metricId: "peak-density",
      title: "최고 밀집 위험도",
      summary: `시뮬레이션 격자의 최고 혼잡도를 ${summary.peakDensity.peoplePerSquareMeter}명/m²로 환산했습니다.`,
      dataSources: [
        "시간대별 예상 방문객",
        "행사장 격자",
        "무대, 출입구, 부스, 주차장 시설 배치",
      ],
      formulaSummary:
        "격자 밀집도 = 시간대 방문객 비율과 시설 매력도를 결합하고, 최고 격자값을 명/m² 단위로 환산합니다.",
      assumptions: [
        "시설 가까이에 인파가 더 집중된다고 가정합니다.",
        "무대 프로그램 시간에는 무대 주변 가중치를 높입니다.",
      ],
      confidence,
      confidenceLabel: confidenceLabel(confidence),
      limitations,
      contributors: [
        { label: "피크 시간", value: `${simulation.hour}:00`, effect: "neutral" },
        {
          label: "피크 방문객",
          value: `${peakVisitors.toLocaleString("ko-KR")}명`,
          effect: "risk",
        },
        {
          label: "병목 후보",
          value: `${simulation.bottlenecks.length}곳`,
          effect: simulation.bottlenecks.length > 0 ? "risk" : "positive",
        },
      ],
    },
    "budget-efficiency": {
      metricId: "budget-efficiency",
      title: "예산 효율성 점수",
      summary: `총 예산을 예상 방문객으로 나누어 1인당 ${summary.budgetEfficiency.costPerVisitorKrw.toLocaleString("ko-KR")}원 수준으로 산출했습니다.`,
      dataSources: ["사용자 입력 총 예산", "예상 방문객"],
      formulaSummary: "방문객 1인당 예산 = 총 투입 예산 / 예상 방문객",
      assumptions: ["총 예산은 백만원 단위 입력값을 원 단위로 환산합니다."],
      confidence,
      confidenceLabel: confidenceLabel(confidence),
      limitations,
      contributors: [
        {
          label: "총 예산",
          value: `${plan.totalBudgetMillionKrw.toLocaleString("ko-KR")}백만원`,
          effect: "neutral",
        },
        {
          label: "예상 방문객",
          value: `${forecast.expectedVisitors.toLocaleString("ko-KR")}명`,
          effect: "positive",
        },
      ],
    },
    "commercial-spillover": {
      metricId: "commercial-spillover",
      title: "지역 상권 유출 연계도",
      summary: `주변 관광지 매력도와 개수를 바탕으로 ${summary.spillover.nearbyInflowRate}%의 연계 가능성을 추정했습니다.`,
      dataSources: ["TourAPI 주변 관광지", "관광지 매력도 점수"],
      formulaSummary:
        "연계도 = 주변 관광지 평균 매력도와 관광지 수 보너스를 결합한 사전 추정값입니다.",
      assumptions: [
        "행사장 주변 관광지가 많고 매력도가 높을수록 상권 연계 가능성이 높아진다고 봅니다.",
      ],
      confidence,
      confidenceLabel: confidenceLabel(confidence),
      limitations,
      contributors: [
        {
          label: "주변 관광지",
          value: `${tourism.nearbySpots.length}곳`,
          effect: tourism.nearbySpots.length >= 3 ? "positive" : "neutral",
        },
        {
          label: "데이터 상태",
          value:
            tourism.provenance.sourceStatus === "live" ? "실조회" : "보완",
          effect:
            tourism.provenance.sourceStatus === "live" ? "positive" : "risk",
        },
      ],
    },
    "safety-staff": {
      metricId: "safety-staff",
      title: "안전관리 요원 추천 배치",
      summary: `피크 방문객과 병목 후보를 기준으로 ${safety.safetyStaff}명을 추천합니다.`,
      dataSources: [
        "피크 시간대 예상 방문객",
        "혼잡도 시뮬레이션",
        "병목 후보 수",
      ],
      formulaSummary:
        "추천 인원 = 피크 방문객 규모, 최고 밀집도, 병목 후보 수를 함께 반영한 배치 검토값입니다.",
      assumptions: ["병목 후보가 늘어나면 현장 통제 인력 필요량을 높입니다."],
      confidence,
      confidenceLabel: confidenceLabel(confidence),
      limitations,
      contributors: [
        {
          label: "피크 방문객",
          value: `${safety.peakVisitors.toLocaleString("ko-KR")}명`,
          effect: "risk",
        },
        {
          label: "병목 후보",
          value: `${simulation.bottlenecks.length}곳`,
          effect: simulation.bottlenecks.length > 0 ? "risk" : "positive",
        },
      ],
    },
    "medical-staff": {
      metricId: "medical-staff",
      title: "의료/구급 인력 추천 배치",
      summary: `피크 방문객과 고위험 격자를 기준으로 ${safety.medicalStaff}명을 추천합니다.`,
      dataSources: ["피크 시간대 예상 방문객", "고위험 및 임계 혼잡 격자"],
      formulaSummary:
        "추천 인원 = 피크 방문객 규모와 임계 혼잡 격자 수를 반영한 구급 대응 검토값입니다.",
      assumptions: ["임계 혼잡 격자가 많을수록 응급 대응 여력을 높입니다."],
      confidence,
      confidenceLabel: confidenceLabel(confidence),
      limitations,
      contributors: [
        {
          label: "최고 밀집도",
          value: `${safety.peakDensity}명/m²`,
          effect: safety.peakDensity >= 3 ? "risk" : "neutral",
        },
        {
          label: "추천 인원",
          value: `${safety.medicalStaff}명`,
          effect: "neutral",
        },
      ],
    },
    "parking-occupancy": {
      metricId: "parking-occupancy",
      title: "주차 수용 차오름 비율",
      summary: `피크 방문객의 차량 유입을 가정해 주차 수용률 ${safety.parkingOccupancyRate}%를 산출했습니다.`,
      dataSources: [
        "피크 시간대 예상 방문객",
        "행사장 수용 인원",
        "고위험 격자 수",
      ],
      formulaSummary:
        "주차 차오름 = 피크 방문객의 차량 유입 추정치 / 행사장 가정 주차 수용량",
      assumptions: ["피크 방문객의 18%가 차량으로 유입된다고 가정합니다."],
      confidence,
      confidenceLabel: confidenceLabel(confidence),
      limitations,
      contributors: [
        {
          label: "주차 차오름",
          value: `${safety.parkingOccupancyRate}%`,
          effect: safety.parkingOccupancyRate >= 85 ? "risk" : "neutral",
        },
        {
          label: "피크 방문객",
          value: `${safety.peakVisitors.toLocaleString("ko-KR")}명`,
          effect: "risk",
        },
      ],
    },
    "economic-roi": {
      metricId: "economic-roi",
      title: "예산 대비 경제적 파급효과",
      summary: `예상 방문객 소비액을 총 예산과 비교해 ${economy.roiMultiplier.toFixed(1)}배 창출 가능성으로 표시합니다.`,
      dataSources: [
        "예상 방문객",
        "사용자 입력 총 예산",
        "방문객 1인당 평균 소비 단가 가정",
      ],
      formulaSummary:
        "예상 지역 소비 창출액 = 예상 방문객 × 1인당 평균 소비 단가, ROI = 예상 소비 창출액 / 총 예산",
      assumptions: [
        `방문객 1인당 평균 소비 단가는 ${economy.averageSpendPerVisitorKrw.toLocaleString("ko-KR")}원으로 둡니다.`,
      ],
      confidence,
      confidenceLabel: confidenceLabel(confidence),
      limitations,
      contributors: [
        {
          label: "예상 소비 창출액",
          value: `${economy.expectedLocalSpendingKrw.toLocaleString("ko-KR")}원`,
          effect: "positive",
        },
        {
          label: "총 예산",
          value: `${economy.totalBudgetKrw.toLocaleString("ko-KR")}원`,
          effect: "neutral",
        },
      ],
    },
  };
}

export function createReportEvidenceSummaries(
  evidenceSet: Record<MetricEvidenceId, MetricEvidence>,
) {
  return [
    evidenceSet["demand-index"],
    evidenceSet["peak-density"],
    evidenceSet["safety-staff"],
    evidenceSet["economic-roi"],
  ].map((item) => ({
    title: item.title,
    summary: item.summary,
    confidenceLabel: item.confidenceLabel,
  }));
}
