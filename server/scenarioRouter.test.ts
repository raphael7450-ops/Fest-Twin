import { beforeEach, describe, expect, it } from "vitest";
import express from "express";
import { createScenarioRouter } from "./scenarioRouter.js";

describe("server/scenarioRouter", () => {
  let mockScenarios: any[] = [];
  let nextId = 1;
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

  const mockDb = {
    getAllScenarios: () => [...mockScenarios],
    getScenarioById: (id: string) => mockScenarios.find((s) => s.id === id) ?? null,
    getScenarioByShareToken: (token: string) => mockScenarios.find((s) => s.share_token === token) ?? null,
    createScenario: (data: any) => {
      const created = {
        id: `scen_${nextId++}`,
        title: data.title ?? "Untitled",
        description: data.description ?? "",
        parameters: data.parameters,
        results_summary: data.results_summary ?? {},
        share_token: `tok_test_${nextId}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockScenarios.push(created);
      return created;
    },
    updateScenario: (id: string, data: any) => {
      const index = mockScenarios.findIndex((s) => s.id === id);
      if (index === -1) return null;
      mockScenarios[index] = {
        ...mockScenarios[index],
        title: data.title ?? mockScenarios[index].title,
        description: data.description ?? mockScenarios[index].description,
        updated_at: new Date().toISOString(),
      };
      return mockScenarios[index];
    },
    deleteScenario: (id: string) => {
      const index = mockScenarios.findIndex((s) => s.id === id);
      if (index === -1) return false;
      mockScenarios.splice(index, 1);
      return true;
    },
  };

  beforeEach(() => {
    mockScenarios = [
      {
        id: "scen_1",
        title: "Test Scenario 1",
        description: "Desc 1",
        parameters: { selectedHour: 15, selectedFestivalBasis },
        share_token: "token_share_1",
        created_at: "2026-07-24T10:00:00.000Z",
      },
    ];
  });

  const callRoute = (method: string, path: string, body?: any) => {
    const router = createScenarioRouter({ db: mockDb as any });
    const app = express();
    app.use("/api/scenarios", router);

    let status = 200;
    let jsonBody: any = null;

    const req: any = {
      method,
      url: `/api/scenarios${path}`,
      headers: { "content-type": "application/json" },
      body,
    };

    const res: any = {
      setHeader() {},
      status(code: number) {
        status = code;
        return res;
      },
      json(data: any) {
        jsonBody = data;
        return res;
      },
    };

    app(req, res, () => {});

    return { status, jsonBody };
  };

  it("GET /api/scenarios - fetches scenario list", () => {
    const res = callRoute("GET", "/");
    expect(res.status).toBe(200);
    expect(res.jsonBody.count).toBe(1);
    expect(res.jsonBody.scenarios[0].id).toBe("scen_1");
  });

  it("GET /api/scenarios/:id - fetches scenario detail", () => {
    const res = callRoute("GET", "/scen_1");
    expect(res.status).toBe(200);
    expect(res.jsonBody.title).toBe("Test Scenario 1");
  });

  it("GET /api/scenarios/share/:token - fetches scenario by share token", () => {
    const res = callRoute("GET", "/share/token_share_1");
    expect(res.status).toBe(200);
    expect(res.jsonBody.id).toBe("scen_1");
    expect(res.jsonBody.parameters.selectedFestivalBasis.contentId).toBe("3439947");
  });

  it("POST /api/scenarios - creates a new scenario with share_token", () => {
    const res = callRoute("POST", "/", {
      title: "New Festival Plan",
      parameters: { selectedHour: 20, selectedFestivalBasis },
    });
    expect(res.status).toBe(201);
    expect(res.jsonBody.title).toBe("New Festival Plan");
    expect(res.jsonBody.share_token).toBeDefined();
    expect(res.jsonBody.parameters.selectedFestivalBasis.contentId).toBe("3439947");
  });

  it("DELETE /api/scenarios/:id - deletes existing scenario", () => {
    const res = callRoute("DELETE", "/scen_1");
    expect(res.status).toBe(200);
    expect(res.jsonBody.success).toBe(true);
    expect(mockScenarios.length).toBe(0);
  });
});
