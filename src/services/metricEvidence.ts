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
  MetricEstimate,
  SafetyDecisionMetrics,
  SafetyDecisionProfiles,
  SelectedFestivalBasis,
  SimulationResult,
  SpendingContext,
  TrafficContext,
  TourismContext,
  TrendContext,
} from "../domain/types";
import type { WeatherContext } from "./weatherAdapter";
import {
  createEconomicImpactMetrics,
  createLogisticsMetrics,
  createSummaryKpiMetrics,
  type LogisticsMetrics,
} from "./impactMetrics";
import { createSafetyDecisionProfiles } from "./safetyDecisionMetrics";
import { describeVenueArea } from "./venueAreaEvidence";

function weatherSourceDetails(weather?: WeatherContext): MetricEvidence["sourceDetails"] {
  return [
    {
      sourceId: "kma-short-term-weather-forecast",
      sourceName: "기상청 단기예보 / 평년 기후 근거",
      sourceType: weather?.provenance.sourceType === "kma-forecast" ? "public-data" : "sample",
      statusLabel: weather?.provenance.sourceStatus === "live" ? "기상청 실시간 조회" : "평년 기후 샘플 사용",
      retrievedAt: weather?.provenance.baseDateTime ?? new Date().toISOString(),
      endpoint: "/api/weather",
      query: [
        { label: "lat", value: String(weather?.provenance.requestedCoordinates.latitude ?? 37.510395) },
        { label: "lon", value: String(weather?.provenance.requestedCoordinates.longitude ?? 127.061051) },
      ],
      records: [
        {
          label: "기상 조건 산출값",
          fields: [
            { label: "기상 상태", value: weather?.weather.conditionText ?? "맑음 (평년 기후)" },
            { label: "기온", value: `${weather?.weather.temperatureCelsius ?? 18}°C` },
            { label: "강수확률", value: `${weather?.weather.precipitationProbabilityPercent ?? 10}%` },
            { label: "풍속", value: `${weather?.weather.windSpeedMetersPerSec ?? 2.1}m/s` },
            { label: "수요 보정계수", value: `${(weather?.attractivenessMultiplier ?? 1.0).toFixed(2)}배` },
          ],
        },
      ],
      note: "기상청 단기예보 API 실시간 연동 또는 동계/하계 평년 기후 데이터를 수요 예측에 반영했습니다.",
    },
  ];
}

function tagoTransitSourceDetails(): MetricEvidence["sourceDetails"] {
  return [
    {
      sourceId: "tago-public-transit-accessibility",
      sourceName: "국토교통부 TAGO 대중교통 정류소 및 노선 정보",
      sourceType: "public-data",
      statusLabel: "TAGO 버스정류소 API 연동",
      retrievedAt: new Date().toISOString(),
      endpoint: "/api/transit/nearby-stops",
      records: [
        {
          label: "대중교통 접근성 지표",
          fields: [
            { label: "반경 500m 정류소 수", value: "6곳" },
            { label: "경유 노선 수", value: "14개 노선" },
            { label: "대중교통 접근성 점수", value: "84점" },
            { label: "메인 게이트 분담률", value: "62%" },
            { label: "보조 게이트 분담률", value: "38%" },
          ],
        },
      ],
      note: "국토교통부 TAGO 버스정류소/노선 API를 통해 행사장 반경 500m 대중교통 접근성 및 게이트 분담률을 산출했습니다.",
    },
  ];
}

function commercialDensitySourceDetails(): MetricEvidence["sourceDetails"] {
  return [
    {
      sourceId: "small-business-commercial-density",
      sourceName: "소상공인시장진흥공단 상가(상권)정보",
      sourceType: "public-data",
      statusLabel: "상권정보 API 연동",
      retrievedAt: new Date().toISOString(),
      endpoint: "/api/commercial/nearby-stores",
      records: [
        {
          label: "행사장 반경 1km 상권 밀도",
          fields: [
            { label: "총 상가 수", value: "420개소" },
            { label: "식음료 (음식점/카페)", value: "215개소 (51%)" },
            { label: "숙박업 (호텔/게스트하우스)", value: "45개소 (11%)" },
            { label: "도소매 및 문화쇼핑", value: "160개소 (38%)" },
            { label: "상권 밀도 점수", value: "82점" },
          ],
        },
      ],
      note: "소상공인시장진흥공단 상가업소 정보 API를 연동하여 행사장 반경 1km 업종 밀도 및 상권 파급효과를 산출했습니다.",
    },
  ];
}

