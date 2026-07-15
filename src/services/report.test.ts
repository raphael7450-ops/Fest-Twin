import { describe, expect, it } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import { sampleTourismContext } from "../data/sampleTourApi";
import { sampleTrendContext } from "../data/sampleTrends";
import { createForecast } from "./forecast";
import { createPlanningReport } from "./report";
import { createSimulation } from "./simulation";

describe("createPlanningReport", () => {
  it("creates a government review note and practical recommendations", () => {
    const forecast = createForecast(
      sampleFestivalPlan,
      sampleTourismContext,
      sampleTrendContext,
    );
    const simulation = createSimulation(sampleFestivalPlan, forecast, forecast.peakHour);
    const report = createPlanningReport(sampleFestivalPlan, forecast, simulation);

    expect(report.summary).toContain("한강 일상문화축제");
    expect(report.governmentReviewNote).toContain("예산 집행 전");
    expect(report.recommendations.length).toBeGreaterThanOrEqual(4);
  });
});
