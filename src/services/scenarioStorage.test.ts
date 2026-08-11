import { beforeEach, describe, expect, it } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import type { SelectedFestivalBasis } from "../domain/types";
import {
  clearScenarios,
  loadScenarios,
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
});
