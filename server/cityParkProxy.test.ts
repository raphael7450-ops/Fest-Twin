import express from "express";
import { describe, expect, it, vi } from "vitest";
import { createCityParkProxyRouter, normalizeCityParkPayload } from "./cityParkProxy.js";

const SERVER_KEY = "server-key+/=";

function cityParkRecord(overrides: Record<string, unknown> = {}) {
  return {
    manageNo: "PARK-001",
    parkNm: "\uC5EC\uC758\uB3C4\uACF5\uC6D0",
    parkSe: "\uADFC\uB9B0\uACF5\uC6D0",
    rdnmadr: "\uC11C\uC6B8\uD2B9\uBCC4\uC2DC \uC601\uB4F1\uD3EC\uAD6C \uC5EC\uC758\uACF5\uC6D0\uB85C 68",
    lnmadr: "\uC11C\uC6B8\uD2B9\uBCC4\uC2DC \uC601\uB4F1\uD3EC\uAD6C \uC5EC\uC758\uB3C4\uB3D9 2",
    latitude: "37.5268",
    longitude: "126.922",
    parkAr: "229539",
    institutionNm: "\uC11C\uC6B8\uD2B9\uBCC4\uC2DC",
    referenceDate: "2026-01-01",
    ...overrides,
  };
}

function jsonResponse(payload: unknown, options: { ok?: boolean; status?: number } = {}) {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: async () => payload,
  } as Response;
}

