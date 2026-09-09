import express from "express";
import { describe, expect, it } from "vitest";
import { createWeatherProxyRouter } from "./weatherProxy.js";
import { createTransitProxyRouter } from "./transitProxy.js";
import { createCommercialProxyRouter } from "./commercialProxy.js";
import { createEmergencyProxyRouter } from "./emergencyProxy.js";
import { normalizeCityParkPayload } from "./cityParkProxy.js";

describe("upstream data validity", () => {
  for (const [name, factory, path] of [
    ["weather", createWeatherProxyRouter, "/"],
    ["transit", createTransitProxyRouter, "/nearby-stops"],
    ["commercial", createCommercialProxyRouter, "/nearby-stores"],
    ["emergency", createEmergencyProxyRouter, "/nearby-facilities"],
  ] as const) {
    it.each([
      { response: { header: { resultCode: "30" }, body: { items: { item: [] } } } },
      { OpenAPI_ServiceResponse: { cmmMsgHeader: { returnReasonCode: "30" } } },
      { response: { header: { resultCode: "00" }, body: { items: { item: [] } } } },
    ])(`${name} never marks a business error or empty payload live: %j`, async (payload) => {
      const app = express();
      app.use(factory({ apiKey: "test-only", fetchImpl: async () => Response.json(payload) }));
      const server = app.listen(0, "127.0.0.1");
      await new Promise<void>((resolve) => server.once("listening", resolve));
      try {
        const address = server.address();
        if (!address || typeof address === "string") throw new Error("No TCP address");
        const response = await fetch(`http://127.0.0.1:${address.port}${path}`);
        const body = await response.json();
        expect(body.status).not.toBe("live");
        expect(body.provenance.sourceStatus).not.toBe("live");
      } finally {
        await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      }
    });
  }

  it("distinguishes park authentication errors from no data", () => {
    expect(() => normalizeCityParkPayload({ header: { resultCode: "30" } })).toThrow();
    expect(normalizeCityParkPayload({ header: { resultCode: "03" }, body: { items: [] } }))
      .toEqual({ items: [], totalCount: 0 });
  });
});
