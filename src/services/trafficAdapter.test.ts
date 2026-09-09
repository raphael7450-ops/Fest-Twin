import { afterEach, describe, expect, it, vi } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import { trafficLinkMappings } from "../data/sampleTraffic";
import { createFallbackTrafficContext, getTrafficContext } from "./trafficAdapter";

afterEach(() => vi.restoreAllMocks());

const observations = {
  year: 2024,
  result: [{ LINKID: "9991234", ROAD_NAME: "검증된 테스트 도로", LANES: 6, VALUE_IN: 3200, VALUE_OUT: 2800 }],
};

function useVerifiedTestMapping() {
  const mapping = {
    id: "test-verified", regionKeyword: "서울", linkId: "9991234",
    roadName: "검증된 테스트 도로", note: "Test fixture only", verified: true,
  };
  vi.spyOn(trafficLinkMappings, "find").mockReturnValue(mapping);
}

describe("trafficAdapter geographic and temporal validity", () => {
  it.each([
    ["서울", "서울 종로구 광화문광장"],
    ["부산", "부산 사하구 다대포해변공원"],
    ["대전", "대전 대덕구 대청공원"],
  ])("does not use example or unrelated links for %s", async (region, venueAddress) => {
    const fetchImpl = vi.fn(async () => Response.json(observations));
    const context = await getTrafficContext({ ...sampleFestivalPlan, region, venueAddress }, { fetchImpl, hour: 14 });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(context.status).toBe("sample-fallback");
    expect(context.links[0].roadName).toContain(region);
    expect(context.sourceDetails[0].sourceType).toBe("sample");
    expect(context.provenance.fallbackReason).toContain("미검증");
    expect(JSON.stringify(context)).not.toContain("검증된 테스트 도로");
  });

  it("retains date and hour for a verified link request", async () => {
    useVerifiedTestMapping();
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => Response.json(
      String(input).includes("od-emd") ? { result: [] } : observations,
    ));
    const context = await getTrafficContext({ ...sampleFestivalPlan, startDate: "2026-02-11", endDate: "2026-02-12" }, { fetchImpl, hour: 9 });
    expect(context.links[0].totalVolume).toBe(6000);
    const url = new URL(String(fetchImpl.mock.calls[0][0]), "http://localhost");
    expect(url.searchParams.get("linkId")).toBe("9991234");
    expect(url.searchParams.get("year")).toBe("2024");
    expect(url.searchParams.get("weekType")).toBe("weekday");
    expect(url.searchParams.get("time")).toBe("9");
  });

  it.each([{ ...observations, _fallback: true }, { ...observations, year: 2025 }, { result: [] }])(
    "does not use fallback, wrong-year, or empty observations: %j", async (payload) => {
      useVerifiedTestMapping();
      const context = await getTrafficContext(sampleFestivalPlan, { fetchImpl: async () => Response.json(payload) });
      expect(context.status).toBe("sample-fallback");
      expect(JSON.stringify(context.sourceDetails)).not.toContain("기준연도 교통량 조회 성공");
    },
  );

  it("propagates cancellation instead of converting it to sample data", async () => {
    useVerifiedTestMapping();
    const controller = new AbortController();
    controller.abort();
    await expect(getTrafficContext(sampleFestivalPlan, {
      signal: controller.signal,
      fetchImpl: async () => { throw new DOMException("Aborted", "AbortError"); },
    })).rejects.toMatchObject({ name: "AbortError" });
  });

  it("does not introduce personal data into sample context", () => {
    const context = createFallbackTrafficContext(sampleFestivalPlan, "test", 18);
    expect(context.provenance.collectedPersonalData).toBe(false);
    expect(context.provenance.fallbackReason).toBe("test");
    expect(JSON.stringify(context.sourceDetails)).not.toMatch(/serviceKey|clientSecret|Authorization|Cookie/i);
  });
});
