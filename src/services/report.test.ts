import { describe, expect, it } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import { sampleTourismContext } from "../data/sampleTourApi";
import { sampleTrendContext } from "../data/sampleTrends";
import type { ForecastResult } from "../domain/types";
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

    expect(report.summary).toContain("2026 서울세계불꽃축제");
    expect(report.governmentReviewNote).toContain("예산 집행 전");
    expect(report.recommendations.length).toBeGreaterThanOrEqual(4);
  });

  it("keeps success potential bounded and reports capacity pressure separately", () => {
    const plan = { ...sampleFestivalPlan, expectedCapacity: 120_000 };
    const forecast: ForecastResult = {
      expectedVisitors: 240_000,
      visitorsByHour: [{ hour: 20, visitors: 120_000 }],
      peakHour: 20,
      successScore: 132,
      confidence: "medium",
      reasons: [],
    };
    const simulation = createSimulation(plan, forecast, forecast.peakHour);

    const report = createPlanningReport(plan, forecast, simulation);

    expect(report.scores[0]).toMatchObject({ label: "흥행 가능성", score: 100 });
    expect(report.findings).toContain("수용 정원률 200%로 정원 초과가 예상됩니다.");
  });
});
