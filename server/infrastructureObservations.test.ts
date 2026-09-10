import express from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearCache } from "./cache.js";
import { createTransitProxyRouter } from "./transitProxy.js";
import { createCommercialProxyRouter } from "./commercialProxy.js";
import { createEmergencyProxyRouter } from "./emergencyProxy.js";

beforeEach(clearCache);
const cases = [
  { name: "transit", factory: createTransitProxyRouter, path: "/nearby-stops", row: { nodenm: "Observed stop", nodeid: "1", gpslati: 37.576, gpslong: 126.977 } },
  { name: "commercial", factory: createCommercialProxyRouter, path: "/nearby-stores", row: { bizesNm: "Observed store", bizesId: "2", indsLclsNm: "소매", lat: 37.576, lon: 126.977 } },
  { name: "emergency", factory: createEmergencyProxyRouter, path: "/nearby-facilities", row: { dutyName: "Observed hospital", hpid: "3", latitude: 37.576, longitude: 126.977 } },
] as const;

async function request(testCase: typeof cases[number], payload: unknown, coordinates = "lat=37.5759&lon=126.9768") {
  const fetchImpl = vi.fn(async () => Response.json(payload));
  const app = express();
  app.use(testCase.factory({ apiKey: "test", fetchImpl }));
  const server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No TCP address");
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${testCase.path}?${coordinates}`);
    return { status: response.status, body: await response.json(), fetchImpl };
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

describe.each(cases)("$name observed infrastructure", (testCase) => {
  it("returns verified observations without invented scores or multipliers", async () => {
    const { body } = await request(testCase, { response: { header: { resultCode: "00" }, body: { totalCount: 100, items: { item: [testCase.row] } } } });
    expect(body.status).toBe("live");
    expect(body.observations).toHaveLength(1);
    expect(body.observations[0].name).toContain("Observed");
    expect(body.observations[0].distanceMeters).toBeGreaterThan(0);
    expect(body.providerTotalCount).toBe(100);
    expect(body).not.toHaveProperty("readinessScore");
    expect(body).not.toHaveProperty("goldenTimeMinutes");
    expect(body).not.toHaveProperty("commercialDensityScore");
    expect(body).not.toHaveProperty("totalRouteCount");
    expect(body).not.toHaveProperty("accessibilityScore");
  });
  it("keeps a genuine empty result empty rather than generating facilities", async () => {
    const { body } = await request(testCase, { response: { header: { resultCode: "00" }, body: { totalCount: 0, items: "" } } });
    expect(body.status).toBe("empty");
    expect(body.observations).toEqual([]);
  });
  it("does not query with missing or invalid coordinates", async () => {
    const { status, fetchImpl } = await request(testCase, {}, "lat=bad&lon=126");
    expect(status).toBe(400);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("rejects geographic mismatches instead of claiming an observed zero", async () => {
    const { body } = await request(testCase, { response: { header: { resultCode: "00" }, body: { items: { item: [testCase.row] } } } }, "lat=35.15&lon=129.11");
    expect(body.status).toBe("unavailable");
    expect(body.observations).toEqual([]);
  });
});
