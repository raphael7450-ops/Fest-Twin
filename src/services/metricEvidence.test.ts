import { describe, expect, it } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import { sampleDemandBackdataContext } from "../data/sampleDemandBackdata";
import { sampleSpendingContext } from "../data/sampleSpending";
import { sampleTrafficContext } from "../data/sampleTraffic";
import { sampleTourismContext } from "../data/sampleTourApi";
import { sampleTrendContext } from "../data/sampleTrends";
import type { MetricEvidence, SelectedFestivalBasis } from "../domain/types";
import { createForecast } from "./forecast";
import { createSafetyDecisionProfiles } from "./safetyDecisionMetrics";
import { createSimulation } from "./simulation";
import {
  createMetricEvidenceSet,
  createReportEvidenceSummaries,
} from "./metricEvidence";

const sampleForecastResult = createForecast(
  sampleFestivalPlan,
  sampleTourismContext,
  sampleTrendContext,
);
const sampleSimulationResult = createSimulation(
  sampleFestivalPlan,
  sampleForecastResult,
  sampleForecastResult.peakHour,
);
const selectedFestivalBasis: SelectedFestivalBasis = {
  contentId: "3439947",
  title: "Gangnam Media Winter Festa",
  address: "Seoul Gangnam-gu Yeongdong-daero 511",
  startDate: "2025-12-19",
  endDate: "2026-01-03",
  mapX: "127.0610512042",
  mapY: "37.5103955843",
  sourceName: "TourAPI selected festival candidate",
};

const publicDataProvenance = {
  origin: "public-data" as const,
  sourceDataset: "전국도시공원정보표준데이터" as const,
  sourceRecordId: "PARK-001",
  sourceParkName: "여의도공원",
  referenceAreaSquareMeters: 229539,
  managementOrganization: "서울특별시",
  referenceDate: "2026-01-01",
  appliedAt: "2026-08-13T12:00:00.000Z",
};

function createEvidenceForPlan(plan: typeof sampleFestivalPlan) {
  const forecast = createForecast(plan, sampleTourismContext, sampleTrendContext);
  const simulation = createSimulation(plan, forecast, forecast.peakHour);

  return createMetricEvidenceSet(
    plan,
    forecast,
    simulation,
    sampleTourismContext,
    sampleTrendContext,
  );
}

