import express from "express";
import { describe, expect, it, vi } from "vitest";
import { createVWorldProxyRouter } from "./vworldProxy.js";

function jsonResponse(payload: unknown, options: { ok?: boolean; status?: number } = {}) {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: async () => payload,
  } as Response;
}

async function request(path: string, fetchImpl: typeof fetch, apiKey = "server-vworld-key") {
  const app = express();
  app.use("/api/vworld", createVWorldProxyRouter({ fetchImpl, apiKey }));
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

describe("VWorld proxy", () => {
  it("injects the server key and forwards a sanitized search request", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        response: {
          status: "OK",
          result: {
            items: [
              {
                address: { road: "대전광역시 동구 대전로779번길 8" },
                point: { x: "127.43286719691503", y: "36.32957497803072" },
              },
            ],
          },
        },
      }),
    );

    const { response, body } = await request(
      "/api/vworld/search?query=%EB%8C%80%EC%A0%84%20%EC%A4%91%EC%95%99%EC%8B%9C%EC%9E%A5&type=ADDRESS&category=ROAD",
      fetchMock as unknown as typeof fetch,
    );

    expect(response.status).toBe(200);
    expect(body.response.status).toBe("OK");

    const upstreamUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(upstreamUrl.hostname).toBe("api.vworld.kr");
    expect(upstreamUrl.searchParams.get("key")).toBe("server-vworld-key");
    expect(upstreamUrl.searchParams.get("query")).toBe("대전 중앙시장");
    expect(upstreamUrl.searchParams.get("type")).toBe("ADDRESS");
    expect(upstreamUrl.searchParams.get("category")).toBe("ROAD");
  });

  it("rejects unsupported query parameters before calling VWorld", async () => {
    const fetchMock = vi.fn();

    const { response, body } = await request(
      "/api/vworld/search?query=a&type=SCRIPT",
      fetchMock as unknown as typeof fetch,
    );

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_QUERY");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
