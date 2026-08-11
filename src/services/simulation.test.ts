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
    expect(simulation.bottlenecks[0].reason).toContain("상대 혼잡 점수");
    expect(
      simulation.cells.every(
        (cell) => cell.relativeDensityScore >= 0 && cell.relativeDensityScore <= 100,
      ),
    ).toBe(true);
    expect(simulation.cells.some((cell) => "density" in cell)).toBe(false);
  });
});
