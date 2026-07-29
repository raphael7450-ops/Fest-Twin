import { describe, expect, it, vi } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import { getTrendContext } from "./trendAdapter";

function jsonResponse(payload: unknown, options: { ok?: boolean; status?: number } = {}) {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: async () => payload,
  } as Response;
}

describe("trendAdapter", () => {
  it("puts the selected festival title first in the Naver DataLab keyword group", async () => {
    const selectedPlan = {
      ...sampleFestivalPlan,
      name: "Seoul Light Hangang Festa",
      startDate: "2026-02-11",
      endDate: "2026-02-18",
      keywords: ["미디어아트", "한강", "야간관광"],
    };
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        sourceName: "Naver DataLab search trend",
        sourceStatus: "live",
        retrievedAt: "2026-02-01T00:00:00.000Z",
        results: [
          {
            title: "Seoul Light Hangang Festa",
            keywords: ["Seoul Light Hangang Festa", "한강"],
            data: [
              { period: "2025-11-13", ratio: 45 },
              { period: "2026-02-11", ratio: 75 },
            ],
          },
        ],
      }),
    );

    const trends = await getTrendContext(selectedPlan, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const calls = fetchImpl.mock.calls as unknown as Array<[RequestInfo | URL, RequestInit?]>;
    const request = JSON.parse(String(calls[0][1]?.body)) as {
      keywordGroups: Array<{ groupName: string; keywords: string[] }>;
    };
    expect(request.keywordGroups[0]).toMatchObject({
      groupName: "Seoul Light Hangang Festa",
      keywords: ["Seoul Light Hangang Festa", "미디어아트", "한강", "야간관광"],
    });
    expect(trends.keywordGroups?.[0].keywords[0]).toBe("Seoul Light Hangang Festa");
  });
});
