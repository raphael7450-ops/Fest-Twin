import { describe, expect, it } from "vitest";
import { sampleFestivalPlan } from "../src/data/sampleFestivalPlan";
import { sampleSpendingContext } from "../src/data/sampleSpending";
import { sampleTourismContext } from "../src/data/sampleTourApi";
import { sampleTrendContext } from "../src/data/sampleTrends";
import type { ForecastResult } from "../src/domain/types";
import { createForecast } from "../src/services/forecast";
import { createEconomicImpactMetrics } from "../src/services/impactMetrics";
import { createMetricEvidenceSet } from "../src/services/metricEvidence";
import { createSafetyDecisionProfiles } from "../src/services/safetyDecisionMetrics";
import { createSimulation } from "../src/services/simulation";

function expectFiniteNonNegative(value: number) {
  expect(Number.isFinite(value)).toBe(true);
  expect(value).toBeGreaterThanOrEqual(0);
}

describe("Data Reliability & Evidence Auditor sanity checks", () => {
  it("normalizes invalid forecast inputs so visitor outputs remain finite and non-negative", () => {
    const invalidPlan = {
      ...sampleFestivalPlan,
      operatingHours: [],
      totalBudgetMillionKrw: -920,
      expectedCapacity: -36000,
      programs: sampleFestivalPlan.programs.map((program) => ({
        ...program,
        expectedDraw: Number.NaN,
      })),
    };

    const forecast = createForecast(invalidPlan, sampleTourismContext, sampleTrendContext);

    expectFiniteNonNegative(forecast.expectedVisitors);
    expect(forecast.expectedVisitors).toBeGreaterThanOrEqual(5000);
    expect(forecast.visitorsByHour.length).toBeGreaterThan(0);
    for (const hourly of forecast.visitorsByHour) {
      expect(Number.isFinite(hourly.hour)).toBe(true);
      expectFiniteNonNegative(hourly.visitors);
    }
  });

  it("keeps relative simulation scores bounded and physical density unavailable for zero-area layouts", () => {
    const invalidPlan = {
      ...sampleFestivalPlan,
      gridWidth: 0,
      gridHeight: 0,
      expectedCapacity: 0,
      venueAreaSquareMeters: undefined,
      venueAreaProvenance: undefined,
    };
    const forecast: ForecastResult = {
      expectedVisitors: 1_000_000,
      visitorsByHour: [{ hour: 20, visitors: 1_000_000 }],
      peakHour: 20,
      successScore: 100,
      confidence: "medium",
      reasons: [],
    };

    const simulation = createSimulation(invalidPlan, forecast, 20);
    const safety = createSafetyDecisionProfiles(invalidPlan, forecast, simulation).summary;

    expect(simulation.cells.length).toBeGreaterThan(0);
    expectFiniteNonNegative(simulation.congestionScore);
    expect(simulation.cells.every((cell) => cell.relativeDensityScore <= 100)).toBe(true);
    expect(safety.peakDensity).toMatchObject({
      status: "unavailable",
      unit: "people_per_square_meter",
    });
  });

  it("clamps economic impact values when budget, visitors, or spending inputs are invalid", () => {
    const invalidForecast: ForecastResult = {
      expectedVisitors: -30000,
      visitorsByHour: [{ hour: 18, visitors: -12000 }],
      peakHour: 18,
      successScore: 0,
      confidence: "low",
      reasons: [],
    };
    const invalidSpending = {
      ...sampleSpendingContext,
      averageSpendPerVisitorKrw: -58400,
    };

    const metrics = createEconomicImpactMetrics(
      { ...sampleFestivalPlan, totalBudgetMillionKrw: -1 },
      invalidForecast,
      invalidSpending,
    );

    expectFiniteNonNegative(metrics.totalBudgetKrw);
    expectFiniteNonNegative(metrics.averageSpendPerVisitorKrw);
    expectFiniteNonNegative(metrics.expectedLocalSpendingKrw);
    expectFiniteNonNegative(metrics.roiMultiplier);
  });

  it("keeps economic ROI evidence formulas mathematically aligned with displayed values", () => {
    const forecast = createForecast(sampleFestivalPlan, sampleTourismContext, sampleTrendContext);
    const simulation = createSimulation(sampleFestivalPlan, forecast, forecast.peakHour);
    const evidence = createMetricEvidenceSet(
      sampleFestivalPlan,
      forecast,
      simulation,
      sampleTourismContext,
      sampleTrendContext,
      undefined,
      sampleSpendingContext,
    );
    const economy = createEconomicImpactMetrics(sampleFestivalPlan, forecast, sampleSpendingContext);
    const roiSteps = evidence["economic-roi"].calculationSteps ?? [];

    expect(roiSteps[2].subtotal).toBe(
      `${economy.expectedLocalSpendingKrw.toLocaleString("ko-KR")}원`,
    );
    expect(roiSteps[2].formula).not.toContain("상권 연계율");
    expect(roiSteps[2].coefficient).not.toContain("85%");
    expect(roiSteps[3].subtotal).toBe(`${economy.roiMultiplier.toFixed(1)}배 창출 예상`);
  });
});
