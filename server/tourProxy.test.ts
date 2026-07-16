import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./index.js";
import { createTourProxyRouter } from "./tourProxy.js";

function jsonResponse(payload: unknown, options: { ok?: boolean; status?: number } = {}) {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: async () => payload,
  } as Response;
}

function tourApiPayload(items: unknown, totalCount = 1) {
  return {
    response: {
      header: { resultCode: "0000", resultMsg: "OK" },
      body: {
        items: totalCount === 0 ? "" : { item: items },
        totalCount,
      },
    },
  };
}

async function request(path: string, fetchImpl: typeof fetch, apiKey = "server-key+/=") {
  const app = express();
  app.use("/api/tour", createTourProxyRouter({ fetchImpl, apiKey }));
  const server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Test server did not start on a TCP port");
  }

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`);
    const body = await response.json();
    return { response, body };
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

describe("TourAPI server proxy", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("adds serviceKey from the server only and forwards an allowed area code request", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(tourApiPayload([{ code: "1", name: "서울" }])));

    const { response, body } = await request(
      "/api/tour/area-code?numOfRows=50&pageNo=1",
      fetchMock as unknown as typeof fetch,
    );

    expect(response.status).toBe(200);
    expect(body.response.header.resultCode).toBe("0000");
    const upstreamUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(upstreamUrl.pathname.endsWith("/areaCode2")).toBe(true);
    expect(upstreamUrl.searchParams.get("serviceKey")).toBe("server-key+/=");
    expect(upstreamUrl.searchParams.get("MobileOS")).toBe("ETC");
    expect(upstreamUrl.searchParams.get("MobileApp")).toBe("FestTwin");
    expect(upstreamUrl.searchParams.get("_type")).toBe("json");
    expect(upstreamUrl.searchParams.get("numOfRows")).toBe("50");
  });

  it("rejects client-supplied serviceKey and unknown parameters", async () => {
    const fetchMock = vi.fn();

    const { response, body } = await request(
      "/api/tour/festivals?serviceKey=client-key&unknown=value",
      fetchMock as unknown as typeof fetch,
    );

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_QUERY");
    expect(JSON.stringify(body)).not.toContain("client-key");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 503 without leaking a key when TOUR_API_KEY is missing", async () => {
    const fetchMock = vi.fn();

    const { response, body } = await request(
      "/api/tour/area-code",
      fetchMock as unknown as typeof fetch,
      "",
    );

    expect(response.status).toBe(503);
    expect(body.error.code).toBe("TOUR_API_KEY_MISSING");
    expect(JSON.stringify(body)).not.toContain("serviceKey");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps upstream HTTP and malformed JSON failures to 502", async () => {
    const upstreamErrorFetch = vi.fn(async () => jsonResponse({}, { ok: false, status: 504 }));
    const malformedJsonFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => Promise.reject(new SyntaxError("invalid JSON")),
    })) as unknown as typeof fetch;

    const upstreamError = await request(
      "/api/tour/nearby?mapX=126.92&mapY=37.52&radius=5000",
      upstreamErrorFetch as unknown as typeof fetch,
    );
    const malformedJson = await request(
      "/api/tour/nearby?mapX=126.92&mapY=37.52&radius=5000",
      malformedJsonFetch,
    );

    expect(upstreamError.response.status).toBe(502);
    expect(upstreamError.body.error.code).toBe("TOUR_API_UPSTREAM_ERROR");
    expect(malformedJson.response.status).toBe(502);
    expect(malformedJson.body.error.code).toBe("TOUR_API_INVALID_RESPONSE");
  });

  it("creates the server app with an Express 5-compatible fallback route", () => {
    expect(() => createApp({ staticDir: "./dist" })).not.toThrow();
  });
});
