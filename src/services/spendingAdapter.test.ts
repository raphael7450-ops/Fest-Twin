import { describe, expect, it, vi } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import { getSpendingContext } from "./spendingAdapter";

function jsonResponse(payload: unknown, options: { ok?: boolean; status?: number } = {}) {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: async () => payload,
  } as Response;
}

describe("spendingAdapter", () => {
  it("loads public-data spending context from the regional tourism demand proxy", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        response: {
          body: {
            items: {
              item: [
                {
                  areaNm: "Seoul",
                  baseYm: "202512",
                  visitorCnt: "10000",
                  outRegionSpendAmount: "720000000",
                },
              ],
            },
          },
        },
      }),
    );

    const spending = await getSpendingContext(sampleFestivalPlan, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(spending.sourceStatus).toBe("live");
    expect(spending.averageSpendPerVisitorKrw).toBe(72_000);
    expect(spending.sourceDetails[0].endpoint).toBe("/api/spending/consumer-strength");
    expect(JSON.stringify(spending.sourceDetails)).not.toMatch(/serviceKey|clientSecret/i);
    const calls = fetchImpl.mock.calls as unknown as Array<[RequestInfo | URL]>;
    const requestUrl = new URL(String(calls[0][0]), "http://localhost");
    expect(requestUrl.pathname).toBe("/api/spending/consumer-strength");
  });

  it("falls back to the sample spending context when live data is unavailable", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, { ok: false, status: 502 }));

    const spending = await getSpendingContext(sampleFestivalPlan, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(spending.sourceStatus).toBe("partial-fallback");
    expect(spending.averageSpendPerVisitorKrw).toBe(58_400);
    expect(JSON.stringify(spending.sourceDetails)).toContain("data.go.kr/data/15151868");
  });
});
