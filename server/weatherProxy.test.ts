import { describe, expect, it } from "vitest";
import { convertLatLonToGrid } from "./weatherProxy.js";
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

describe("server/weatherProxy", () => {
  it("converts latitude and longitude to KMA Grid (nx, ny)", () => {
    // Seoul Gangnam (approx 37.51, 127.06) -> nx 61, ny 126
    const { nx, ny } = convertLatLonToGrid(37.510395, 127.061051);
    expect(nx).toBeGreaterThan(50);
    expect(ny).toBeGreaterThan(100);
  });

  it("returns sample-fallback response when WEATHER_API_KEY is not provided", async () => {
    const dummyLimiter = (_req: any, _res: any, next: any) => next();
    const app = createApp({
      generalRateLimiter: dummyLimiter,
      openApiRateLimiter: dummyLimiter,
      weatherApiKey: "",
      disableHttpLogging: true,
    });

    await withAppServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/weather?lat=37.51&lon=127.06`);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.status).toBe("sample-fallback");
      expect(body.weather.temperatureCelsius).toBeDefined();
      expect(body.provenance.sourceType).toBe("seasonal-climate-sample");
    });
  });

  it("parses live KMA response when mock fetch returns valid weather items", async () => {
    const mockFetch = (async () =>
      new Response(
        JSON.stringify({
          response: {
            body: {
              items: {
                item: [
                  { category: "POP", fcstValue: "20" },
                  { category: "TMP", fcstValue: "22.5" },
                  { category: "WSD", fcstValue: "3.1" },
                  { category: "PTY", fcstValue: "0" },
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
      weatherApiKey: "mock-key",
      fetchImpl: mockFetch,
      disableHttpLogging: true,
    });

    await withAppServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/weather?lat=37.51&lon=127.06`);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.status).toBe("live");
      expect(body.weather.temperatureCelsius).toBe(22.5);
      expect(body.weather.precipitationProbabilityPercent).toBe(20);
      expect(body.provenance.sourceType).toBe("kma-forecast");
    });
  });
});
