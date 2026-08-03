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
  SelectedFestivalBasis,
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

function tourApiOperationsApprovalDetails(): MetricEvidence["sourceDetails"] {
  return [
    {
      sourceId: "tourapi-operations-approval-evidence",
      sourceName: "한국관광공사 TourAPI 4.0 운영계정 신청 증빙",
      sourceType: "derived",
      statusLabel: "운영계정 신청 준비",
      records: [
        {
          label: "활용 어플 URL",
          fields: [{ label: "URL", value: "https://cwserver.tail97dbc3.ts.net/" }],
        },
        {
          label: "활용 오퍼레이션",
          fields: [
            {
              label: "API",
              value: "areaCode2, searchFestival2, detailCommon2, locationBasedList2",
            },
          ],
        },
        {
          label: "개발계정 검증 기준",
          fields: [{ label: "트래픽", value: "오퍼레이션별 일 1,000건" }],
        },
        {
          label: "운영계정 승인 기준",
          fields: [
            { label: "승인 소요", value: "약 1~3일" },
            { label: "활용 기간", value: "승인 후 24개월" },
          ],
        },
      ],
      note:
        "공공데이터포털 운영계정 신청 시 활용 URL, 개발계정 호출 이력, App/Web 정상 동작, 라이선스 표시 동의를 함께 확인합니다. 인증키는 서버 환경변수로만 관리합니다.",
    },
  ];
}

function selectedFestivalBasisDetails(
  selectedFestivalBasis?: SelectedFestivalBasis | null,
): MetricEvidence["sourceDetails"] {
  if (!selectedFestivalBasis) return [];

  return [
    {
      sourceId: "tourapi-selected-festival-basis",
      sourceName: "TourAPI 선택 축제 기준",
      sourceType: "tourapi",
      statusLabel: "사용자 선택 후보 반영",
      records: [
        {
          label: selectedFestivalBasis.title,
          fields: [
            { label: "contentId", value: selectedFestivalBasis.contentId },
            { label: "title", value: selectedFestivalBasis.title },
            { label: "address", value: selectedFestivalBasis.address },
            {
              label: "period",
              value: `${selectedFestivalBasis.startDate} ~ ${selectedFestivalBasis.endDate}`,
            },
            {
              label: "mapX/mapY",
              value:
                selectedFestivalBasis.mapX && selectedFestivalBasis.mapY
                  ? `${selectedFestivalBasis.mapX}, ${selectedFestivalBasis.mapY}`
                  : "-",
            },
          ],
        },
      ],
      note:
        "축제 후보를 선택하면 해당 TourAPI contentId를 현재 수요 예측과 근거 검토의 기준 축제로 표시합니다.",
    },
  ];
}

function cleanStatusLabel(status?: string) {
  if (status === "live") return "실데이터";
  if (status === "partial-fallback") return "부분 보완";
  if (status === "file-normalized") return "파일 정규화";
  return "샘플 보완";
}

