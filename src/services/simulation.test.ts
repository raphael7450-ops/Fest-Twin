import { describe, expect, it } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import { sampleTourismContext } from "../data/sampleTourApi";
import { sampleTrendContext } from "../data/sampleTrends";
import { createForecast } from "./forecast";
import { createSimulation } from "./simulation";

describe("createSimulation", () => {
  it("creates heatmap cells and bottlenecks for safety diagnosis", () => {
    const forecast = createForecast(
      sampleFestivalPlan,
      sampleTourismContext,
      sampleTrendContext,
    );
    const simulation = createSimulation(sampleFestivalPlan, forecast, forecast.peakHour);

    expect(simulation.cells).toHaveLength(
      sampleFestivalPlan.gridWidth * sampleFestivalPlan.gridHeight,
    );
    expect(simulation.bottlenecks.length).toBeGreaterThan(0);
    expect(simulation.bottlenecks[0].reason).toContain("밀집도");
  });
});