async function request(
  path: string,
  fetchImpl: typeof fetch,
  options: {
    apiKey?: string;
    logger?: { warn: ReturnType<typeof vi.fn> };
    timeoutMs?: number;
  } = {},
) {
  const app = express();
  app.use(
    "/api/city-parks",
    createCityParkProxyRouter({
      fetchImpl,
      apiKey: options.apiKey,
      logger: options.logger,
      timeoutMs: options.timeoutMs,
    }),
  );
  const server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Test server did not start on a TCP port");
  }

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`);
    return { response, body: await response.json() };
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

describe("city park server proxy", () => {
  it("injects the server key and normalizes nested city park results without exposing the key", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        response: {
          body: {
            items: { item: [cityParkRecord()] },
            totalCount: 1,
          },
        },
      }),
    );

    const { response, body } = await request(
      "/api/city-parks?query=%EC%97%AC%EC%9D%98%EB%8F%84%20%EA%B3%B5%EC%9B%90&pageNo=1&numOfRows=100",
      fetchMock as unknown as typeof fetch,
      { apiKey: SERVER_KEY },
    );

    expect(response.status).toBe(200);
    expect(new URL(String(fetchMock.mock.calls[0][0])).searchParams.get("serviceKey"))
      .toBe("server-key+/=");
    expect(JSON.stringify(body)).not.toContain("server-key+/=");
    expect(body.items[0]).toEqual({
      id: "PARK-001",
      name: "\uC5EC\uC758\uB3C4\uACF5\uC6D0",
      type: "\uADFC\uB9B0\uACF5\uC6D0",
      roadAddress: "\uC11C\uC6B8\uD2B9\uBCC4\uC2DC \uC601\uB4F1\uD3EC\uAD6C \uC5EC\uC758\uACF5\uC6D0\uB85C 68",
      lotAddress: "\uC11C\uC6B8\uD2B9\uBCC4\uC2DC \uC601\uB4F1\uD3EC\uAD6C \uC5EC\uC758\uB3C4\uB3D9 2",
      latitude: 37.5268,
      longitude: 126.922,
      areaSquareMeters: 229539,
      managementOrganization: "\uC11C\uC6B8\uD2B9\uBCC4\uC2DC",
      referenceDate: "2026-01-01",
    });
    expect(body.totalCount).toBe(1);
    expect(Number.isNaN(Date.parse(body.retrievedAt))).toBe(false);
  });

  it("normalizes top-level array payloads", () => {
    expect(normalizeCityParkPayload([cityParkRecord()])).toMatchObject({
      items: [{ id: "PARK-001", areaSquareMeters: 229539 }],
      totalCount: 1,
    });
  });

  it("normalizes scalar upstream items", () => {
    expect(
      normalizeCityParkPayload({
        items: { item: cityParkRecord() },
        totalCount: "1",
      }),
    ).toMatchObject({
      items: [{ id: "PARK-001", areaSquareMeters: 229539 }],
      totalCount: 1,
    });
  });

  it("normalizes empty upstream items", () => {
    expect(normalizeCityParkPayload({ response: { body: { items: "", totalCount: 0 } } })).toEqual({
      items: [],
      totalCount: 0,
    });
  });

  it("removes records with non-positive or non-numeric park areas", () => {
    expect(
      normalizeCityParkPayload({
        response: {
          body: {
            items: {
              item: [cityParkRecord({ parkAr: "0" }), cityParkRecord({ parkAr: "invalid" })],
            },
            totalCount: 2,
          },
        },
      }),
    ).toEqual({ items: [], totalCount: 2 });
  });

  it("reports a missing server key without calling upstream", async () => {
    const fetchMock = vi.fn();

    const { response, body } = await request(
      "/api/city-parks?query=park",
      fetchMock as unknown as typeof fetch,
      { apiKey: "" },
    );

    expect(response.status).toBe(503);
    expect(body.error.code).toBe("CITY_PARK_API_KEY_MISSING");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects blank query text", async () => {
    const fetchMock = vi.fn();

    const { response, body } = await request(
      "/api/city-parks?query=%20%20%20",
      fetchMock as unknown as typeof fetch,
      { apiKey: SERVER_KEY },
    );

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_QUERY");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects query text longer than 80 characters", async () => {
    const fetchMock = vi.fn();

    const { response, body } = await request(
      `/api/city-parks?query=${"a".repeat(81)}`,
      fetchMock as unknown as typeof fetch,
      { apiKey: SERVER_KEY },
    );

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_QUERY");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("bounds upstream page and row parameters", async () => {
    const fetchMock = vi.fn(async () => jsonResponse([]));

    const { response } = await request(
      "/api/city-parks?query=park&pageNo=0&numOfRows=101",
      fetchMock as unknown as typeof fetch,
      { apiKey: SERVER_KEY },
    );
    const upstreamUrl = new URL(String(fetchMock.mock.calls[0][0]));

    expect(response.status).toBe(200);
    expect(upstreamUrl.searchParams.get("pageNo")).toBe("1");
    expect(upstreamUrl.searchParams.get("numOfRows")).toBe("100");
    expect(upstreamUrl.searchParams.get("type")).toBe("json");
    expect(upstreamUrl.searchParams.get("parkNm")).toBe("park");
  });

  it("returns an opaque error for non-success upstream responses", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}, { ok: false, status: 429 }));
    const logger = { warn: vi.fn() };

    const { response, body } = await request(
      "/api/city-parks?query=park",
      fetchMock as unknown as typeof fetch,
      { apiKey: SERVER_KEY, logger },
    );

    expect(response.status).toBe(502);
    expect(body.error.code).toBe("CITY_PARK_UPSTREAM_ERROR");
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain(SERVER_KEY);
  });

  it("returns an opaque error when the upstream request throws", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error(`timeout for ${SERVER_KEY}`);
    });
    const logger = { warn: vi.fn() };

    const { response, body } = await request(
      "/api/city-parks?query=park",
      fetchMock as unknown as typeof fetch,
      { apiKey: SERVER_KEY, logger },
    );

    expect(response.status).toBe(502);
    expect(body.error.code).toBe("CITY_PARK_UPSTREAM_ERROR");
    expect(JSON.stringify(body)).not.toContain(SERVER_KEY);
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain(SERVER_KEY);
  });

  it("treats a TypeError from fetch as an upstream failure", async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });

    const { response, body } = await request(
      "/api/city-parks?query=park",
      fetchMock as unknown as typeof fetch,
      { apiKey: SERVER_KEY },
    );

    expect(response.status).toBe(502);
    expect(body.error.code).toBe("CITY_PARK_UPSTREAM_ERROR");
  });

  it("aborts a stalled upstream request and returns an opaque upstream error", async () => {
    const fetchMock = vi.fn((_url: URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException(`Timed out with ${SERVER_KEY}`, "AbortError"));
        });
      }),
    );
    const logger = { warn: vi.fn() };

    const { response, body } = await request(
      "/api/city-parks?query=park",
      fetchMock as unknown as typeof fetch,
      { apiKey: SERVER_KEY, logger, timeoutMs: 10 },
    );

    expect(response.status).toBe(502);
    expect(body.error.code).toBe("CITY_PARK_UPSTREAM_ERROR");
    expect((fetchMock.mock.calls[0][1] as RequestInit).signal?.aborted).toBe(true);
    expect(JSON.stringify(body)).not.toContain(SERVER_KEY);
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain(SERVER_KEY);
  });

  it("returns an invalid-response error for malformed upstream JSON", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    }) as Response);

    const { response, body } = await request(
      "/api/city-parks?query=park",
      fetchMock as unknown as typeof fetch,
      { apiKey: SERVER_KEY },
    );

    expect(response.status).toBe(502);
    expect(body.error.code).toBe("CITY_PARK_INVALID_RESPONSE");
  });
});
