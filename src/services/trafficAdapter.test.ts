import { describe, expect, it, vi } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import {
  createFallbackTrafficContext,
  getTrafficContext,
} from "./trafficAdapter";

function jsonResponse(payload: unknown, options: { ok?: boolean; status?: number } = {}) {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: async () => payload,
  } as Response;
}

describe("trafficAdapter", () => {
  it("loads KTDB/View-T link traffic as a normalized traffic context", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL) =>
      jsonResponse({
        result: [
          {
            LINKID: "1000001",
            ROAD_NAME: "동문로",
            ROAD_RANK: "시군도",
            LANES: "6",
            VALUE_IN: "3200",
            VALUE_OUT: "2800",
          },
        ],
      }),
    );

    const traffic = await getTrafficContext(sampleFestivalPlan, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      hour: 20,
    });

    expect(traffic.status).toBe("mapped-sample");
    expect(traffic.provenance.sourceStatus).toBe("partial-fallback");
    expect(traffic.year).toBe(2024);
    expect(traffic.weekType).toBe("weekend");
    expect(traffic.time).toBe("20");
    expect(traffic.links[0]).toMatchObject({
      linkId: "1000001",
      roadName: "동문로",
      inboundVolume: 3200,
      outboundVolume: 2800,
      totalVolume: 6000,
    });
    expect(traffic.riskScore).toBeGreaterThan(0);
    expect(JSON.stringify(traffic.sourceDetails)).toContain("KTDB/View-T 선택 링크 교통량 조회");

    const requestUrl = new URL(String(fetchImpl.mock.calls[0][0]), "http://localhost");
    expect(requestUrl.pathname).toBe("/api/traffic/selected-link");
    expect(requestUrl.searchParams.get("linkId")).toBe("1000001");
    expect(requestUrl.searchParams.get("year")).toBe("2024");
    expect(requestUrl.searchParams.get("weekType")).toBe("weekend");
    expect(requestUrl.searchParams.get("time")).toBe("20");
  });

  it("uses the selected candidate address, date, and hour for traffic lookup", async () => {
    const selectedPlan = {
      ...sampleFestivalPlan,
      name: "Seoul Light Hangang Festa",
      venueAddress: "서울특별시 종로구 광화문광장",
      startDate: "2026-02-11",
      endDate: "2026-02-12",
    };
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        result: [
          {
            LINKID: "1000001",
            ROAD_NAME: "세종대로",
            ROAD_RANK: "주간선도로",
            LANES: "8",
            VALUE_IN: "1400",
            VALUE_OUT: "1100",
          },
        ],
      }),
    );

    const traffic = await getTrafficContext(selectedPlan, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      hour: 9,
    });

    const calls = fetchImpl.mock.calls as unknown as Array<[RequestInfo | URL]>;
    const requestUrl = new URL(String(calls[0][0]), "http://localhost");
    expect(requestUrl.searchParams.get("linkId")).toBe("1000001");
    expect(requestUrl.searchParams.get("weekType")).toBe("weekday");
    expect(requestUrl.searchParams.get("time")).toBe("9");
    expect(traffic.links[0].roadName).toBe("세종대로");
  });

  it("returns sample fallback evidence when no mapping or upstream data is available", async () => {
    const plan = {
      ...sampleFestivalPlan,
      region: "매핑없는지역",
      venueAddress: "매핑없는주소",
    };
    const fetchImpl = vi.fn();

    const traffic = await getTrafficContext(plan, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      hour: 14,
    });

    expect(traffic.status).toBe("sample-fallback");
    expect(traffic.links.length).toBeGreaterThan(0);
    expect(traffic.sourceDetails[0].sourceType).toBe("sample");
    expect(traffic.sourceDetails[0].query).toContainEqual({ label: "time", value: "14" });
    expect(JSON.stringify(traffic.sourceDetails)).toContain("샘플 교통량");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("creates fallback traffic context without personal data", () => {
    const traffic = createFallbackTrafficContext(sampleFestivalPlan, "테스트 fallback", 18);

    expect(traffic.provenance.collectedPersonalData).toBe(false);
    expect(traffic.provenance.fallbackReason).toBe("테스트 fallback");
    expect(JSON.stringify(traffic.sourceDetails)).not.toMatch(
      /serviceKey|clientSecret|Authorization|Cookie/i,
    );
  });
});
