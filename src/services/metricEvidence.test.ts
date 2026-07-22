import { describe, expect, it } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
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
  it("separates user input and derived calculation evidence for budget and ROI metrics", () => {
    const evidence = createMetricEvidenceSet(
      sampleFestivalPlan,
      sampleForecastResult,
      sampleSimulationResult,
      sampleTourismContext,
      sampleTrendContext,
    );

    const budgetDetails = evidence["budget-efficiency"].sourceDetails;
    const roiDetails = evidence["economic-roi"].sourceDetails;

    expect(budgetDetails.some((item) => item.sourceType === "user-input")).toBe(true);
    expect(budgetDetails.some((item) => item.sourceType === "derived")).toBe(true);
    expect(roiDetails.some((item) => item.sourceName.includes("ROI"))).toBe(true);
    expect(JSON.stringify(roiDetails)).toContain("諛⑸Ц媛?1?몃떦 ?됯퇏 ?뚮퉬");
  });

  it("includes safe source details for public-data, user-input, and derived values", () => {
    const evidence = createMetricEvidenceSet(
      sampleFestivalPlan,
      sampleForecastResult,
      sampleSimulationResult,
      sampleTourismContext,
      sampleTrendContext,
    );

    const demandEvidence = evidence["demand-index"];

    expect(demandEvidence.sourceDetails.map((item) => item.sourceType)).toContain(
      "tourapi",
    );
    expect(demandEvidence.sourceDetails.map((item) => item.sourceType)).toContain(
      "user-input",
    );
    expect(demandEvidence.sourceDetails.map((item) => item.sourceType)).toContain(
      "derived",
    );

    const serialized = JSON.stringify(demandEvidence.sourceDetails);

    expect(serialized).toContain("contentid");
    expect(serialized).toContain("eventstartdate");
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