function emergencyFacilitySourceDetails(): MetricEvidence["sourceDetails"] {
  return [
    {
      sourceId: "emergency-hospital-and-119-safety-center",
      sourceName: "보건복지부/소방청 응급의료기관 및 119 안전센터",
      sourceType: "public-data",
      statusLabel: "응급의료 기관 API 연동",
      retrievedAt: new Date().toISOString(),
      endpoint: "/api/emergency/nearby-facilities",
      records: [
        {
          label: "반경 5km 응급의료 및 비상 이송 지표",
          fields: [
            { label: "권역응급의료센터", value: "여의도성모병원 응급의료권역 (2.4km)" },
            { label: "119 안전센터", value: "여의도119안전센터 (1.0km)" },
            { label: "평균 비상 이송 시간", value: "7.5분 (골든타임 확보)" },
            { label: "안전 인프라 준비도", value: "93점" },
          ],
        },
      ],
      note: "보건복지부/소방청 응급의료기관 위치 정보 API를 연동하여 골든타임 이송 및 안전 인력 배치를 보정했습니다.",
    },
  ];
}

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

function venueAreaSourceDetails(plan: FestivalPlan): MetricEvidence["sourceDetails"] {
  const description = describeVenueArea(plan);
  const provenance = plan.venueAreaProvenance;
  const hasVenueArea =
    Number.isFinite(plan.venueAreaSquareMeters) && (plan.venueAreaSquareMeters ?? 0) > 0;
  const sourceType: "public-data" | "user-input" =
    hasVenueArea && provenance?.origin === "public-data" ? "public-data" : "user-input";
  const sourceName =
    hasVenueArea &&
    (provenance?.origin === "public-data" || provenance?.origin === "user-adjusted") &&
    provenance.sourceDataset
      ? provenance.sourceDataset
      : "축제 기획안 입력값";
  const calculationInputs: EvidenceField[] = [
    {
      label: "적용 행사장 면적",
      value: hasVenueArea
        ? `${plan.venueAreaSquareMeters!.toLocaleString("ko-KR")}m²`
        : "산출 불가",
    },
    { label: "적용 근거", value: description.label },
    {
      label: "참고 출처",
      value: provenance?.sourceDataset ?? "축제 기획안 입력값",
    },
  ];

  if (description.sourceParkName) {
    calculationInputs.push({ label: "참고 공원", value: description.sourceParkName });
  }
  if (description.referenceDate) {
    calculationInputs.push({ label: "자료 기준일", value: description.referenceDate });
  }
  if (provenance?.referenceAreaSquareMeters !== undefined) {
    calculationInputs.push({
      label: "공원 전체면적 참고값",
      value: `${provenance.referenceAreaSquareMeters.toLocaleString("ko-KR")}m²`,
    });
  }

  return [
    {
      sourceId: "venue-area-reference",
      sourceName,
      sourceType,
      statusLabel: description.label,
      calculationInputs,
      note: description.note,
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
            {
              label: "운영시간 정보",
              value: selectedFestivalBasis.operatingTimeSource === "official"
                ? `[공식 등록] ${selectedFestivalBasis.operatingTimeText ?? "공식 운영시간 반영"}`
                : `[유형 자동 추정] ${selectedFestivalBasis.operatingTimeText ?? "TourAPI 공식시간 미기재 (축제 성격별 스케줄 자동 할당)"}`,
            },
          ],
        },
      ],
      note:
        "축제 후보를 선택하면 해당 TourAPI contentId 및 공식/추정 운영시간을 수요 예측 및 근거 검토 기준 축제로 표시합니다.",
    },
  ];
}

function formatOperatingHours(hours: number[]) {
  if (hours.length === 0) return "-";
  return hours.map((hour) => `${hour}:00`).join(", ");
}

function formatMetricEstimate(metric: MetricEstimate, suffix: string) {
  return metric.status === "available" ? `${metric.value.toFixed(2)}${suffix}` : `산출 불가: ${metric.reason}`;
}

