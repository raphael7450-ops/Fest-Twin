import express from "express";
import { describe, expect, it, vi } from "vitest";
import { createTrafficProxyRouter } from "./trafficProxy.js";

function jsonResponse(payload: unknown, options: { ok?: boolean; status?: number } = {}) {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: async () => payload,
  } as Response;
}

async function request(path: string, fetchImpl: typeof fetch) {
  const app = express();
  app.use("/api/traffic", createTrafficProxyRouter({ fetchImpl }));
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

describe("KTDB/View-T traffic proxy", () => {
  it("forwards a selected-link request with validated View-T parameters", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        RESULT: [
          {
            LINKID: "1000001",
            LINKNAME: "Test Road",
            LINKRANK: "National Road",
            LINKLINECNT: 6,
            VALUE: {
              IN: 3200,
              OUT: 2800,
            },
          },
        ],
      }),
    );

    const { response, body } = await request(
      "/api/traffic/selected-link?linkId=1000001&year=2025&weekType=weekend&time=20",
      fetchMock as unknown as typeof fetch,
    );

    expect(response.status).toBe(200);
    expect(body.result[0]).toEqual({
      LINKID: "1000001",
      ROAD_NAME: "Test Road",
      ROAD_RANK: "National Road",
      LANES: 6,
      VALUE_IN: 3200,
      VALUE_OUT: 2800,
    });

    const upstreamUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(upstreamUrl.origin).toBe("https://viewt.ktdb.go.kr");
    expect(upstreamUrl.pathname).toBe("/cong/api/selectedLink_road.do");
    expect(upstreamUrl.searchParams.get("LINKID")).toBe("1000001");
    expect(upstreamUrl.searchParams.get("YEAR")).toBe("2025");
    expect(upstreamUrl.searchParams.get("WEEKTYPE")).toBe("1");
    expect(upstreamUrl.searchParams.get("TIME")).toBe("20");
  });

  it.each([
    ["/api/traffic/selected-link?linkId=&year=2025&weekType=weekend&time=20"],
    ["/api/traffic/selected-link?linkId=https://evil.test/?serviceKey=x&year=2025&weekType=weekend&time=20"],
    ["/api/traffic/selected-link?linkId=12345&year=2025&weekType=weekend&time=20"],
    ["/api/traffic/selected-link?linkId=1000001&year=2026&weekType=weekend&time=20"],
    ["/api/traffic/selected-link?linkId=1000001&year=2025&weekType=holiday&time=20"],
    ["/api/traffic/selected-link?linkId=1000001&year=2025&weekType=weekend&time=Infinity"],
    ["/api/traffic/selected-link?linkId=1000001&year=2025&weekType=weekend&time=24"],
    ["/api/traffic/selected-link?linkId=1000001&year=2025&weekType=weekend&time=20&serviceKey=x"],
  ])("rejects invalid selected-link query %s", async (path) => {
    const fetchMock = vi.fn();
    const { response, body } = await request(path, fetchMock as unknown as typeof fetch);

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_QUERY");
    expect(JSON.stringify(body)).not.toContain("serviceKey");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps upstream failures without leaking raw URLs", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}, { ok: false, status: 502 }));

    const { response, body } = await request(
      "/api/traffic/selected-link?linkId=1000001&year=2025&weekType=weekday&time=ALL",
      fetchMock as unknown as typeof fetch,
    );

    expect(response.status).toBe(502);
    expect(body.error.code).toBe("TRAFFIC_UPSTREAM_ERROR");
    expect(JSON.stringify(body)).not.toContain("viewt.ktdb.go.kr");
  });
});
