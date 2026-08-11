import { describe, expect, it } from "vitest";
import {
  validatePublicRoot,
  validateScenarioDetail,
  validateScenarioList,
  validateSharedScenario,
  validateTourAreaCode,
} from "./deploy-check.js";

function result(endpoint, statusCode, body) {
  return {
    endpoint,
    statusCode,
    headers: {},
    body: typeof body === "string" ? body : JSON.stringify(body),
    bytes: typeof body === "string" ? body.length : JSON.stringify(body).length,
  };
}

describe("deploy-check validation gates", () => {
  it("validates public root and referenced static assets", async () => {
    const html = `
      <div id="root"></div>
      <script type="module" src="/assets/index-demo.js"></script>
      <link rel="stylesheet" href="/assets/index-demo.css">
    `;
    const requests = [];
    const request = async (endpoint) => {
      requests.push(endpoint);
      return result(endpoint, 200, "asset-body");
    };

    await expect(validatePublicRoot(result("/", 200, html), request)).resolves.toContain(
      "static bundle",
    );
    expect(requests).toEqual(["/assets/index-demo.js", "/assets/index-demo.css"]);
  });

  it("accepts a live TourAPI proxy payload", () => {
    const payload = {
      response: {
        header: { resultCode: "0000", resultMsg: "OK" },
        body: { items: { item: [] } },
      },
    };

    expect(validateTourAreaCode(result("/api/tour/area-code", 200, payload))).toContain(
      "resultCode 0000",
    );
  });

  it("accepts explicit TourAPI fallback-compatible errors", () => {
    const payload = {
      error: { code: "TOUR_API_UPSTREAM_ERROR", message: "TourAPI upstream request failed." },
    };

    expect(validateTourAreaCode(result("/api/tour/area-code", 502, payload))).toContain(
      "fallback-compatible",
    );
  });

  it("validates scenario endpoints and legacy selected-festival fallback state", () => {
    const scenarios = [{ id: "scen_sample_01" }];
    expect(validateScenarioList(result("/api/scenarios", 200, { scenarios, count: 1 }))).toContain(
      "1 scenario",
    );

    const scenario = {
      id: "scen_sample_01",
      share_token: "token_seoul_fireworks_2026",
      parameters: {
        selectedHour: 20,
        plan: { name: "2026 서울세계불꽃축제" },
      },
    };

    expect(validateScenarioDetail(result("/api/scenarios/scen_sample_01", 200, scenario))).toContain(
      "restores plan",
    );
    expect(
      validateSharedScenario(result("/api/scenarios/share/token_seoul_fireworks_2026", 200, scenario)),
    ).toContain("legacy scenario fallback-compatible");
  });
});
