import { describe, expect, it } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import { sampleTourismContext } from "../data/sampleTourApi";
import { sampleTrendContext } from "../data/sampleTrends";
import { sampleSpendingContext } from "../data/sampleSpending";
import type { ForecastResult, SimulationResult } from "../domain/types";
import { createForecast } from "./forecast";
import { createEconomicImpactMetrics, createLogisticsMetrics } from "./impactMetrics";

const sampleForecastResult = createForecast(
  sampleFestivalPlan,
  sampleTourismContext,
  sampleTrendContext,
);

describe("createEconomicImpactMetrics", () => {
  it("uses tourism spending backdata instead of a fixed average spend constant", () => {
    const metrics = createEconomicImpactMetrics(
      sampleFestivalPlan,
      sampleForecastResult,
      sampleSpendingContext,
    );

    expect(metrics.averageSpendPerVisitorKrw).toBe(58_400);
    expect(metrics.averageSpendPerVisitorKrw).not.toBe(62_000);
    expect(metrics.spendingBasisLabel).toBe("지역 관광 소비 강도 기반");
    expect(metrics.spendingSourceName).toContain("한국관광공사");
    expect(metrics.expectedLocalSpendingKrw).toBe(
      sampleForecastResult.expectedVisitors * sampleSpendingContext.averageSpendPerVisitorKrw,
    );
  });

  it("uses concurrent occupancy for parking demand", () => {
    const arrivalsByHour = [
      { hour: 18, visitors: 4000 },
      { hour: 20, visitors: 2000 },
    ];
    const arrivalOnlyForecast: ForecastResult = {
      expectedVisitors: 6000,
      visitorsByHour: arrivalsByHour,
      peakHour: 18,
      successScore: 84,
      confidence: "medium",
      reasons: [],
    };
    const dwellForecast: ForecastResult = {
      ...arrivalOnlyForecast,
      occupancyByHour: [
        { hour: 18, visitors: 4000 },
        { hour: 20, visitors: 6000 },
      ],
      peakHour: 20,
    };
    const simulation: SimulationResult = {
      hour: 20,
      congestionScore: 0,
      cells: [],
      bottlenecks: [],
    };

    const arrivalOnly = createLogisticsMetrics(
      sampleFestivalPlan,
      arrivalOnlyForecast,
      simulation,
    );
    const dwell = createLogisticsMetrics(sampleFestivalPlan, dwellForecast, simulation);

    expect(dwell.parkingBaseOccupancyRate).toBeGreaterThan(
      arrivalOnly.parkingBaseOccupancyRate,
    );
  });
});
