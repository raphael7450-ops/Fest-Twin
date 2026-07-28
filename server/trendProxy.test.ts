import express from "express";
import { describe, expect, it, vi } from "vitest";
import { createTrendProxyRouter } from "./trendProxy.js";

function jsonResponse(payload: unknown, options: { ok?: boolean; status?: number } = {}) {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: async () => payload,
  } as Response;
}

async function request(
  body: unknown,
  fetchImpl: typeof fetch,
  credentials = { clientId: "naver-client-id", clientSecret: "naver-client-secret" },
) {
  const app = express();
  app.use(express.json());
  app.use("/api/trends", createTrendProxyRouter({ fetchImpl, ...credentials }));
  const server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Test server did not start on a TCP port");
  }

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/trends/naver-search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const responseBody = await response.json();
    return { response, body: responseBody };
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

describe("Naver DataLab trend proxy", () => {
  it("forwards a sanitized search trend request with server-side credentials", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        results: [
          {
            title: "Gangnam festival",
            keywords: ["gangnam festival"],
            data: [
              { period: "2026-10-01", ratio: 32.1 },
              { period: "2026-10-08", ratio: 41.8 },
            ],
          },
        ],
      }),
    );

    const { response, body } = await request(
      {
        startDate: "2026-10-01",
        endDate: "2026-12-31",
        timeUnit: "week",
        keywordGroups: [
          {
            groupName: "Gangnam festival",
            keywords: ["gangnam festival", "winter festival"],
          },
        ],
      },
      fetchMock as unknown as typeof fetch,
    );

    expect(response.status).toBe(200);
    expect(body.sourceStatus).toBe("live");
    expect(body.sourceName).toBe("Naver DataLab search trend");
    expect(body.results[0].data[1].ratio).toBe(41.8);
    expect(JSON.stringify(body)).not.toContain("naver-client-secret");

    const [upstreamUrl, options] = fetchMock.mock.calls[0];
    expect(String(upstreamUrl)).toBe("https://openapi.naver.com/v1/datalab/search");
    expect(options.method).toBe("POST");
    expect(options.headers["X-Naver-Client-Id"]).toBe("naver-client-id");
    expect(options.headers["X-Naver-Client-Secret"]).toBe("naver-client-secret");
    expect(JSON.parse(options.body).keywordGroups[0].keywords).toEqual([
      "gangnam festival",
      "winter festival",
    ]);
  });

  it("rejects unsupported body fields without calling upstream", async () => {
    const fetchMock = vi.fn();

    const { response, body } = await request(
      {
        startDate: "2026-10-01",
        endDate: "2026-12-31",
        timeUnit: "week",
        keywordGroups: [{ groupName: "Gangnam", keywords: ["Gangnam"] }],
        clientSecret: "client-supplied-secret",
      },
      fetchMock as unknown as typeof fetch,
    );

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_TREND_QUERY");
    expect(JSON.stringify(body)).not.toContain("client-supplied-secret");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a safe fallback response when Naver DataLab credentials are missing", async () => {
    const fetchMock = vi.fn();

    const { response, body } = await request(
      {
        startDate: "2026-10-01",
        endDate: "2026-12-31",
        timeUnit: "week",
        keywordGroups: [{ groupName: "Gangnam", keywords: ["Gangnam"] }],
      },
      fetchMock as unknown as typeof fetch,
      { clientId: "", clientSecret: "" },
    );

    expect(response.status).toBe(200);
    expect(body.sourceStatus).toBe("sample-fallback");
    expect(body.fallbackReason).toContain("Naver DataLab credentials");
    expect(JSON.stringify(body)).not.toContain("clientSecret");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps upstream failures to a safe fallback response", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}, { ok: false, status: 500 }));

    const { response, body } = await request(
      {
        startDate: "2026-10-01",
        endDate: "2026-12-31",
        timeUnit: "week",
        keywordGroups: [{ groupName: "Gangnam", keywords: ["Gangnam"] }],
      },
      fetchMock as unknown as typeof fetch,
    );

    expect(response.status).toBe(200);
    expect(body.sourceStatus).toBe("sample-fallback");
    expect(body.fallbackReason).toContain("upstream");
  });
});
