import { describe, expect, it } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import { sampleTourismContext } from "../data/sampleTourApi";
import { sampleTrendContext } from "../data/sampleTrends";
import { sampleSpendingContext } from "../data/sampleSpending";
import { createForecast } from "./forecast";
import { createEconomicImpactMetrics } from "./impactMetrics";

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
});
