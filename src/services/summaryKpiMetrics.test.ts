import { describe, expect, it } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import { sampleTourismContext } from "../data/sampleTourApi";
import type { DemandBackdataContext, ForecastResult, SimulationResult } from "../domain/types";
import { createSummaryKpiMetrics } from "./impactMetrics";

const baseForecast: ForecastResult = {
  expectedVisitors: 52000,
  peakHour: 20,
  successScore: 82,
  confidence: "medium",
  reasons: [],
  visitorsByHour: [
    { hour: 18, visitors: 18000 },
    { hour: 20, visitors: 24000 },
  ],
};

function simulationWithRelativeScore(relativeDensityScore: number): SimulationResult {
  return {
    hour: 20,
    congestionScore: relativeDensityScore,
    bottlenecks: [],
    cells: [
      {
        x: 0,
        y: 0,
        relativeDensityScore,
        level: relativeDensityScore >= 85 ? "critical" : "high",
      },
    ],
  };
}

describe("createSummaryKpiMetrics", () => {
  it("separates bounded success potential from uncapped capacity pressure", () => {
    const forecast = {
      ...baseForecast,
      expectedVisitors: 240_000,
      successScore: 78,
    };
    const plan = { ...sampleFestivalPlan, expectedCapacity: 120_000 };

    const metrics = createSummaryKpiMetrics(
      plan,
      forecast,
      simulationWithRelativeScore(100),
      sampleTourismContext,
    );

    expect(metrics.successPotential).toMatchObject({ score: 78, grade: "중" });
    expect(metrics.capacityPressure).toEqual({
      ratio: 2,
      displayPercent: 200,
      status: "over",
    });
  });

  it("clamps success potential inputs below zero and above one hundred", () => {
    const simulation = simulationWithRelativeScore(80);

    expect(
      createSummaryKpiMetrics(
        sampleFestivalPlan,
        { ...baseForecast, successScore: -12 },
        simulation,
        sampleTourismContext,
      ).successPotential.score,
    ).toBe(0);
    expect(
      createSummaryKpiMetrics(
        sampleFestivalPlan,
        { ...baseForecast, successScore: 132 },
        simulation,
        sampleTourismContext,
      ).successPotential.score,
    ).toBe(100);
  });

  it("uses the selected plan capacity even when similar festivals have different attendance", () => {
    const dbContext: DemandBackdataContext = {
      status: "file-normalized",
      similarFestivalBaselines: [
        {
          id: "mcst-boryeong-mud-2026",
          name: "제29회 보령머드축제",
          region: "충청남도 보령시",
          type: "문화예술",
          periodLabel: "2026-07-24 ~ 2026-08-09",
          budgetMillionKrw: 3500,
          visitors: 1690359,
          similarityScore: 100,
          sourceName: "문화체육관광부_지역축제 정보",
        },
      ],
      sourceDetails: [],
    };
    const plan = {
      ...sampleFestivalPlan,
      expectedCapacity: 120000,
      totalBudgetMillionKrw: 3500,
    };
    const forecast = {
      ...baseForecast,
      expectedVisitors: 240000,
    };

    const withDb = createSummaryKpiMetrics(
      plan,
      forecast,
      simulationWithRelativeScore(80),
      sampleTourismContext,
      dbContext,
    );

    expect(withDb.capacityPressure).toMatchObject({ ratio: 2, displayPercent: 200 });
  });

  it("guards zero capacity and uses deterministic pressure status boundaries", () => {
    const plan = { ...sampleFestivalPlan, expectedCapacity: 0 };
    const simulation = simulationWithRelativeScore(80);

    expect(
      createSummaryKpiMetrics(
        plan,
        { ...baseForecast, expectedVisitors: 240000 },
        simulation,
        sampleTourismContext,
      ).capacityPressure,
    ).toEqual({ ratio: 240000, displayPercent: 24000000, status: "over" });

    for (const [expectedVisitors, status] of [
      [85_000, "within"],
      [85_001, "caution"],
      [100_000, "caution"],
      [100_001, "over"],
    ] as const) {
      expect(
        createSummaryKpiMetrics(
          { ...sampleFestivalPlan, expectedCapacity: 100_000 },
          { ...baseForecast, expectedVisitors },
          simulation,
          sampleTourismContext,
        ).capacityPressure.status,
      ).toBe(status);
    }
  });
});
