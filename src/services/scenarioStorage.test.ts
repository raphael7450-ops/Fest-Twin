import { beforeEach, describe, expect, it } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import type { SelectedFestivalBasis } from "../domain/types";
import {
  clearScenarios,
  loadScenarios,
  normalizeFestivalPlan,
  saveScenario,
} from "./scenarioStorage";

const selectedFestivalBasis: SelectedFestivalBasis = {
  contentId: "3439947",
  title: "Gangnam Media Winter Festa",
  address: "Seoul Gangnam-gu Yeongdong-daero 511",
  startDate: "2025-12-19",
  endDate: "2026-01-03",
  mapX: "127.0610512042",
  mapY: "37.5103955843",
  sourceName: "TourAPI selected festival candidate",
};

describe("scenarioStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores and loads festival planning scenarios", () => {
    const scenario = saveScenario(sampleFestivalPlan, 20);

    expect(scenario.name).toContain(sampleFestivalPlan.name);
    expect(scenario.selectedHour).toBe(20);
    expect(loadScenarios()).toHaveLength(1);
    expect(loadScenarios()[0].plan.totalBudgetMillionKrw).toBe(sampleFestivalPlan.totalBudgetMillionKrw);
  });

  it("stores and loads the selected TourAPI festival basis", () => {
    const scenario = saveScenario(sampleFestivalPlan, 20, selectedFestivalBasis);

    expect(scenario.selectedFestivalBasis).toEqual(selectedFestivalBasis);
    expect(loadScenarios()[0].selectedFestivalBasis).toEqual(selectedFestivalBasis);
  });

  it("clears saved scenarios", () => {
    saveScenario(sampleFestivalPlan, 20);
    clearScenarios();

    expect(loadScenarios()).toEqual([]);
  });

  it("keeps only finite venue coordinates within geographic bounds", () => {
    const validPlan = normalizeFestivalPlan({
      ...sampleFestivalPlan,
      venueCoordinates: { latitude: 37.5284, longitude: 126.9348, source: "tourapi" },
    });
    const invalidPlan = normalizeFestivalPlan({
      ...sampleFestivalPlan,
      venueCoordinates: { latitude: 91, longitude: 126.9348, source: "tourapi" },
    });
    const invalidLongitudePlan = normalizeFestivalPlan({
      ...sampleFestivalPlan,
      venueCoordinates: { latitude: 37.5284, longitude: 181, source: "tourapi" },
    });

    expect(validPlan.venueCoordinates).toEqual({
      latitude: 37.5284,
      longitude: 126.9348,
      source: "tourapi",
    });
    expect(invalidPlan.venueCoordinates).toBeUndefined();
    expect(invalidLongitudePlan.venueCoordinates).toBeUndefined();
  });

  it("keeps only finite positive venue measurements", () => {
    const plan = normalizeFestivalPlan({
      ...sampleFestivalPlan,
      venueAreaSquareMeters: 1200,
      totalExitWidthMeters: 0,
      evacuationDistanceMeters: Number.POSITIVE_INFINITY,
    });

    expect(plan.venueAreaSquareMeters).toBe(1200);
    expect(plan.totalExitWidthMeters).toBeUndefined();
    expect(plan.evacuationDistanceMeters).toBeUndefined();
  });
});
