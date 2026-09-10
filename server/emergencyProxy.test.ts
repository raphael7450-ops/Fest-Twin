import { describe, expect, it } from "vitest";
import { createEmergencyProxyRouter } from "./emergencyProxy.js";
import { createApp } from "./index.js";

async function withAppServer(app: ReturnType<typeof createApp>, callback: (baseUrl: string) => Promise<void>) {
  const server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Test server did not start on a TCP port");
  }

  try {
    await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

describe("server/emergencyProxy", () => {
  it("returns unavailable without fabricated emergency facilities when API key is missing", async () => {
    const dummyLimiter = (_req: any, _res: any, next: any) => next();
    const app = createApp({
      generalRateLimiter: dummyLimiter,
      openApiRateLimiter: dummyLimiter,
      emergencyApiKey: "",
      disableHttpLogging: true,
    });

    await withAppServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/emergency/nearby-facilities?lat=37.5283&lon=126.9347`);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.status).toBe("unavailable");
      expect(body.observations).toEqual([]);
    });
  });

  it("parses live emergency facilities response when mock fetch returns items", async () => {
    const mockFetch = (async () =>
      new Response(
        JSON.stringify({
          response: {
            header: { resultCode: "00" },
            body: {
              items: {
                item: [
                  { dutyName: "강남세브란스병원", dutyDivName: "권역응급센터", latitude: 37.5101, longitude: 127.0601 },
                ],
              },
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      )) as typeof fetch;

    const dummyLimiter = (_req: any, _res: any, next: any) => next();
    const app = createApp({
      generalRateLimiter: dummyLimiter,
      openApiRateLimiter: dummyLimiter,
      emergencyApiKey: "mock-emergency-key",
      fetchImpl: mockFetch,
      disableHttpLogging: true,
    });

    await withAppServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/emergency/nearby-facilities?lat=37.51&lon=127.06`);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.status).toBe("live");
      expect(body).not.toHaveProperty("goldenTimeMinutes");
      expect(body.observations[0].name).toBe("강남세브란스병원");
    });
  });
});