describe("metricEvidence", () => {
  it.each([
    ["public data", { venueAreaSquareMeters: 229539, venueAreaProvenance: publicDataProvenance }, "전국도시공원정보표준데이터 참고값 적용", "public-data"],
    ["manual input", { venueAreaSquareMeters: 4000, venueAreaProvenance: { origin: "user-input" as const } }, "사용자 입력", "user-input"],
    ["adjusted public data", { venueAreaSquareMeters: 12000, venueAreaProvenance: { ...publicDataProvenance, origin: "user-adjusted" as const } }, "공공데이터 참고 후 사용자 조정", "user-input"],
  ] as const)("records venue area provenance for %s", (_name, area, label, sourceType) => {
    const evidence = createEvidenceForPlan({ ...sampleFestivalPlan, ...area });
    const areaDetail = evidence["peak-density"].sourceDetails.find(
      (detail) => detail.sourceId === "venue-area-reference",
    );

    expect(areaDetail).toMatchObject({
      sourceType,
      statusLabel: label,
      calculationInputs: expect.arrayContaining([
        expect.objectContaining({ label: "적용 행사장 면적" }),
      ]),
    });
    expect(JSON.stringify(areaDetail)).toContain(label);
    expect(JSON.stringify(areaDetail)).toContain("실제 행사 운영구역 검증 필요");
    if (sourceType === "public-data" || label === "공공데이터 참고 후 사용자 조정") {
      expect(JSON.stringify(areaDetail)).toContain("여의도공원");
      expect(JSON.stringify(areaDetail)).toContain("2026-01-01");
    }
  });

  it("keeps density unavailable and reports missing venue area", () => {
    const plan = { ...sampleFestivalPlan, venueAreaSquareMeters: undefined, venueAreaProvenance: undefined };
    const evidence = createEvidenceForPlan(plan);

    expect(evidence["peak-density"].summary).toContain("산출 불가");
    expect(JSON.stringify(evidence["peak-density"].sourceDetails)).toContain("사용자 입력");
  });

  it("keeps success potential evidence separate from capacity pressure evidence", () => {
    const plan = { ...sampleFestivalPlan, expectedCapacity: 120_000 };
    const forecast = {
      ...sampleForecastResult,
      expectedVisitors: 240_000,
      successScore: 78,
    };
    const simulation = createSimulation(plan, forecast, forecast.peakHour);
    const evidence = createMetricEvidenceSet(
      plan,
      forecast,
      simulation,
      sampleTourismContext,
      sampleTrendContext,
    );
    const capacityEvidence = evidence as unknown as Record<string, MetricEvidence>;

    expect(evidence["demand-index"]).toMatchObject({
      title: "흥행 가능성 점수",
      formulaSummary: "흥행 가능성 점수 = 예측 모델의 성공 점수(0~100)입니다.",
    });
    expect(capacityEvidence["capacity-pressure"]).toMatchObject({
      title: "수용 정원률",
      formulaSummary: "수용 정원률 = 예상 방문객 / 선택 기획안 수용 인원",
    });
  });

  it("keeps canonical safety evidence low confidence with live tourism and trends", () => {
    const plan = {
      ...sampleFestivalPlan,
      venueAreaSquareMeters: 12000,
      totalExitWidthMeters: 8,
      evacuationDistanceMeters: 140,
    };
    const liveTourism = {
      ...sampleTourismContext,
      provenance: {
        ...sampleTourismContext.provenance,
        sourceStatus: "live" as const,
      },
    };
    const liveTrends = {
      ...sampleTrendContext,
      provenance: {
        ...sampleTrendContext.provenance,
        sourceStatus: "live" as const,
      },
    };
    const forecast = createForecast(plan, liveTourism, liveTrends);
    const simulation = createSimulation(plan, forecast, forecast.peakHour);
    const evidence = createMetricEvidenceSet(
      plan,
      forecast,
      simulation,
      liveTourism,
      liveTrends,
    );

    for (const metricId of [
      "peak-density",
      "safety-staff",
      "medical-staff",
      "safety-guards-allocation",
      "evacuation-golden-time",
    ] as const) {
      expect(evidence[metricId].confidence, metricId).toBe("low");
      expect(evidence[metricId].confidenceLabel, metricId).toBe("낮음");
    }
  });

  it("uses the canonical medical staffing basis without transfer-time claims", () => {
    const profiles = createSafetyDecisionProfiles(
      sampleFestivalPlan,
      sampleForecastResult,
      sampleSimulationResult,
    );
    const evidence = createMetricEvidenceSet(
      sampleFestivalPlan,
      sampleForecastResult,
      sampleSimulationResult,
      sampleTourismContext,
      sampleTrendContext,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      profiles,
    );

    expect(profiles.summary.medicalStaff.status).toBe("available");
    if (profiles.summary.medicalStaff.status === "available") {
      expect(evidence["medical-staff"].formulaSummary).toBe(
        profiles.summary.medicalStaff.basis,
      );
    }
    expect(evidence["medical-staff"].formulaSummary).not.toContain("이송 시간");
  });

  it("includes KTDB traffic evidence for parking metrics only", () => {
    const evidence = createMetricEvidenceSet(
      sampleFestivalPlan,
      sampleForecastResult,
      sampleSimulationResult,
      sampleTourismContext,
      sampleTrendContext,
      sampleTrafficContext,
    );

    expect(JSON.stringify(evidence["parking-occupancy"].sourceDetails)).toContain(
      "KTDB/View-T",
    );
    expect(JSON.stringify(evidence["safety-staff"].sourceDetails)).not.toContain(
      "KTDB/View-T",
    );
    expect(JSON.stringify(evidence["medical-staff"].sourceDetails)).not.toContain(
      "KTDB/View-T",
    );
  });

  it("includes tourism spending backdata for economic ROI", () => {
    const evidence = createMetricEvidenceSet(
      sampleFestivalPlan,
      sampleForecastResult,
      sampleSimulationResult,
      sampleTourismContext,
      sampleTrendContext,
      undefined,
      sampleSpendingContext,
    );

    expect(evidence["economic-roi"].dataSources).toContain(
      "한국관광공사 지역별 관광 수요 강도",
    );
  });

  it("populates step-by-step calculation breakdown flow items", () => {
    const evidence = createMetricEvidenceSet(
      sampleFestivalPlan,
      sampleForecastResult,
      sampleSimulationResult,
      sampleTourismContext,
      sampleTrendContext,
      sampleTrafficContext,
      sampleSpendingContext,
      sampleDemandBackdataContext,
    );

    expect(evidence["demand-index"].calculationSteps).toBeDefined();
    expect(evidence["demand-index"].calculationSteps?.length).toBeGreaterThan(0);
    expect(evidence["demand-index"].calculationSteps![0].formula).toContain("베이스라인");

    expect(evidence["economic-roi"].calculationSteps).toBeDefined();
    expect(evidence["economic-roi"].calculationSteps?.length).toBeGreaterThan(0);
    expect(evidence["economic-roi"].calculationSteps![3].formula).toContain("ROI");
  });

  it("includes regional festival visitor records in demand-index evidence", () => {
    const forecast = createForecast(
      sampleFestivalPlan,
      sampleTourismContext,
      sampleTrendContext,
      sampleDemandBackdataContext,
    );
    const simulation = createSimulation(sampleFestivalPlan, forecast, forecast.peakHour);
    const evidence = createMetricEvidenceSet(
      sampleFestivalPlan,
      forecast,
      simulation,
      sampleTourismContext,
      sampleTrendContext,
      undefined,
      undefined,
      sampleDemandBackdataContext,
    );

    expect(evidence["demand-index"].dataSources).toContain(
      "문화체육관광부_지역축제 정보",
    );
    expect(JSON.stringify(evidence["demand-index"].sourceDetails)).toContain(
      "방문객 수",
    );
    expect(JSON.stringify(evidence["demand-index"].sourceDetails)).not.toMatch(
      /serviceKey|clientSecret|Authorization|Cookie/i,
    );
  });

  it("includes TourAPI operating account application evidence for demand review", () => {
    const evidence = createMetricEvidenceSet(
      sampleFestivalPlan,
      sampleForecastResult,
      sampleSimulationResult,
      sampleTourismContext,
      sampleTrendContext,
    );

    const serialized = JSON.stringify(evidence["demand-index"].sourceDetails);

    expect(serialized).toContain("한국관광공사 TourAPI 4.0 운영계정 신청 증빙");
    expect(serialized).toContain("https://cwserver.tail97dbc3.ts.net/");
    expect(serialized).toContain("areaCode2");
    expect(serialized).toContain("searchFestival2");
    expect(serialized).toContain("detailCommon2");
    expect(serialized).toContain("locationBasedList2");
    expect(serialized).toContain("운영계정 승인");
    expect(serialized).not.toMatch(/serviceKey|clientSecret|Authorization|Cookie/i);
  });

  it("includes the selected TourAPI festival basis in demand evidence", () => {
    const evidence = createMetricEvidenceSet(
      sampleFestivalPlan,
      sampleForecastResult,
      sampleSimulationResult,
      sampleTourismContext,
      sampleTrendContext,
      undefined,
      undefined,
      undefined,
      selectedFestivalBasis,
    );

    const source = evidence["demand-index"].sourceDetails.find(
      (detail) => detail.sourceId === "tourapi-selected-festival-basis",
    );

    expect(source?.sourceType).toBe("tourapi");
    expect(JSON.stringify(source)).toContain("Gangnam Media Winter Festa");
    expect(JSON.stringify(source)).toContain("3439947");
    expect(JSON.stringify(source)).toContain("127.0610512042, 37.5103955843");
  });

  it("includes the selected festival basis in safety and logistics evidence", () => {
    const countdownPlan = {
      ...sampleFestivalPlan,
      name: "Countdown Busan",
      region: "Busan",
      venueAddress: "Busan Suyeong-gu Gwanganhaebyeon-ro 219",
      startDate: "2025-12-31",
      endDate: "2026-01-01",
      operatingHours: [18, 20, 22, 23, 24],
      expectedCapacity: 52000,
    };
    const countdownBasis: SelectedFestivalBasis = {
      contentId: "3456789",
      title: "Countdown Busan",
      address: "Busan Suyeong-gu Gwanganhaebyeon-ro 219",
      startDate: "2025-12-31",
      endDate: "2026-01-01",
      mapX: "129.1187",
      mapY: "35.1532",
      sourceName: "TourAPI selected festival candidate",
    };
    const forecast = createForecast(
      countdownPlan,
      sampleTourismContext,
      sampleTrendContext,
    );
    const simulation = createSimulation(countdownPlan, forecast, forecast.peakHour);
    const evidence = createMetricEvidenceSet(
      countdownPlan,
      forecast,
      simulation,
      sampleTourismContext,
      sampleTrendContext,
      sampleTrafficContext,
      undefined,
      undefined,
      countdownBasis,
    );

    const safetySerialized = JSON.stringify(evidence["safety-staff"].sourceDetails);
    const medicalSerialized = JSON.stringify(evidence["medical-staff"].sourceDetails);
    const trafficSerialized = JSON.stringify(evidence["traffic-risk"].sourceDetails);
    const parkingSerialized = JSON.stringify(evidence["parking-occupancy"].sourceDetails);

    for (const serialized of [
      safetySerialized,
      medicalSerialized,
      trafficSerialized,
      parkingSerialized,
    ]) {
      expect(serialized).toContain("selected-safety-logistics-basis");
      expect(serialized).toContain("Countdown Busan");
      expect(serialized).toContain("3456789");
      expect(serialized).toContain("18:00, 20:00, 22:00, 23:00, 24:00");
      expect(serialized).toContain("52,000");
      expect(serialized).toContain(`${forecast.peakHour}:00`);
    }
  });

  it("provides a source detail for every top-level KPI", () => {
    const evidence = createMetricEvidenceSet(
      sampleFestivalPlan,
      sampleForecastResult,
      sampleSimulationResult,
      sampleTourismContext,
      sampleTrendContext,
      sampleTrafficContext,
      sampleSpendingContext,
      sampleDemandBackdataContext,
      selectedFestivalBasis,
    );

    Object.values(evidence).forEach((metric) => {
      expect(metric.sourceDetails.length, metric.metricId).toBeGreaterThan(0);
    });
  });

  it("summarizes demand evidence with selected festival, tourism, trend, backdata, and user inputs", () => {
    const evidence = createMetricEvidenceSet(
      sampleFestivalPlan,
      sampleForecastResult,
      sampleSimulationResult,
      sampleTourismContext,
      sampleTrendContext,
      sampleTrafficContext,
      sampleSpendingContext,
      sampleDemandBackdataContext,
      selectedFestivalBasis,
    );

    const sourceIds = evidence["demand-index"].sourceDetails.map(
      (detail) => detail.sourceId,
    );
    const sourceNames = evidence["demand-index"].sourceDetails.map(
      (detail) => detail.sourceName,
    );

    expect(sourceIds).toEqual(
      expect.arrayContaining([
        "tourapi-selected-festival-basis",
        "tourapi-nearby-tourism-context",
        "trend-search-interest-correction",
        "regional-demand-backdata-summary",
        "user-demand-inputs",
      ]),
    );
    expect(sourceNames).toEqual(
      expect.arrayContaining([
        "주변 관광지 맥락",
        "검색 관심도 보정",
        "지역 수요 백데이터",
      ]),
    );
  });

  it("scopes user input evidence to fields used by each metric", () => {
    const evidence = createMetricEvidenceSet(
      sampleFestivalPlan,
      sampleForecastResult,
      sampleSimulationResult,
      sampleTourismContext,
      sampleTrendContext,
    );

    const userInputLabels = (metricId: keyof typeof evidence) =>
      evidence[metricId].sourceDetails
        .filter((item) => item.sourceType === "user-input")
        .flatMap((item) => item.calculationInputs?.map((field) => field.label) ?? []);

    expect(userInputLabels("budget-efficiency")).toEqual(["총 예산"]);
    expect(userInputLabels("economic-roi")).toEqual(["총 예산"]);
    expect(userInputLabels("commercial-spillover")).toEqual(["지역", "행사장"]);
    expect(userInputLabels("parking-occupancy")).toEqual([
      "수용 인원",
      "격자 크기",
      "시설 수",
    ]);
    expect(userInputLabels("demand-index")).toEqual([
      "지역",
      "기간",
      "주제 키워드",
      "총 예산",
      "수용 인원",
      "프로그램 매력도",
      "출입구 수",
    ]);
    expect(JSON.stringify(evidence["economic-roi"].sourceDetails)).toContain(
      "방문객 1인당 평균 소비",
    );
  });

  it("includes safe source details for sample, user-input, and derived values", () => {
    const evidence = createMetricEvidenceSet(
      sampleFestivalPlan,
      sampleForecastResult,
      sampleSimulationResult,
      sampleTourismContext,
      sampleTrendContext,
    );

    const demandEvidence = evidence["demand-index"];

    expect(demandEvidence.sourceDetails.map((item) => item.sourceType)).toContain("sample");
    expect(demandEvidence.sourceDetails.map((item) => item.sourceType)).toContain(
      "user-input",
    );
    expect(demandEvidence.sourceDetails.map((item) => item.sourceType)).toContain(
      "derived",
    );

    const serialized = JSON.stringify(demandEvidence.sourceDetails);

    expect(serialized).toContain("샘플 주변 관광지");
    expect(serialized).toContain("샘플 유사 축제");
    expect(serialized).toContain("백만원");
    expect(serialized).toContain("명");
    expect(serialized).not.toMatch(/諛깅쭔|紐|怨\?|異뺤|\uFFFD/);
    expect(serialized).not.toMatch(/serviceKey|clientSecret|Authorization|Cookie/i);
  });

  it("creates evidence for every persuasive dashboard metric", () => {
    const forecast = createForecast(
      sampleFestivalPlan,
      sampleTourismContext,
      sampleTrendContext,
    );
    const simulation = createSimulation(
      sampleFestivalPlan,
      forecast,
      forecast.peakHour,
    );

    const evidence = createMetricEvidenceSet(
      sampleFestivalPlan,
      forecast,
      simulation,
      sampleTourismContext,
      sampleTrendContext,
    );

    expect(Object.keys(evidence)).toEqual([
      "demand-index",
      "capacity-pressure",
      "peak-density",
      "budget-efficiency",
      "commercial-spillover",
      "safety-staff",
      "medical-staff",
      "traffic-risk",
      "parking-occupancy",
      "economic-roi",
      "infrastructure-capacity",
      "restroom-capacity",
      "waste-generation",
      "safety-guards-allocation",
      "evacuation-golden-time",
    ]);
    expect(evidence["demand-index"].title).toBe("흥행 가능성 점수");
    expect(evidence["demand-index"].dataSources).toContain(
      "TourAPI 주변 관광지 매력도",
    );
    expect(evidence["traffic-risk"].title).toBe("접근 교통 위험도");
    expect(evidence["economic-roi"].formulaSummary).toContain("예상 방문객");
  });

  it("marks sample fallback limitations clearly", () => {
    const tourism = {
      ...sampleTourismContext,
      provenance: {
        ...sampleTourismContext.provenance,
        sourceStatus: "sample-fallback" as const,
      },
    };
    const forecast = createForecast(
      sampleFestivalPlan,
      tourism,
      sampleTrendContext,
    );
    const simulation = createSimulation(
      sampleFestivalPlan,
      forecast,
      forecast.peakHour,
    );

    const evidence = createMetricEvidenceSet(
      sampleFestivalPlan,
      forecast,
      simulation,
      tourism,
      sampleTrendContext,
    );

    expect(evidence["demand-index"].confidenceLabel).toBe("낮음");
    expect(evidence["demand-index"].limitations.join(" ")).toContain("샘플");
  });

  it("creates compact report summaries from evidence", () => {
    const forecast = createForecast(
      sampleFestivalPlan,
      sampleTourismContext,
      sampleTrendContext,
    );
    const simulation = createSimulation(
      sampleFestivalPlan,
      forecast,
      forecast.peakHour,
    );
    const evidence = createMetricEvidenceSet(
      sampleFestivalPlan,
      forecast,
      simulation,
      sampleTourismContext,
      sampleTrendContext,
    );

    expect(createReportEvidenceSummaries(evidence)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "흥행 가능성 점수",
          confidenceLabel: expect.any(String),
        }),
      ]),
    );
  });
});
