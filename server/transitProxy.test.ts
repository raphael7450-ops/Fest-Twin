import { describe, expect, it } from "vitest";
import { createTransitProxyRouter } from "./transitProxy.js";
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

describe("server/transitProxy", () => {
  it("returns sample-fallback transit response when API key is missing", async () => {
    const dummyLimiter = (_req: any, _res: any, next: any) => next();
    const app = createApp({
      generalRateLimiter: dummyLimiter,
      openApiRateLimiter: dummyLimiter,
      publicTransitApiKey: "",
      disableHttpLogging: true,
    });

    await withAppServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/transit/nearby-stops?lat=37.51&lon=127.06`);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.status).toBe("sample-fallback");
      expect(body.accessibilityScore).toBeGreaterThan(50);
      expect(body.stops.length).toBeGreaterThan(0);
    });
  });

  it("parses live TAGO transit response when fetch returns items", async () => {
    const mockFetch = (async () =>
      new Response(
        JSON.stringify({
          response: {
            body: {
              items: {
                item: [
                  { nodenm: "강남역 정류장", distance: "120" },
                  { nodenm: "COEX 정류장", distance: "240" },
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
      publicTransitApiKey: "mock-transit-key",
      fetchImpl: mockFetch,
      disableHttpLogging: true,
    });

    await withAppServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/transit/nearby-stops?lat=37.51&lon=127.06`);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.status).toBe("live");
      expect(body.accessibilityScore).toBeGreaterThan(60);
      expect(body.stops[0].stopName).toBe("강남역 정류장");
    });
  });
});
