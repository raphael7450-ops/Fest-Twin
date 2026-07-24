/**
 * 파일 : src/services/metricEvidence.ts
 * 내용 : KPI 수치별 공공데이터 출처, 산출 공식, 가정을 포함하는 산출 근거 세트 생성기
 * 수정 : 2026-07-24. 출처 데이터 세부 세그먼트 매칭 및 오염 키 자동 비식별 정화 처리
 */

import type {
  DemandBackdataContext,
  EvidenceField,
  FestivalPlan,
  ForecastResult,
  MetricEvidence,
  MetricEvidenceId,
  SimulationResult,
  SpendingContext,
  TrafficContext,
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

function userInputDetails(
  sourceId: string,
  calculationInputs: EvidenceField[],
): MetricEvidence["sourceDetails"] {
  return [
    {
      sourceId,
      sourceName: "축제 기획안 입력값",
      sourceType: "user-input",
      statusLabel: "사용자 입력 기준",
      calculationInputs,
    },
  ];
}

function derivedDetails(
  sourceId: string,
  sourceName: string,
  calculationInputs: EvidenceField[],
  note?: string,
): MetricEvidence["sourceDetails"] {
  return [
    {
      sourceId,
      sourceName,
      sourceType: "derived",
      statusLabel: "시스템 산출값",
      calculationInputs,
      note,
    },
  ];
}

function economicDerivedDetails(
  economy: ReturnType<typeof createEconomicImpactMetrics>,
): MetricEvidence["sourceDetails"] {
  return derivedDetails(
    "derived-economic-roi",
    "ROI 경제효과 산출값",
    [
      {
        label: "총 투입 예산",
        value: `${economy.totalBudgetKrw.toLocaleString("ko-KR")}원`,
      },
      {
        label: "예상 지역 소비 창출액",
        value: `${economy.expectedLocalSpendingKrw.toLocaleString("ko-KR")}원`,
      },
      {
        label: "방문객 1인당 평균 소비",
        value: `${economy.averageSpendPerVisitorKrw.toLocaleString("ko-KR")}원`,
      },
      {
        label: "ROI",
        value: `${economy.roiMultiplier.toFixed(1)}배`,
      },
    ],
    "방문객 1인당 평균 소비는 데모용 공공 데이터 기반 가정값이며, 실제 지역 소비 데이터와 연동하면 교체할 수 있습니다.",
  );
}

function trafficDerivedDetails(
  traffic?: TrafficContext,
): MetricEvidence["sourceDetails"] {
  if (!traffic) return [];

  return [
    ...traffic.sourceDetails,
    {
      sourceId: "derived-traffic-risk",
      sourceName: "행사장 교통 위험도 산출값",
      sourceType: "derived",
      statusLabel: "시스템 산출값",
      calculationInputs: [
        { label: "위험도", value: `${traffic.riskScore}점` },
        { label: "위험 단계", value: traffic.riskLabel },
        { label: "기준 도로", value: traffic.links[0]?.roadName ?? "-" },
        { label: "기준 연도", value: `${traffic.year}년` },
        { label: "시간 조건", value: traffic.time },
      ],
      note: "KTDB/View-T 기준연도 교통량을 이용한 행사장 리스크이며 실시간 교통정보가 아닙니다.",
    },
  ];
}

export function createMetricEvidenceSet(
  plan: FestivalPlan,
  forecast: ForecastResult,
  simulation: SimulationResult,
  tourism: TourismContext,
  trends: TrendContext,
  traffic?: TrafficContext,
  spending?: SpendingContext,
  demandBackdata?: DemandBackdataContext,
): Record<MetricEvidenceId, MetricEvidence> {
  const summary = createSummaryKpiMetrics(plan, forecast, simulation, tourism);
  const safety = createSafetyLogisticsMetrics(plan, forecast, simulation, traffic);
  const economy = createEconomicImpactMetrics(plan, forecast, spending);
  const confidence = sourceConfidence(tourism, trends);
  const limitations = fallbackLimitations(tourism, trends);
  const tourismDetails = tourism.sourceDetails ?? [];
  const trafficDetails = trafficDerivedDetails(traffic);
  const spendingDetails = spending?.sourceDetails ?? [];
  const demandBackdataDetails = demandBackdata?.sourceDetails ?? [];
  const nearbyTourismDetails = tourismDetails.filter(
    (detail) => detail.sourceId.includes("nearby") || detail.sourceId === "sample-nearby-spots",
  );
  const peakVisitors = Math.max(
    ...forecast.visitorsByHour.map((item) => item.visitors),
    0,
  );
  const criticalCells = simulation.cells.filter((cell) => cell.level === "critical").length;
  const highRiskCells = simulation.cells.filter(
    (cell) => cell.level === "high" || cell.level === "critical",
  ).length;
  const demandUserInputs = userInputDetails("user-demand-inputs", [
    { label: "지역", value: plan.region },
    { label: "기간", value: `${plan.startDate} ~ ${plan.endDate}` },
    { label: "주제 키워드", value: plan.keywords.join(", ") },
    {
      label: "총 예산",
      value: `${plan.totalBudgetMillionKrw.toLocaleString("ko-KR")}백만원`,
    },
    {
      label: "수용 인원",
      value: `${plan.expectedCapacity.toLocaleString("ko-KR")}명`,
    },
    {
      label: "프로그램 매력도",
      value: plan.programs.map((program) => `${program.expectedDraw}점`).join(", "),
    },
    {
      label: "출입구 수",
      value: `${plan.facilities.filter((facility) => facility.type === "entrance").length}곳`,
    },
  ]);
  const layoutUserInputs = userInputDetails("user-layout-inputs", [
    { label: "격자 크기", value: `${plan.gridWidth} × ${plan.gridHeight}` },
    { label: "시설 수", value: `${plan.facilities.length}곳` },
  ]);
  const budgetUserInputs = userInputDetails("user-budget-inputs", [
    {
      label: "총 예산",
      value: `${plan.totalBudgetMillionKrw.toLocaleString("ko-KR")}백만원`,
    },
  ]);
  const commercialUserInputs = userInputDetails("user-commercial-location", [
    { label: "지역", value: plan.region },
    { label: "행사장", value: plan.venueAddress },
  ]);
  const parkingUserInputs = userInputDetails("user-parking-inputs", [
    {
      label: "수용 인원",
      value: `${plan.expectedCapacity.toLocaleString("ko-KR")}명`,
    },
    { label: "격자 크기", value: `${plan.gridWidth} × ${plan.gridHeight}` },
    { label: "시설 수", value: `${plan.facilities.length}곳` },
  ]);
  const expectedVisitorsDetails = derivedDetails(
    "derived-expected-visitors",
    "예상 방문객 산출값",
    [
      {
        label: "예상 방문객",
        value: `${forecast.expectedVisitors.toLocaleString("ko-KR")}명`,
      },
    ],
  );
  const peakDensityDetails = derivedDetails(
    "derived-peak-density",
    "혼잡도 시뮬레이션 산출값",
    [
      { label: "혼잡도 기준 시간", value: `${simulation.hour}:00` },
      {
        label: "최고 밀집도",
        value: `${summary.peakDensity.peoplePerSquareMeter}명/m²`,
      },
    ],
  );
  const safetyStaffDetails = derivedDetails(
    "derived-safety-staff",
    "안전 인력 산출값",
    [
      { label: "피크 방문객", value: `${peakVisitors.toLocaleString("ko-KR")}명` },
      { label: "최고 밀집도", value: `${safety.peakDensity}명/m²` },
      { label: "병목 후보", value: `${simulation.bottlenecks.length}곳` },
    ],
  );
  const medicalStaffDetails = derivedDetails(
    "derived-medical-staff",
    "의료 인력 산출값",
    [
      { label: "피크 방문객", value: `${peakVisitors.toLocaleString("ko-KR")}명` },
      { label: "임계 혼잡 격자", value: `${criticalCells}곳` },
    ],
  );
  const parkingDetails = derivedDetails(
    "derived-parking-occupancy",
    "주차 수용률 산출값",
    [
      { label: "피크 방문객", value: `${peakVisitors.toLocaleString("ko-KR")}명` },
      { label: "고위험 격자", value: `${highRiskCells}곳` },
      { label: "주차 수용률", value: `${safety.parkingOccupancyRate}%` },
    ],
  );
  const roiDetails = economicDerivedDetails(economy);

  return {
    "demand-index": {
      metricId: "demand-index",
      title: "흥행 예측 지수",
      summary: `예상 방문객 ${forecast.expectedVisitors.toLocaleString("ko-KR")}명을 수용 인원 ${plan.expectedCapacity.toLocaleString("ko-KR")}명과 비교한 지표입니다.`,
      dataSources: [
        "TourAPI 주변 관광지 매력도",
        "TourAPI 유사 축제 후보",
        ...(demandBackdata ? ["문화체육관광부_지역축제 정보"] : []),
        "소셜 트렌드 관심도",
        "사용자 입력 수용 인원",
      ],
      formulaSummary:
        "예상 방문객 = 유사 축제 수요, 수용 인원, 주변 관광 매력도, 트렌드 관심도, 프로그램 매력도, 예산 규모를 가중 반영한 값입니다.",
      assumptions: [
        "유사 축제 방문 수요는 주제 유사도에 따라 보정합니다.",
        "18~20시 프로그램은 피크 시간대 가중치를 적용합니다.",
        ...(demandBackdata
          ? ["지역축제 정보의 방문객 수는 유사 축제 기준선이며, 현재 기획안의 확정 방문객 수가 아닙니다."]
          : []),
      ],
      confidence,
      confidenceLabel: confidenceLabel(confidence),
      limitations,
      sourceDetails: [
        ...tourismDetails,
        ...demandBackdataDetails,
        ...demandUserInputs,
        ...expectedVisitorsDetails,
      ],
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
      sourceDetails: [...layoutUserInputs, ...peakDensityDetails],
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
      sourceDetails: [...budgetUserInputs, ...expectedVisitorsDetails],
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
      sourceDetails: [...nearbyTourismDetails, ...commercialUserInputs],
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
      sourceDetails: [...layoutUserInputs, ...safetyStaffDetails],
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
      sourceDetails: [...layoutUserInputs, ...medicalStaffDetails],
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
      sourceDetails: [...parkingUserInputs, ...parkingDetails, ...trafficDetails],
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
        economy.spendingSourceName,
      ],
      formulaSummary:
        "예상 지역 소비 창출액 = 예상 방문객 × 1인당 평균 소비 단가, ROI = 예상 소비 창출액 / 총 예산",
      assumptions: [
        `방문객 1인당 평균 소비 단가는 ${economy.averageSpendPerVisitorKrw.toLocaleString("ko-KR")}원이며, ${economy.spendingBasisLabel}으로 적용합니다.`,
      ],
      confidence,
      confidenceLabel: confidenceLabel(confidence),
      limitations,
      sourceDetails: [...budgetUserInputs, ...expectedVisitorsDetails, ...spendingDetails, ...roiDetails],
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
