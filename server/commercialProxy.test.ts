import { describe, expect, it } from "vitest";
import { createCommercialProxyRouter } from "./commercialProxy.js";
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

describe("server/commercialProxy", () => {
  it("returns unavailable without fabricated stores when API key is missing", async () => {
    const dummyLimiter = (_req: any, _res: any, next: any) => next();
    const app = createApp({
      generalRateLimiter: dummyLimiter,
      openApiRateLimiter: dummyLimiter,
      commercialApiKey: "",
      disableHttpLogging: true,
    });

    await withAppServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/commercial/nearby-stores?lat=37.51&lon=127.06`);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.status).toBe("unavailable");
      expect(body.observations).toEqual([]);
    });
  });

  it("parses live commercial store response when mock fetch returns items", async () => {
    const mockFetch = (async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      expect(url.origin).toBe("https://apis.data.go.kr");
      expect(url.pathname).toBe("/B553077/api/open/sdsc2/storeListInRadius");
      return new Response(
        JSON.stringify({
          header: { resultCode: "00" },
          body: {
            items: [
              { indsLclsNm: "음식", bizesNm: "강남 카페", lat: 37.5101, lon: 127.0601 },
              { indsLclsNm: "숙박", bizesNm: "강남 호텔", lat: 37.511, lon: 127.061 },
              { indsLclsNm: "소매", bizesNm: "강남 편의점", lat: 37.512, lon: 127.062 },
            ],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    const dummyLimiter = (_req: any, _res: any, next: any) => next();
    const app = createApp({
      generalRateLimiter: dummyLimiter,
      openApiRateLimiter: dummyLimiter,
      commercialApiKey: "mock-commercial-key",
      fetchImpl: mockFetch,
      disableHttpLogging: true,
    });

    await withAppServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/commercial/nearby-stores?lat=37.51&lon=127.06`);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.status).toBe("live");
      expect(body).not.toHaveProperty("commercialDensityScore");
      expect(body.observations).toHaveLength(3);
    });
  });
});
