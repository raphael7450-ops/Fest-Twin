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

describe("metricEvidence", () => {
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
