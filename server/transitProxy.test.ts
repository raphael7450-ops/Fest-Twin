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
  it("returns unavailable without fabricated stops when API key is missing", async () => {
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
      expect(body.status).toBe("unavailable");
      expect(body.observations).toEqual([]);
    });
  });

  it("parses live TAGO transit response when fetch returns items", async () => {
    const mockFetch = (async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      expect(url.origin).toBe("https://apis.data.go.kr");
      expect(url.pathname).toBe("/1613000/BusSttnInfoInqireService/getCrdntPrxmtSttnList");
      return new Response(
        JSON.stringify({
          response: {
            header: { resultCode: "00" },
            body: {
              items: {
                item: [
                  { nodenm: "강남역 정류장", gpslati: 37.5101, gpslong: 127.0601 },
                  { nodenm: "COEX 정류장", gpslati: 37.511, gpslong: 127.061 },
                ],
              },
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

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
      expect(body).not.toHaveProperty("accessibilityScore");
      expect(body.observations[0].name).toBe("강남역 정류장");
    });
  });
});
