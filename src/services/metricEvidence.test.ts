import { describe, expect, it } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import { sampleDemandBackdataContext } from "../data/sampleDemandBackdata";
import { sampleSpendingContext } from "../data/sampleSpending";
import { sampleTrafficContext } from "../data/sampleTraffic";
import { sampleTourismContext } from "../data/sampleTourApi";
import { sampleTrendContext } from "../data/sampleTrends";
import { createForecast } from "./forecast";
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

describe("metricEvidence", () => {
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
      "peak-density",
      "budget-efficiency",
      "commercial-spillover",
      "safety-staff",
      "medical-staff",
      "parking-occupancy",
      "economic-roi",
    ]);
    expect(evidence["demand-index"].title).toBe("흥행 예측 지수");
    expect(evidence["demand-index"].dataSources).toContain(
      "TourAPI 주변 관광지 매력도",
    );
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
          title: "흥행 예측 지수",
          confidenceLabel: expect.any(String),
        }),
      ]),
    );
  });
});