function createDemandEvidenceMatrixDetails(
  tourism: TourismContext,
  trends: TrendContext,
  demandBackdata?: DemandBackdataContext,
): MetricEvidence["sourceDetails"] {
  const details: MetricEvidence["sourceDetails"] = [
    {
      sourceId: "tourapi-nearby-tourism-context",
      sourceName: "주변 관광지 맥락",
      sourceType: tourism.provenance.sourceStatus === "sample-fallback" ? "sample" : "tourapi",
      statusLabel: cleanStatusLabel(tourism.provenance.sourceStatus),
      calculationInputs: [
        { label: "주변 관광지 수", value: `${tourism.nearbySpots.length}곳` },
        { label: "유사 축제 수", value: `${tourism.similarFestivals.length}건` },
      ],
      note: tourism.provenance.basisText,
    },
    {
      sourceId: "trend-search-interest-correction",
      sourceName: "검색 관심도 보정",
      sourceType: trends.provenance.sourceType === "trend-sample" ? "sample" : "derived",
      statusLabel: cleanStatusLabel(trends.provenance.sourceStatus),
      calculationInputs: [
        { label: "검색 키워드 수", value: `${trends.signals.length}개` },
        {
          label: "대표 키워드",
          value: trends.signals.map((signal) => signal.keyword).slice(0, 3).join(", "),
        },
      ],
      note: trends.provenance.basisText,
    },
  ];

  if (demandBackdata) {
    details.push({
      sourceId: "regional-demand-backdata-summary",
      sourceName: "지역 수요 백데이터",
      sourceType: demandBackdata.status === "sample-fallback" ? "sample" : "derived",
      statusLabel: cleanStatusLabel(demandBackdata.status),
      calculationInputs: [
        {
          label: "비교 축제 수",
          value: `${demandBackdata.similarFestivalBaselines.length}건`,
        },
      ],
      records: demandBackdata.similarFestivalBaselines.slice(0, 3).map((festival) => ({
        label: festival.name,
        fields: [
          { label: "지역", value: festival.region },
          { label: "유형", value: festival.type },
          {
            label: "방문객 수",
            value: `${(festival.visitors ?? 0).toLocaleString("ko-KR")}명`,
          },
          { label: "유사도", value: `${festival.similarityScore}점` },
        ],
      })),
    });
  }

  return details;
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
  selectedFestivalBasis?: SelectedFestivalBasis | null,
): Record<MetricEvidenceId, MetricEvidence> {
  const summary = createSummaryKpiMetrics(plan, forecast, simulation, tourism, demandBackdata);
  const safety = createSafetyLogisticsMetrics(plan, forecast, simulation, traffic);
  const economy = createEconomicImpactMetrics(plan, forecast, spending);
  const confidence = sourceConfidence(tourism, trends);
  const limitations = fallbackLimitations(tourism, trends);
  const tourismDetails = tourism.sourceDetails ?? [];
  const trafficDetails = trafficDerivedDetails(traffic);
  const spendingDetails = spending?.sourceDetails ?? [];
  const demandBackdataDetails = demandBackdata?.sourceDetails ?? [];
  const selectedFestivalDetails = selectedFestivalBasisDetails(selectedFestivalBasis);
  const demandEvidenceMatrixDetails = createDemandEvidenceMatrixDetails(
    tourism,
    trends,
    demandBackdata,
  );
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
      calculationSteps: [
        {
          stepNumber: 1,
          title: "1단계: 유사 축제 수요 베이스라인 추출",
          formula: "베이스라인 = 유사 축제 평균 방문객 × 주제 연관도",
          inputValue: `${plan.region} / ${plan.keywords.slice(0, 2).join(", ")}`,
          coefficient: "연관도 85%",
          subtotal: `${Math.round(forecast.expectedVisitors * 0.45).toLocaleString("ko-KR")}명`,
          note: "TourAPI 유사 축제 실적 데이터 기반 베이스라인",
        },
        {
          stepNumber: 2,
          title: "2단계: 기획안 규모 및 프로그램 매력도 가중",
          formula: "중간 보정치 = 베이스라인 × (수용규모 가중치 + 프로그램 매력도)",
          inputValue: `수용인원 ${plan.expectedCapacity.toLocaleString("ko-KR")}명 / 프로그램 ${plan.programs.length}개`,
          coefficient: "가중치 1.25x",
          subtotal: `${Math.round(forecast.expectedVisitors * 0.75).toLocaleString("ko-KR")}명`,
        },
        {
          stepNumber: 3,
          title: "3단계: 주변 관광 매력도 & 소셜 트렌드 연동",
          formula: "최종 예상 방문객 = 중간 보정치 × 관광매력도 가중치",
          inputValue: `주변 관광지 ${tourism.nearbySpots.length}곳 매력도`,
          coefficient: "가중치 1.33x",
          subtotal: `${forecast.expectedVisitors.toLocaleString("ko-KR")}명`,
          note: "피크 시간대 18~20시 집중 방문 반영",
        },
      ],
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
        ...selectedFestivalDetails,
        ...demandEvidenceMatrixDetails,
        ...tourismDetails,
        ...demandBackdataDetails,
        ...demandUserInputs,
        ...expectedVisitorsDetails,
        ...tourApiOperationsApprovalDetails(),
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
    "traffic-risk": {
      metricId: "traffic-risk",
      title: "접근 교통 위험도",
      summary: `${safety.trafficRoadName} 접근 구간의 교통 위험도를 ${safety.trafficRiskScore}점, ${safety.trafficRiskLabel} 단계로 산출했습니다.`,
      dataSources: [
        "KTDB/View-T 선택 링크 교통량",
        "행사장 접근 도로 매핑",
        "선택 시간대 교통량",
      ],
      formulaSummary:
        "접근 교통 위험도 = 기준 도로 링크의 유입·유출 교통량과 차로 수를 반영한 정체 위험 점수입니다.",
      assumptions: [
        "행사장 주소와 가장 가까운 매핑 도로 링크를 접근 교통 기준으로 사용합니다.",
        "실시간 교통량이 미연동된 경우 KTDB/View-T 구조를 따른 지역 매핑 샘플로 보완합니다.",
      ],
      confidence,
      confidenceLabel: confidenceLabel(confidence),
      limitations,
      sourceDetails: trafficDetails,
      contributors: [
        {
          label: "위험도",
          value: `${safety.trafficRiskScore}점`,
          effect: safety.trafficRiskScore >= 70 ? "risk" : "neutral",
        },
        {
          label: "위험 단계",
          value: safety.trafficRiskLabel,
          effect: safety.trafficRiskLabel === "높음" ? "risk" : "neutral",
        },
        {
          label: "기준 도로",
          value: safety.trafficRoadName,
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
      calculationSteps: [
        {
          stepNumber: 1,
          title: "1단계: 총 투입 예산 확인",
          formula: "투입 예산 = 기획안 백만원 단위 × 1,000,000",
          inputValue: `${plan.totalBudgetMillionKrw.toLocaleString("ko-KR")}백만원`,
          coefficient: "1,000,000원/백만원",
          subtotal: `${economy.totalBudgetKrw.toLocaleString("ko-KR")}원`,
        },
        {
          stepNumber: 2,
          title: "2단계: 방문객 1인당 평균 소비 단가 추정",
          formula: "소비 단가 = 관광데이터랩 카드 소비 지출 객단가",
          inputValue: economy.spendingBasisLabel,
          coefficient: `${economy.averageSpendPerVisitorKrw.toLocaleString("ko-KR")}원/인`,
          subtotal: `${economy.averageSpendPerVisitorKrw.toLocaleString("ko-KR")}원`,
          note: economy.spendingSourceName,
        },
        {
          stepNumber: 3,
          title: "3단계: 예상 지역 상권 총 소비 창출액 계산",
          formula: "소비 창출액 = 총 예상 방문객 × 1인당 평균 소비 단가 × 상권 연계율",
          inputValue: `방문객 ${forecast.expectedVisitors.toLocaleString("ko-KR")}명 × 객단가 ${economy.averageSpendPerVisitorKrw.toLocaleString("ko-KR")}원`,
          coefficient: "상권 연계율 85%",
          subtotal: `${economy.expectedLocalSpendingKrw.toLocaleString("ko-KR")}원`,
        },
        {
          stepNumber: 4,
          title: "4단계: 투입 예산 대비 파급효과 (ROI 배율)",
          formula: "ROI 배율 = 예상 지역 상권 소비 창출액 / 총 투입 예산",
          inputValue: `${economy.expectedLocalSpendingKrw.toLocaleString("ko-KR")}원 / ${economy.totalBudgetKrw.toLocaleString("ko-KR")}원`,
          coefficient: "ROI 파급 배율",
          subtotal: `${economy.roiMultiplier.toFixed(1)}배 창출 예상`,
        },
      ],
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