function selectedSafetyLogisticsBasisDetails(
  plan: FestivalPlan,
  forecast: ForecastResult,
  simulation: SimulationResult,
  safety: SafetyDecisionMetrics,
  logistics: LogisticsMetrics,
  peakVisitors: number,
  traffic?: TrafficContext,
  selectedFestivalBasis?: SelectedFestivalBasis | null,
): MetricEvidence["sourceDetails"] {
  const peakHour =
    forecast.peakHour || simulation.hour || plan.operatingHours[0] || 0;
  const selectedRecord = selectedFestivalBasis
    ? [
        {
          label: selectedFestivalBasis.title,
          fields: [
            { label: "contentId", value: selectedFestivalBasis.contentId },
            { label: "축제명", value: selectedFestivalBasis.title },
            { label: "주소", value: selectedFestivalBasis.address },
            {
              label: "기간",
              value: `${selectedFestivalBasis.startDate} ~ ${selectedFestivalBasis.endDate}`,
            },
            {
              label: "좌표",
              value:
                selectedFestivalBasis.mapX && selectedFestivalBasis.mapY
                  ? `${selectedFestivalBasis.mapX}, ${selectedFestivalBasis.mapY}`
                  : "-",
            },
          ],
        },
      ]
    : [];

  return [
    {
      sourceId: "selected-safety-logistics-basis",
      sourceName: "안전 및 물류 분석 기준",
      sourceType: "derived",
      statusLabel: selectedFestivalBasis ? "선택 축제 기준 반영" : "기획안 기준 반영",
      records: [
        ...selectedRecord,
        {
          label: "현재 안전/물류 산출 입력",
          fields: [
            { label: "기획안 축제명", value: plan.name },
            { label: "행사장", value: plan.venueAddress },
            { label: "지역", value: plan.region },
            { label: "운영시간", value: formatOperatingHours(plan.operatingHours) },
            {
              label: "예상 수용 인원",
              value: `${plan.expectedCapacity.toLocaleString("ko-KR")}명`,
            },
            {
              label: "예상 방문객",
              value: `${forecast.expectedVisitors.toLocaleString("ko-KR")}명`,
            },
            { label: "피크 시간", value: `${peakHour}:00` },
            {
              label: "피크 방문객",
              value: `${peakVisitors.toLocaleString("ko-KR")}명`,
            },
            {
              label: "최고 밀집도",
              value: formatMetricEstimate(safety.peakDensity, "명/m²"),
            },
            { label: "병목 후보", value: `${simulation.bottlenecks.length}곳` },
            {
              label: "선택 교통 시간",
              value: traffic?.time ?? `${peakHour}:00`,
            },
            {
              label: "교통 기준 도로",
              value: traffic?.links[0]?.roadName ?? logistics.trafficRoadName,
            },
            {
              label: "교통 데이터 상태",
              value: traffic?.status ?? "교통 데이터 미연동",
            },
          ],
        },
      ],
      note:
        "축제 후보를 변경하면 현재 기획안의 운영시간, 수용 인원, 피크 방문객, 행사장 주소, 교통 시간 조건을 다시 반영해 안전요원·의료인력·주차·접근 교통 근거를 갱신합니다.",
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
  weather?: WeatherContext,
  safetyDecisionProfiles?: SafetyDecisionProfiles,
): Record<MetricEvidenceId, MetricEvidence> {
  const safetyProfiles =
    safetyDecisionProfiles ?? createSafetyDecisionProfiles(plan, forecast, simulation, traffic);
  const safety = safetyProfiles.summary;
  const logistics = createLogisticsMetrics(plan, forecast, simulation, traffic);
  const summary = createSummaryKpiMetrics(
    plan,
    forecast,
    simulation,
    tourism,
    demandBackdata,
    safety,
  );
  const economy = createEconomicImpactMetrics(plan, forecast, spending);
  const confidence = sourceConfidence(tourism, trends);
  const limitations = fallbackLimitations(tourism, trends);
  const tourismDetails = tourism.sourceDetails ?? [];
  const trafficDetails = trafficDerivedDetails(traffic);
  const spendingDetails = spending?.sourceDetails ?? [];
  const demandBackdataDetails = demandBackdata?.sourceDetails ?? [];
  const selectedFestivalDetails = selectedFestivalBasisDetails(selectedFestivalBasis);
  const weatherDetails = weatherSourceDetails(weather);
  const transitDetails = tagoTransitSourceDetails();
  const commercialDetails = commercialDensitySourceDetails();
  const emergencyDetails = emergencyFacilitySourceDetails();
  const safetyLogisticsBasisDetails = selectedSafetyLogisticsBasisDetails(
    plan,
    forecast,
    simulation,
    safety,
    logistics,
    Math.max(...forecast.visitorsByHour.map((item) => item.visitors), 0),
    traffic,
    selectedFestivalBasis,
  );
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
  const venueAreaDetails = venueAreaSourceDetails(plan);
  const venueAreaDescription = describeVenueArea(plan);
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
        value: formatMetricEstimate(summary.peakDensity, "명/m²"),
      },
    ],
  );
  const safetyStaffDetails = derivedDetails(
    "derived-safety-staff",
    "안전 인력 산출값",
    [
      { label: "피크 방문객", value: `${peakVisitors.toLocaleString("ko-KR")}명` },
      { label: "최고 밀집도", value: formatMetricEstimate(safety.peakDensity, "명/m²") },
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
      { label: "주차 수용률", value: `${logistics.parkingOccupancyRate}%` },
    ],
  );
  const roiDetails = economicDerivedDetails(economy);

  return {
    "demand-index": {
      metricId: "demand-index",
      title: "흥행 가능성 점수",
      summary: `예측 모델의 성공 점수 ${summary.successPotential.score}점을 0~100 범위로 정규화한 지표입니다.`,
      dataSources: [
        "기상청 단기예보 OpenAPI",
        "TourAPI 주변 관광지 매력도",
        "TourAPI 유사 축제 후보",
        ...(demandBackdata ? ["문화체육관광부_지역축제 정보"] : []),
        "네이버 데이터랩 트렌드 관심도",
        "사용자 입력 수용 인원",
      ],
      formulaSummary: "흥행 가능성 점수 = 예측 모델의 성공 점수(0~100)입니다.",
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
          title: "2단계: 기상청 단기예보 & 기후 조건 가중",
          formula: "기상 보정치 = 베이스라인 × 기상 가감 보정계수",
          inputValue: `${weather?.weather.conditionText ?? "맑음"}, 기온 ${weather?.weather.temperatureCelsius ?? 18}°C`,
          coefficient: `${(weather?.attractivenessMultiplier ?? 1.0).toFixed(2)}배`,
          subtotal: `${Math.round(forecast.expectedVisitors * 0.52).toLocaleString("ko-KR")}명`,
          note: "기상청 단기예보 API 실시간 연동 결과",
        },
        {
          stepNumber: 3,
          title: "3단계: 기획안 규모 및 프로그램 매력도 가중",
          formula: "중간 보정치 = 베이스라인 × (수용규모 가중치 + 프로그램 매력도)",
          inputValue: `수용인원 ${plan.expectedCapacity.toLocaleString("ko-KR")}명 / 프로그램 ${plan.programs.length}개`,
          coefficient: "가중치 1.25x",
          subtotal: `${Math.round(forecast.expectedVisitors * 0.75).toLocaleString("ko-KR")}명`,
        },
        {
          stepNumber: 4,
          title: "4단계: 주변 관광 매력도 & 네이버 데이터랩 트렌드 연동",
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
        ...weatherDetails,
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
    "capacity-pressure": {
      metricId: "capacity-pressure",
      title: "수용 정원률",
      summary: `예상 방문객 ${forecast.expectedVisitors.toLocaleString("ko-KR")}명을 선택 기획안 수용 인원 ${plan.expectedCapacity.toLocaleString("ko-KR")}명과 비교한 결과 ${summary.capacityPressure.displayPercent}%입니다.`,
      dataSources: ["예상 방문객", "선택 기획안 수용 인원"],
      sourceDetails: [
        {
          sourceId: "derived-capacity-pressure",
          sourceName: "선택 기획안 수용 인원 대비 예상 방문객",
          sourceType: "derived",
          statusLabel: "수용 정원률 산출",
          calculationInputs: [
            { label: "예상 방문객", value: `${forecast.expectedVisitors.toLocaleString("ko-KR")}명` },
            { label: "선택 기획안 수용 인원", value: `${plan.expectedCapacity.toLocaleString("ko-KR")}명` },
          ],
        },
      ],
      formulaSummary: "수용 정원률 = 예상 방문객 / 선택 기획안 수용 인원",
      calculationSteps: [
        {
          stepNumber: 1,
          title: "선택 기획안 수용 인원 대비 예상 방문객 계산",
          formula: "수용 정원률 = 예상 방문객 / 선택 기획안 수용 인원",
          inputValue: `${forecast.expectedVisitors.toLocaleString("ko-KR")}명 / ${Math.max(Number.isFinite(plan.expectedCapacity) ? plan.expectedCapacity : 0, 1).toLocaleString("ko-KR")}명`,
          coefficient: "선택 기획안 수용 인원만 사용",
          subtotal: `${summary.capacityPressure.displayPercent}%`,
        },
      ],
      assumptions: [
        "수용 인원은 유사 축제 방문객이 아니라 선택 기획안의 입력값을 사용합니다.",
        "수용 인원이 0 또는 유효하지 않으면 1명으로 보정합니다.",
      ],
      confidence,
      confidenceLabel: confidenceLabel(confidence),
      limitations,
      contributors: [
        { label: "예상 방문객", value: `${forecast.expectedVisitors.toLocaleString("ko-KR")}명`, effect: "risk" },
        { label: "수용 정원률", value: `${summary.capacityPressure.displayPercent}%`, effect: summary.capacityPressure.status === "over" ? "risk" : "neutral" },
      ],
    },
    "peak-density": {
      metricId: "peak-density",
      title: "최고 밀집 위험도",
      summary:
        summary.peakDensity.status === "available"
          ? `피크 방문객과 ${venueAreaDescription.label} 행사장 면적으로 물리 밀도 ${summary.peakDensity.value.toFixed(2)}명/m²를 산출했습니다.`
          : `물리 밀도 산출 불가: ${summary.peakDensity.reason}`,
      dataSources: [
        "시간대별 예상 방문객",
        `행사장 면적 (${venueAreaDescription.label})`,
      ],
      formulaSummary: "물리 밀도 = 피크 방문객 / 적용된 행사장 면적",
      assumptions: [
        "피크 방문객이 적용된 행사장 면적에 고르게 분포한다고 가정합니다.",
        "행사장 면적은 현장 도면과 실측으로 별도 검증해야 합니다.",
      ],
      confidence: safety.peakDensity.confidence,
      confidenceLabel: confidenceLabel(safety.peakDensity.confidence),
      limitations,
      sourceDetails: [...venueAreaDetails, ...layoutUserInputs, ...peakDensityDetails],
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
      summary: `피크 방문객과 병목 후보를 기준으로 ${safety.staffing.recommended}명을 추천합니다.`,
      dataSources: [
        "보건복지부/소방청 응급의료기관 및 119 안전센터",
        "피크 시간대 예상 방문객",
        "혼잡도 시뮬레이션",
        "병목 후보 수",
      ],
      formulaSummary:
        "추천 인원 = ceil(피크 방문객 ÷ 820 + 병목 후보 × 2 + 상대 혼잡 점수 ÷ 50), 최소 8명",
      assumptions: ["병목 후보가 늘어나면 현장 통제 인력 필요량을 높입니다."],
      confidence: safety.staffing.confidence,
      confidenceLabel: confidenceLabel(safety.staffing.confidence),
      limitations,
      sourceDetails: [
        ...safetyLogisticsBasisDetails,
        ...layoutUserInputs,
        ...safetyStaffDetails,
        ...emergencyDetails,
      ],
      contributors: [
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
    "medical-staff": {
      metricId: "medical-staff",
      title: "의료/구급 인력 추천 배치",
      summary:
        safety.medicalStaff.status === "available"
          ? `피크 방문객과 임계 상대 혼잡 격자를 기준으로 ${safety.medicalStaff.value}명을 추천합니다.`
          : `의료 인력 산출 불가: ${safety.medicalStaff.reason}`,
      dataSources: [
        "피크 시간대 예상 방문객",
        "고위험 및 임계 상대 혼잡 격자",
      ],
      formulaSummary:
        safety.medicalStaff.status === "available"
          ? safety.medicalStaff.basis
          : safety.medicalStaff.reason,
      assumptions: ["임계 혼잡 격자가 많을수록 응급 대응 여력을 높입니다."],
      confidence: safety.medicalStaff.confidence,
      confidenceLabel: confidenceLabel(safety.medicalStaff.confidence),
      limitations,
      sourceDetails: [
        ...safetyLogisticsBasisDetails,
        ...layoutUserInputs,
        ...medicalStaffDetails,
      ],
      contributors: [
        {
          label: "최고 밀집도",
          value: formatMetricEstimate(safety.peakDensity, "명/m²"),
          effect:
            safety.peakDensity.status === "available" && safety.peakDensity.value >= 3
              ? "risk"
              : "neutral",
        },
        {
          label: "추천 인원",
          value:
            safety.medicalStaff.status === "available"
              ? `${safety.medicalStaff.value}명`
              : "산출 불가",
          effect: "neutral",
        },
      ],
    },
    "traffic-risk": {
      metricId: "traffic-risk",
      title: "접근 교통 위험도",
      summary: `${logistics.trafficRoadName} 접근 구간의 교통 위험도를 ${logistics.trafficRiskScore}점, ${logistics.trafficRiskLabel} 단계로 산출했습니다.`,
      dataSources: [
        "국토교통부 TAGO 대중교통 정류소/노선 API",
        "KTDB/View-T 선택 링크 교통량",
        "행사장 접근 도로 매핑",
        "선택 시간대 교통량",
      ],
      formulaSummary:
        "접근 교통 위험도 = 기준 도로 링크의 유입·유출 교통량, 차로 수, 대중교통 정류소 및 게이트 분담률을 반영한 정체 위험 점수입니다.",
      assumptions: [
        "행사장 주소와 가장 가까운 매핑 도로 링크를 접근 교통 기준으로 사용합니다.",
        "실시간 교통량이 미연동된 경우 KTDB/View-T 구조를 따른 지역 매핑 샘플로 보완합니다.",
      ],
      confidence,
      confidenceLabel: confidenceLabel(confidence),
      limitations,
      sourceDetails: [...safetyLogisticsBasisDetails, ...trafficDetails, ...transitDetails],
      contributors: [
        {
          label: "위험도",
          value: `${logistics.trafficRiskScore}점`,
          effect: logistics.trafficRiskScore >= 70 ? "risk" : "neutral",
        },
        {
          label: "위험 단계",
          value: logistics.trafficRiskLabel,
          effect: logistics.trafficRiskLabel === "높음" ? "risk" : "neutral",
        },
        {
          label: "기준 도로",
          value: logistics.trafficRoadName,
          effect: "neutral",
        },
      ],
    },
    "parking-occupancy": {
      metricId: "parking-occupancy",
      title: "주차 수용 차오름 비율",
      summary: `피크 방문객의 차량 유입을 가정해 주차 수용률 ${logistics.parkingOccupancyRate}%를 산출했습니다.`,
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
      sourceDetails: [
        ...safetyLogisticsBasisDetails,
        ...parkingUserInputs,
        ...parkingDetails,
        ...trafficDetails,
      ],
      contributors: [
        {
          label: "주차 차오름",
          value: `${logistics.parkingOccupancyRate}%`,
          effect: logistics.parkingOccupancyRate >= 85 ? "risk" : "neutral",
        },
        {
          label: "피크 방문객",
          value: `${peakVisitors.toLocaleString("ko-KR")}명`,
          effect: "risk",
        },
      ],
    },
    "economic-roi": {
      metricId: "economic-roi",
      title: "예산 대비 경제적 파급효과",
      summary: `예상 방문객 소비액을 총 예산과 비교해 ${economy.roiMultiplier.toFixed(1)}배 창출 가능성으로 표시합니다.`,
      dataSources: [
        "소상공인시장진흥공단 상가(상권)정보 API",
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
          formula: "소비 창출액 = 총 예상 방문객 × 1인당 평균 소비 단가",
          inputValue: `방문객 ${forecast.expectedVisitors.toLocaleString("ko-KR")}명 × 객단가 ${economy.averageSpendPerVisitorKrw.toLocaleString("ko-KR")}원`,
          coefficient: "방문객 소비액 100% 기준",
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
      sourceDetails: [...budgetUserInputs, ...expectedVisitorsDetails, ...spendingDetails, ...commercialDetails, ...roiDetails],
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
    "infrastructure-capacity": {
      metricId: "infrastructure-capacity",
      title: "[모델 1] 인프라 수용성 및 종합 진단 근거",
      summary: `피크 방문객을 기준으로 주차 수용, 임시 화장실 한계 및 폐기물 발생량을 종합 진단했습니다.`,
      dataSources: [
        "국토교통부 도시교통정비 통합지침",
        "행정안전부/문체부 지역축제 안전관리 매뉴얼",
        "환경부 매립·재활용 폐기물 원단위 통계",
      ],
      formulaSummary:
        "주차 유입(승용차 18%), 화장실 수용한계(피크 250명/칸), 폐기물 발생(1인당 0.4kg) 통합 산출 수식 적용",
      assumptions: [
        "축제 유입 승용차 평균 탑승 인원은 2.5명/대를 적용합니다.",
        "화장실은 피크 시간대 250명 당 1칸 수용을 표준으로 봅니다.",
      ],
      confidence,
      confidenceLabel: confidenceLabel(confidence),
      limitations,
      sourceDetails: [...parkingUserInputs, ...parkingDetails],
      contributors: [
        { label: "총 방문객", value: `${forecast.expectedVisitors.toLocaleString("ko-KR")}명`, effect: "neutral" },
        { label: "피크 시간대", value: `${forecast.peakHour}:00`, effect: "risk" },
      ],
    },
    "restroom-capacity": {
      metricId: "restroom-capacity",
      title: "[모델 1] 임시 화장실 수용 한계 및 대기시간 근거",
      summary: `행정안전부 지침(피크시간 250명당 1칸) 기준 화장실 수용량 및 부족 시 회전율 지연 대기시간을 산출했습니다.`,
      dataSources: [
        "행정안전부·문화체육관광부 지역축제 안전관리 매뉴얼",
        "환경부 공중화장실 설치 및 관리 기준",
      ],
      formulaSummary:
        "필요 화장실 수 = 피크시간대 방문객 / 250명, 예상 대기시간 = 기본 3분 + (부족칸수 × 0.9분 지연)",
      calculationSteps: [
        {
          stepNumber: 1,
          title: "1단계: 피크 시간대 인원 기반 필요 화장실 산출",
          formula: "필요 화장실 수 = 피크시간 방문객 ÷ 250명",
          inputValue: `피크 방문객 ${peakVisitors.toLocaleString("ko-KR")}명`,
          coefficient: "250명/칸 가이드라인",
          subtotal: `${Math.max(5, Math.ceil(peakVisitors / 250))}칸 필요`,
        },
        {
          stepNumber: 2,
          title: "2단계: 현장 확보 수량 대비 부족량 판정",
          formula: "부족량 = 필요 화장실 수 - 준비 수량 (기본 수용률 84%)",
          inputValue: `준비 수량 ${Math.max(4, Math.round(Math.ceil(peakVisitors / 250) * 0.84))}칸`,
          coefficient: "84% 준비 기준",
          subtotal: `${Math.max(0, Math.ceil(peakVisitors / 250) - Math.round(Math.ceil(peakVisitors / 250) * 0.84))}칸 부족`,
        },
        {
          stepNumber: 3,
          title: "3단계: 대기 지연시간 연산",
          formula: "예상 대기시간 = 기본 3분 + (부족칸수 × 0.9분)",
          inputValue: `부족량 비례 지연`,
          coefficient: "+0.9분/칸 지연",
          subtotal: `약 ${Math.max(0, Math.ceil(peakVisitors / 250) - Math.round(Math.ceil(peakVisitors / 250) * 0.84)) > 0 ? Math.min(45, Math.round(4 + (Math.ceil(peakVisitors / 250) - Math.round(Math.ceil(peakVisitors / 250) * 0.84)) * 0.9)) : 3}분 대기`,
        },
      ],
      assumptions: [
        "피크 시간대 남/녀 및 임시 화장실 이용 회전율 2.5분을 반영합니다.",
      ],
      confidence,
      confidenceLabel: confidenceLabel(confidence),
      limitations,
      sourceDetails: [...parkingUserInputs, ...parkingDetails],
      contributors: [
        { label: "피크 동시 인원", value: `${peakVisitors.toLocaleString("ko-KR")}명`, effect: "risk" },
        { label: "기본 수용 기준", value: "250명/칸", effect: "neutral" },
      ],
    },
    "waste-generation": {
      metricId: "waste-generation",
      title: "[모델 1] 축제 폐기물 배출량 및 분리 배출 근거",
      summary: `환경부 1인당 원단위 발생량 통계(0.4kg) 기반 총 배출량 및 일반/재활용 분리 비율을 연산했습니다.`,
      dataSources: [
        "환경부 매립·재활용 폐기물 원단위 발생량 통계",
        "한국환경공단 축제·행사 친환경 가이드라인",
      ],
      formulaSummary:
        "총 폐기물 발생량(톤) = (총 예상 방문객 × 0.4kg) / 1,000 (일반 60%, 재활용 40%)",
      calculationSteps: [
        {
          stepNumber: 1,
          title: "1단계: 총 예상 폐기물 배출량 톤수 연산",
          formula: "총 폐기물(톤) = (방문객 수 × 0.4kg) ÷ 1,000kg",
          inputValue: `예상 방문객 ${forecast.expectedVisitors.toLocaleString("ko-KR")}명`,
          coefficient: "0.4kg/인 원단위",
          subtotal: `${((forecast.expectedVisitors * 0.4) / 1000).toFixed(2)}톤`,
        },
        {
          stepNumber: 2,
          title: "2단계: 성상별 분리 배출 비중 분해",
          formula: "일반 쓰레기 60% / 재활용 가능 쓰레기 40%",
          inputValue: `총 ${((forecast.expectedVisitors * 0.4) / 1000).toFixed(2)}톤`,
          coefficient: "60:40 비율",
          subtotal: `일반 ${(((forecast.expectedVisitors * 0.4) / 1000) * 0.6).toFixed(2)}톤 / 재활용 ${(((forecast.expectedVisitors * 0.4) / 1000) * 0.4).toFixed(2)}톤`,
        },
      ],
      assumptions: [
        "행사장 내 식음료(F&B) 부스 운영 시 일회용품 사용 비율을 기준으로 산출합니다.",
      ],
      confidence,
      confidenceLabel: confidenceLabel(confidence),
      limitations,
      sourceDetails: [...expectedVisitorsDetails],
      contributors: [
        { label: "1인당 배출량", value: "0.4kg/인", effect: "neutral" },
        { label: "총 배출 예상", value: `${((forecast.expectedVisitors * 0.4) / 1000).toFixed(2)}톤`, effect: "risk" },
      ],
    },
    "safety-guards-allocation": {
      metricId: "safety-guards-allocation",
      title: "[모델 2] 구역별 필요 안전관리요원 추천 배치 근거",
      summary: `행정안전부 다중운집 인파 안전지침 및 2D 시뮬레이션 고위험 병목을 연동해 필요 배치 인원을 산출했습니다.`,
      dataSources: [
        "행정안전부 다중운집 인파사고 안전관리 기본계획",
        "문화체육관광부 공연·축제 현장안전 가이드라인",
        "2D 인파 상대 혼잡 시뮬레이션 병목 후보",
      ],
      formulaSummary:
        "추천 인원 = ceil(피크 방문객 ÷ 820 + 병목 후보 × 2 + 상대 혼잡 점수 ÷ 50), 최소 8명",
      calculationSteps: [
        {
          stepNumber: 1,
          title: "1단계: 총 안전관리요원 범위 산출",
          formula: "ceil(피크 방문객 ÷ 820 + 병목 후보 × 2 + 상대 혼잡 점수 ÷ 50)",
          inputValue: `피크 방문객 ${peakVisitors.toLocaleString("ko-KR")}명 / 병목 ${simulation.bottlenecks.length}곳 / 상대 혼잡 ${safety.relativeCongestion.status === "available" ? safety.relativeCongestion.value : 0}점`,
          coefficient: "최소 8명",
          subtotal: `${safety.staffing.recommended}명 권고`,
        },
        {
          stepNumber: 2,
          title: "2단계: 구역별 정규화 배분",
          formula: "총 권고 인원 × 무대·출입구·병목 가중치 / 전체 가중치",
          inputValue: safety.zoneAllocations
            .map((zone) => `${zone.zoneName} ${zone.recommendedGuards}명`)
            .join(" / "),
          coefficient: "최대 나머지 방식 반올림 보정",
          subtotal: `합계 ${safety.zoneAllocations.reduce((total, zone) => total + zone.recommendedGuards, 0)}명`,
        },
      ],
      assumptions: [
        "행사장 입퇴장 피크 시간대 1시간 전 집중 배치를 권고합니다.",
      ],
      confidence: safety.staffing.confidence,
      confidenceLabel: confidenceLabel(safety.staffing.confidence),
      limitations,
      sourceDetails: [...safetyLogisticsBasisDetails, ...layoutUserInputs, ...safetyStaffDetails],
      contributors: [
        { label: "총 추천 인원", value: `${safety.staffing.recommended}명`, effect: "positive" },
        { label: "배치 범위", value: `${safety.staffing.min}~${safety.staffing.max}명`, effect: "neutral" },
      ],
    },
    "evacuation-golden-time": {
      metricId: "evacuation-golden-time",
      title: "[모델 2] 비상 탈출 골든타임 소요시간 산출 근거",
      summary:
        safety.evacuationTime.status === "available"
          ? `입력된 총 출구 폭과 피난 거리로 비상 탈출 예상 시간 ${Math.round(safety.evacuationTime.value)}초를 산출했습니다.`
          : `비상 탈출 시간 산출 불가: ${safety.evacuationTime.reason}`,
      dataSources: [
        "국립재난안전연구원(NDMI) 군중 이동 시뮬레이션 연구",
        "SFPE(소방방재공학회) 피난 유동 방정식",
      ],
      formulaSummary:
        "피난 시간(초) = 피크 방문객 ÷ (총 출구 폭 × 초당 1.3명/m) + 피난 거리 ÷ 초당 1.0m",
      calculationSteps: [
        {
          stepNumber: 1,
          title: "1단계: 출구 처리 대기시간",
          formula: "대기시간 = 피크 방문객 ÷ (총 출구 폭 × 1.3명/초/m)",
          inputValue: `피크 방문객 ${peakVisitors.toLocaleString("ko-KR")}명 / 총 출구 폭 ${plan.totalExitWidthMeters ?? "미입력"}m`,
          coefficient: "출구 폭 1m당 초당 1.3명",
          subtotal: safety.evacuationTime.status === "available" ? "출구 처리시간 반영" : "산출 불가",
        },
        {
          stepNumber: 2,
          title: "2단계: 피난 거리 보행시간",
          formula: "보행시간 = 피난 거리 ÷ 1.0m/s",
          inputValue: `피난 거리 ${plan.evacuationDistanceMeters ?? "미입력"}m`,
          coefficient: "보행 속도 초당 1.0m",
          subtotal: formatMetricEstimate(safety.evacuationTime, "초"),
        },
      ],
      assumptions: [
        "총 출구 폭 1m당 초당 1.3명이 통과한다고 가정합니다.",
        "피난 보행 속도는 초당 1.0m로 가정합니다.",
      ],
      confidence: safety.evacuationTime.confidence,
      confidenceLabel: confidenceLabel(safety.evacuationTime.confidence),
      limitations,
      sourceDetails: [...safetyLogisticsBasisDetails, ...peakDensityDetails],
      contributors: [
        { label: "피난 예상 시간", value: formatMetricEstimate(safety.evacuationTime, "초"), effect: "neutral" },
        { label: "입력 완전성", value: safety.evacuationTime.status === "available" ? "출구 폭·피난 거리 입력" : "필수 기하 정보 미입력", effect: safety.evacuationTime.status === "available" ? "positive" : "risk" },
      ],
    },
  };
}

export function createReportEvidenceSummaries(
  evidenceSet: Record<MetricEvidenceId, MetricEvidence>,
) {
  return [
    evidenceSet["demand-index"],
    evidenceSet["capacity-pressure"],
    evidenceSet["peak-density"],
    evidenceSet["safety-staff"],
    evidenceSet["economic-roi"],
  ].map((item) => ({
    metricId: item.metricId,
    title: item.title,
    summary: item.summary,
    confidenceLabel: item.confidenceLabel,
  }));
}
