import express from "express";
import { describe, expect, it, vi } from "vitest";
import { createSpendingProxyRouter } from "./spendingProxy.js";

function jsonResponse(payload: unknown, options: { ok?: boolean; status?: number } = {}) {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: async () => payload,
  } as Response;
}

async function request(path: string, fetchImpl: typeof fetch, apiKey = "server-key+/=") {
  const app = express();
  app.use("/api/spending", createSpendingProxyRouter({ fetchImpl, apiKey }));
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

describe("tourism spending server proxy", () => {
  it("adds serviceKey on the server and forwards a regional consumer-strength request", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ response: { body: { items: { item: [{ areaNm: "Seoul" }] } } } }),
    );

    const { response, body } = await request(
      "/api/spending/consumer-strength?areaCd=11&baseYm=202509&tarExpDsIxCd=2203",
      fetchMock as unknown as typeof fetch,
    );

    expect(response.status).toBe(200);
    expect(body.response.body.items.item[0].areaNm).toBe("Seoul");
    const upstreamUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(upstreamUrl.origin).toBe("https://apis.data.go.kr");
    expect(upstreamUrl.pathname).toContain("/B551011/AreaTarDemDsService/");
    expect(upstreamUrl.searchParams.get("serviceKey")).toBe("server-key+/=");
    expect(upstreamUrl.searchParams.get("_type")).toBe("json");
    expect(upstreamUrl.pathname.endsWith("/areaTarExpDsList")).toBe(true);
    expect(upstreamUrl.searchParams.get("MobileOS")).toBe("ETC");
    expect(upstreamUrl.searchParams.get("MobileApp")).toBe("FestTwin");
    expect(upstreamUrl.searchParams.get("areaCd")).toBe("11");
    expect(upstreamUrl.searchParams.get("tarExpDsIxCd")).toBe("2203");
  });

  it("rejects client-supplied keys and unsupported parameters", async () => {
    const fetchMock = vi.fn();

    const { response, body } = await request(
      "/api/spending/consumer-strength?serviceKey=client-key&url=https://evil.test",
      fetchMock as unknown as typeof fetch,
    );

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_QUERY");
    expect(JSON.stringify(body)).not.toContain("client-key");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
