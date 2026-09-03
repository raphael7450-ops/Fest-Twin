import { describe, expect, it } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import { sampleTourismContext } from "../data/sampleTourApi";
import { sampleTrendContext } from "../data/sampleTrends";
import type { ForecastResult } from "../domain/types";
import { createForecast } from "./forecast";
import { createSimulation } from "./simulation";

const dwellForecast: ForecastResult = {
  expectedVisitors: 6000,
  visitorsByHour: [
    { hour: 18, visitors: 4000 },
    { hour: 20, visitors: 2000 },
  ],
  occupancyByHour: [
    { hour: 18, visitors: 4000 },
    { hour: 20, visitors: 6000 },
  ],
  peakHour: 20,
  successScore: 84,
  confidence: "medium",
  reasons: [],
};

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

  it("uses concurrent occupancy instead of arrival counts for hourly congestion", () => {
    const plan = { ...sampleFestivalPlan, expectedCapacity: 10000 };
    const atArrivalPeak = createSimulation(plan, dwellForecast, 18);
    const atOccupancyPeak = createSimulation(plan, dwellForecast, 20);

    expect(atOccupancyPeak.congestionScore).toBeGreaterThan(atArrivalPeak.congestionScore);
  });

  it("calculates physical crowd density based on real venue area", () => {
    const largePlan = { ...sampleFestivalPlan, venueAreaSquareMeters: 60000 };
    const smallPlan = { ...sampleFestivalPlan, venueAreaSquareMeters: 10000 };

    const largeSim = createSimulation(largePlan, dwellForecast, 20);
    const smallSim = createSimulation(smallPlan, dwellForecast, 20);

    expect(largeSim.maxDensityPerSqm).toBeDefined();
    expect(smallSim.maxDensityPerSqm).toBeDefined();
    // 면적이 좁을수록 군중 밀도(명/m²)가 비례하여 훨씬 높아져야 함
    expect(smallSim.maxDensityPerSqm!).toBeGreaterThan(largeSim.maxDensityPerSqm!);
    expect(smallSim.cellAreaSquareMeters).toBeLessThan(largeSim.cellAreaSquareMeters!);
  });
});
