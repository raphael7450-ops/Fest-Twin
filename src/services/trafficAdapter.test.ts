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

  it("returns sample fallback evidence when upstream data is unavailable", async () => {
    const plan = {
      ...sampleFestivalPlan,
      region: "매핑없는지역",
      venueAddress: "매핑없는주소",
    };
    const fetchImpl = vi.fn(async () => jsonResponse({ result: [] }));

    const traffic = await getTrafficContext(plan, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      hour: 14,
    });

    expect(traffic.status).toBe("sample-fallback");
    expect(traffic.links.length).toBeGreaterThan(0);
    expect(traffic.sourceDetails[0].sourceType).toBe("sample");
    expect(traffic.sourceDetails[0].query).toContainEqual({ label: "time", value: "14" });
    expect(JSON.stringify(traffic.sourceDetails)).toContain("샘플 교통량");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("keeps sample fallback traffic evidence aligned with the selected festival region", async () => {
    const daejeonPlan = {
      ...sampleFestivalPlan,
      name: "2025 대덕물빛축제",
      region: "대전",
      venueAddress: "대전 대덕구 대청공원 일원",
      expectedCapacity: 140393,
      startDate: "2025-03-28",
      endDate: "2025-04-26",
    };
    const fetchImpl = vi.fn(async () => jsonResponse({ result: [] }));

    const traffic = await getTrafficContext(daejeonPlan, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      hour: 16,
    });

    const serialized = JSON.stringify(traffic.sourceDetails);
    expect(traffic.status).toBe("sample-fallback");
    expect(traffic.links[0].roadName).toContain("대전");
    expect(serialized).toContain("대전 대덕구");
    expect(serialized).not.toContain("테헤란로");
  });

  it("uses View-T validation traffic with festival-scale adjustment when no local LINKID mapping exists", async () => {
    const apiPayload = {
      result: [
        {
          LINKID: "8890310",
          ROAD_NAME: "하모중앙로",
          ROAD_RANK: "시군도",
          LANES: "2",
          VALUE_IN: "900",
          VALUE_OUT: "700",
        },
      ],
    };
    const fetchImpl = vi.fn(async () => jsonResponse(apiPayload));
    const busanCountdownPlan = {
      ...sampleFestivalPlan,
      name: "부산 카운트다운 축제",
      region: "부산",
      venueAddress: "부산광역시 수영구 광안해변로 219",
      expectedCapacity: 52000,
      startDate: "2025-12-31",
      endDate: "2026-01-01",
    };
    const taeanTulipPlan = {
      ...sampleFestivalPlan,
      name: "태안 세계튤립꽃박람회",
      region: "충남 태안군",
      venueAddress: "충청남도 태안군 안면읍 꽃지해안로",
      expectedCapacity: 12000,
      startDate: "2026-04-10",
      endDate: "2026-05-10",
    };

    const busanTraffic = await getTrafficContext(busanCountdownPlan, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      hour: 23,
    });
    const taeanTraffic = await getTrafficContext(taeanTulipPlan, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      hour: 14,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect(busanTraffic.riskScore).toBeGreaterThan(taeanTraffic.riskScore);
    expect(busanTraffic.links[0].roadName).toContain("부산");
    expect(taeanTraffic.links[0].roadName).toContain("태안");
    expect(
      busanTraffic.sourceDetails.find(
        (detail) => detail.sourceId === "ktdb-viewt-selected-link",
      )?.statusLabel,
    ).toContain("축제 규모 보정");
    expect(JSON.stringify(busanTraffic.sourceDetails)).toContain("행사장 LINKID 매핑 전");
  });

  it("adds EMD origin-destination inflow evidence and risk adjustment for the host area", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");
      if (url.pathname === "/api/traffic/od-emd") {
        return jsonResponse({
          zoneId: "2607065",
          result: [
            {
              ZONEID: "2607065",
              ZONENAME: "부산광역시 수영구 광안2동",
              VALUE_IN: "8400",
              VALUE_OUT: "3100",
            },
          ],
        });
      }
      return jsonResponse({
        result: [
          {
            LINKID: "8890310",
            ROAD_NAME: "하모중앙로",
            ROAD_RANK: "시군도",
            LANES: "2",
            VALUE_IN: "900",
            VALUE_OUT: "700",
          },
        ],
      });
    });
    const busanCountdownPlan = {
      ...sampleFestivalPlan,
      name: "부산 카운트다운 축제",
      region: "부산",
      venueAddress: "부산광역시 수영구 광안해변로 219",
      expectedCapacity: 52000,
      startDate: "2025-12-31",
      endDate: "2026-01-01",
    };

    const traffic = await getTrafficContext(busanCountdownPlan, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      hour: 23,
    });

    const calledPaths = fetchImpl.mock.calls.map((call) =>
      new URL(String(call[0]), "http://localhost").pathname,
    );
    expect(calledPaths).toContain("/api/traffic/selected-link");
    expect(calledPaths).toContain("/api/traffic/od-emd");
    expect(JSON.stringify(traffic.sourceDetails)).toContain("ktdb-viewt-emd-od-inflow");
    expect(JSON.stringify(traffic.sourceDetails)).toContain("부산광역시 수영구 광안2동");
    expect(JSON.stringify(traffic.sourceDetails)).toContain("8,400대/일");
    expect(traffic.riskScore).toBeGreaterThan(60);
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
