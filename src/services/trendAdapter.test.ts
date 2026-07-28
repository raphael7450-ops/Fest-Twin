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
  it("uses the selected festival title as the first trend keyword group", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        sourceName: "Naver DataLab search trend",
        sourceStatus: "live",
        results: [
          {
            title: "Seoul Lantern Festa",
            keywords: ["Seoul Lantern Festa"],
            data: [{ period: "2025-10-01", ratio: 80 }],
          },
        ],
      }),
    );

    const plan = {
      ...sampleFestivalPlan,
      name: "Seoul Lantern Festa",
      keywords: ["Seoul Lantern Festa", "빛축제", "서울"],
    };

    await getTrendContext(plan, { fetchImpl: fetchImpl as unknown as typeof fetch });

    const [, requestInit] = fetchImpl.mock.calls[0] as unknown as [
      RequestInfo,
      RequestInit,
    ];
    const body = JSON.parse(String(requestInit.body)) as {
      keywordGroups: Array<{ groupName: string; keywords: string[] }>;
    };

    expect(body.keywordGroups[0].groupName).toBe("Seoul Lantern Festa");
    expect(body.keywordGroups[0].keywords[0]).toBe("Seoul Lantern Festa");
  });
});
