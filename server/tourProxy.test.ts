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

  it("rejects deprecated detailCommon2 option flags that the current TourAPI rejects", async () => {
    const fetchMock = vi.fn();

    const { response, body } = await request(
      "/api/tour/detail?contentId=3439947&defaultYN=Y&addrinfoYN=Y",
      fetchMock as unknown as typeof fetch,
    );

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_QUERY");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards detailCommon2 with only contentId plus server-managed common parameters", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(tourApiPayload([{ contentid: "3439947", title: "강남 미디어 윈터페스타" }])),
    );

    const { response } = await request(
      "/api/tour/detail?contentId=3439947",
      fetchMock as unknown as typeof fetch,
    );

    expect(response.status).toBe(200);
    const upstreamUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(upstreamUrl.pathname.endsWith("/detailCommon2")).toBe(true);
    expect(upstreamUrl.searchParams.get("contentId")).toBe("3439947");
    expect(upstreamUrl.searchParams.has("defaultYN")).toBe(false);
    expect(upstreamUrl.searchParams.has("firstImageYN")).toBe(false);
    expect(upstreamUrl.searchParams.has("addrinfoYN")).toBe(false);
    expect(upstreamUrl.searchParams.has("overviewYN")).toBe(false);
    expect(upstreamUrl.searchParams.has("mapinfoYN")).toBe(false);
  });

  it("forwards detailIntro2 for festival playtime without exposing the server key", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(tourApiPayload([{ contentid: "3439947", title: "Gangnam", playtime: "09:00~22:00" }])),
    );

    const { response, body } = await request(
      "/api/tour/detail-intro?contentId=3439947&contentTypeId=15",
      fetchMock as unknown as typeof fetch,
    );

    expect(response.status).toBe(200);
    expect(JSON.stringify(body)).not.toContain("server-key+/=");
    const upstreamUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(upstreamUrl.pathname.endsWith("/detailIntro2")).toBe(true);
    expect(upstreamUrl.searchParams.get("contentId")).toBe("3439947");
    expect(upstreamUrl.searchParams.get("contentTypeId")).toBe("15");
    expect(upstreamUrl.searchParams.has("introYN")).toBe(false);
  });

  it("forwards a festival keyword search with server-managed authentication", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(
        tourApiPayload([
          {
            contentid: "3073454",
            title: "서울라이트 광화문",
            addr1: "서울특별시 종로구 세종로 1-68",
            mapx: "126.9767821434",
            mapy: "37.5716786179",
          },
        ]),
      ),
    );

    const { response, body } = await request(
      "/api/tour/keyword?keyword=%EC%84%9C%EC%9A%B8%EB%9D%BC%EC%9D%B4%ED%8A%B8%20%EA%B4%91%ED%99%94%EB%AC%B8&contentTypeId=15&numOfRows=10&pageNo=1&arrange=A",
      fetchMock as unknown as typeof fetch,
    );

    expect(response.status).toBe(200);
    expect(JSON.stringify(body)).not.toContain("server-key+/=");
    const upstreamUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(upstreamUrl.pathname.endsWith("/searchKeyword2")).toBe(true);
    expect(upstreamUrl.searchParams.get("keyword")).toBe("서울라이트 광화문");
    expect(upstreamUrl.searchParams.get("contentTypeId")).toBe("15");
  });

  it("rejects an empty festival keyword without an upstream request", async () => {
    const fetchMock = vi.fn();

    const { response, body } = await request(
      "/api/tour/keyword?keyword=%20%20&contentTypeId=15",
      fetchMock as unknown as typeof fetch,
    );

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_QUERY");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["whitespace", "/api/tour/nearby?mapX=%20%20%20&mapY=37.52&radius=5000"],
    ["Infinity", "/api/tour/nearby?mapX=126.92&mapY=Infinity&radius=5000"],
  ])("rejects %s numeric query values without an upstream request", async (_case, path) => {
    const fetchMock = vi.fn();

    const { response, body } = await request(path, fetchMock as unknown as typeof fetch);

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_QUERY");
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
