import { describe, expect, it } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import { sampleTourismContext } from "../data/sampleTourApi";
import type { DemandBackdataContext, ForecastResult, SimulationResult } from "../domain/types";
import {
  calculatePeakDensityPerSquareMeter,
  createSummaryKpiMetrics,
} from "./impactMetrics";

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

function simulationWithPeakDensity(density: number): SimulationResult {
  return {
    hour: 20,
    congestionScore: density,
    bottlenecks: [],
    cells: [
      { x: 0, y: 0, density, level: density >= 85 ? "critical" : "high" },
    ],
  };
}

describe("createSummaryKpiMetrics", () => {
  it("keeps demand index responsive above the previous 145 percent cap", () => {
    const cappedLikeForecast = {
      ...baseForecast,
      expectedVisitors: Math.round(sampleFestivalPlan.expectedCapacity * 1.45),
    };
    const largerForecast = {
      ...baseForecast,
      expectedVisitors: Math.round(sampleFestivalPlan.expectedCapacity * 2.1),
    };

    const cappedLikeMetrics = createSummaryKpiMetrics(
      sampleFestivalPlan,
      cappedLikeForecast,
      simulationWithPeakDensity(100),
      sampleTourismContext,
    );
    const largerMetrics = createSummaryKpiMetrics(
      sampleFestivalPlan,
      largerForecast,
      simulationWithPeakDensity(100),
      sampleTourismContext,
    );

    expect(cappedLikeMetrics.demandIndex.percent).toBe(145);
    expect(largerMetrics.demandIndex.percent).toBe(210);
  });

  it("keeps peak density responsive above the previous 6.2 people per square meter cap", () => {
    expect(calculatePeakDensityPerSquareMeter(simulationWithPeakDensity(100))).toBe(6.2);
    expect(calculatePeakDensityPerSquareMeter(simulationWithPeakDensity(125))).toBe(7.8);
  });

  it("reflects regional festival DB visitors and budget in all top KPI metrics", () => {
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
      expectedCapacity: 300000,
      totalBudgetMillionKrw: 3500,
    };
    const forecast = {
      ...baseForecast,
      expectedVisitors: 90000,
    };

    const withoutDb = createSummaryKpiMetrics(
      plan,
      forecast,
      simulationWithPeakDensity(80),
      sampleTourismContext,
    );
    const withDb = createSummaryKpiMetrics(
      plan,
      forecast,
      simulationWithPeakDensity(80),
      sampleTourismContext,
      dbContext,
    );

    expect(withDb.demandIndex.percent).toBeGreaterThan(withoutDb.demandIndex.percent);
    expect(withDb.peakDensity.peoplePerSquareMeter).toBeGreaterThan(
      withoutDb.peakDensity.peoplePerSquareMeter,
    );
    expect(withDb.budgetEfficiency.costPerVisitorKrw).not.toBe(
      withoutDb.budgetEfficiency.costPerVisitorKrw,
    );
    expect(withDb.spillover.nearbyInflowRate).toBeGreaterThan(withoutDb.spillover.nearbyInflowRate);
  });
});
