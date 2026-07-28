import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import {
  clearScenarios,
  fetchServerScenarios,
  loadScenarios,
  saveScenario,
  saveServerScenario,
} from "./scenarioStorage";

const selectedFestivalBasis = {
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

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stores and loads festival planning scenarios", () => {
    const scenario = saveScenario(sampleFestivalPlan, 20);

    expect(scenario.name).toContain(sampleFestivalPlan.name);
    expect(scenario.selectedHour).toBe(20);
    expect(loadScenarios()).toHaveLength(1);
    expect(loadScenarios()[0].plan.totalBudgetMillionKrw).toBe(920);
  });

  it("stores and loads the selected TourAPI festival basis locally", () => {
    saveScenario(sampleFestivalPlan, 20, selectedFestivalBasis);

    expect(loadScenarios()[0].selectedFestivalBasis).toEqual(selectedFestivalBasis);
  });

  it("maps selected festival basis from server scenarios", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          scenarios: [
            {
              id: "scen_selected",
              title: "Selected scenario",
              created_at: "2026-07-28T00:00:00.000Z",
              share_token: "token_selected",
              parameters: {
                plan: sampleFestivalPlan,
                selectedHour: 20,
                selectedFestivalBasis,
              },
            },
          ],
        }),
      }),
    );

    const scenarios = await fetchServerScenarios();

    expect(scenarios[0].selectedFestivalBasis?.contentId).toBe("3439947");
  });

  it("persists selected festival basis in server scenario parameters", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "scen_created",
        title: "Created scenario",
        created_at: "2026-07-28T00:00:00.000Z",
        share_token: "token_created",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const scenario = await saveServerScenario(sampleFestivalPlan, 20, undefined, selectedFestivalBasis);
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));

    expect(body.parameters.selectedFestivalBasis).toEqual(selectedFestivalBasis);
    expect(scenario.selectedFestivalBasis?.contentId).toBe("3439947");
  });

  it("clears saved scenarios", () => {
    saveScenario(sampleFestivalPlan, 20);
    clearScenarios();

    expect(loadScenarios()).toEqual([]);
  });
});
