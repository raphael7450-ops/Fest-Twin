import { beforeEach, describe, expect, it } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import {
  clearScenarios,
  loadScenarios,
  saveScenario,
} from "./scenarioStorage";

describe("scenarioStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores and loads festival planning scenarios", () => {
    const scenario = saveScenario(sampleFestivalPlan, 20);

    expect(scenario.name).toContain(sampleFestivalPlan.name);
    expect(scenario.selectedHour).toBe(20);
    expect(loadScenarios()).toHaveLength(1);
    expect(loadScenarios()[0].plan.totalBudgetMillionKrw).toBe(850);
  });

  it("clears saved scenarios", () => {
    saveScenario(sampleFestivalPlan, 20);
    clearScenarios();

    expect(loadScenarios()).toEqual([]);
  });
});
