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
  it("returns sample-fallback commercial response when API key is missing", async () => {
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
      expect(body.status).toBe("sample-fallback");
      expect(body.commercialDensityScore).toBeGreaterThan(50);
      expect(body.categories.length).toBe(3);
    });
  });

  it("parses live commercial store response when mock fetch returns items", async () => {
    const mockFetch = (async () =>
      new Response(
        JSON.stringify({
          body: {
            items: [
              { indsLclsNm: "음식", bizesNm: "강남 카페" },
              { indsLclsNm: "숙박", bizesNm: "강남 호텔" },
              { indsLclsNm: "소매", bizesNm: "강남 편의점" },
            ],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      )) as typeof fetch;

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
      expect(body.commercialDensityScore).toBeGreaterThan(50);
      expect(body.categories[0].storeCount).toBeGreaterThan(0);
    });
  });
});
