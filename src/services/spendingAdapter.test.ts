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
  it("exposes a matching dated consumption index separately from sample monetary assumptions", async () => {
    const spending = await getSpendingContext(sampleFestivalPlan, { fetchImpl: async () => jsonResponse({ response: {
      header: { resultCode: "0000" }, body: { items: { item: [
        { areaCd: "11", areaNm: "서울", baseYm: "202509", signguNm: "종로구", tarExpDsIxNm: "소비 강도", tarExpDsIxVal: "135.7" },
        { areaCd: "26", areaNm: "부산", baseYm: "202509", tarExpDsIxVal: "200" },
      ] } },
    } }) });
    const detail = spending.sourceDetails.find((item) => item.sourceId === "observed-tourism-consumption-index");
    expect(detail?.sourceType).toBe("public-data");
    expect(detail?.records).toHaveLength(1);
    expect(JSON.stringify(detail)).toContain("135.7");
    expect(JSON.stringify(detail)).toContain("202509");
    expect(JSON.stringify(detail)).not.toContain("부산");
    expect(spending.sourceStatus).not.toBe("live");
    expect(spending.averageSpendPerVisitorKrw).not.toBe(136);
  });
  it("does not treat a tourism intensity index as KRW per visitor", async () => {
    const spending = await getSpendingContext(sampleFestivalPlan, {
      fetchImpl: async () => jsonResponse({ response: {
        header: { resultCode: "0000" },
        body: { items: { item: [{ tarExpDsIxVal: "135.7" }] } },
      } }),
    });
    expect(spending.sourceStatus).not.toBe("live");
    expect(spending.basisLabel).toContain("샘플");
  });
  it.each([
    { _fallback: true },
    { response: { header: { resultCode: "30" } } },
  ])("does not promote fallback or business errors to live data: %j", async (flags) => {
    const payload = {
      ...flags,
      response: {
        ...flags.response,
        body: { items: { item: [{ avgSpendPerVisitorKrw: 58400 }] } },
      },
    };
    const spending = await getSpendingContext(sampleFestivalPlan, {
      fetchImpl: vi.fn(async () => jsonResponse(payload)),
    });
    expect(spending.sourceStatus).not.toBe("live");
    expect(spending.confidence).toBe("low");
    expect(spending.basisLabel).toContain("샘플");
  });
  it("loads public-data spending context from the regional tourism demand proxy", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        response: {
          body: {
            items: {
              item: [
                {
                  areaNm: "Seoul",
                  baseYm: "202509",
                  tarExpDsIxCd: "2203",
                  tarExpDsIxNm: "visitor spend per visit",
                  avgSpendPerVisitorKrw: "72000",
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
    expect(requestUrl.searchParams.get("areaCd")).toBe("11");
    expect(requestUrl.searchParams.get("tarExpDsIxCd")).toBe("2203");
  });

  it("uses the selected candidate region and start month for spending lookup", async () => {
    const selectedPlan = {
      ...sampleFestivalPlan,
      name: "Busan Sea Light Festa",
      region: "부산",
      startDate: "2024-05-10",
      endDate: "2024-05-19",
    };
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        response: {
          body: {
            items: {
              item: {
                areaNm: "Busan",
                baseYm: "202405",
                tarExpDsIxNm: "visitor spend per visit",
                avgSpendPerVisitorKrw: "61000",
              },
            },
          },
        },
      }),
    );

    const spending = await getSpendingContext(selectedPlan, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const calls = fetchImpl.mock.calls as unknown as Array<[RequestInfo | URL]>;
    const requestUrl = new URL(String(calls[0][0]), "http://localhost");
    expect(requestUrl.searchParams.get("areaCd")).toBe("26");
    expect(requestUrl.searchParams.get("baseYm")).toBe("202405");
    expect(spending.region).toBe("부산");
    expect(spending.averageSpendPerVisitorKrw).toBe(61_000);
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
