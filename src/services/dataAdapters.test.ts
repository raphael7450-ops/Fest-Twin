import { describe, expect, it, vi } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import {
  createFallbackTourismContext,
  getTourismContext,
  mapTourApiItemsToTourismContext,
} from "./tourApiAdapter";
import { getTrendContext } from "./trendAdapter";

function tourApiPayload(items: unknown, totalCount?: number) {
  const normalizedCount = totalCount ?? (Array.isArray(items) ? items.length : 1);

  return {
    response: {
      header: { resultCode: "0000", resultMsg: "OK" },
      body: {
        items: normalizedCount === 0 ? "" : { item: items },
        numOfRows: 10,
        pageNo: 1,
        totalCount: normalizedCount,
      },
    },
  };
}

function jsonResponse(payload: unknown, options: { ok?: boolean; status?: number } = {}) {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: async () => payload,
  } as Response;
}

describe("public data adapters", () => {
  it("returns TourAPI-like fallback data with explicit provenance when no API key is configured", async () => {
    const fetchMock = vi.fn();
    const tourism = await getTourismContext(sampleFestivalPlan, {
      apiKey: "",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(tourism.provenance.sourceName).toContain("TourAPI");
    expect(tourism.provenance.sourceStatus).toBe("sample-fallback");
    expect(tourism.provenance.collectedPersonalData).toBe(false);
    expect(tourism.provenance.fallbackReason).toContain("인증키");
    expect(tourism.nearbySpots[0].category).toContain(sampleFestivalPlan.region);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("creates a region-aware fallback context with a public-data explanation", () => {
    const tourism = createFallbackTourismContext(sampleFestivalPlan, "테스트 실패");

    expect(tourism.provenance.basisText).toContain("샘플");
    expect(tourism.provenance.fallbackReason).toBe("테스트 실패");
    expect(tourism.nearbySpots.every((spot) => spot.category.includes("서울"))).toBe(true);
  });

  it("orchestrates all four TourAPI endpoints with decoded-key URL parameters", async () => {
    const responses = [
      tourApiPayload([{ code: "1", name: "서울" }]),
      tourApiPayload([
        {
          contentid: "100",
          title: "한강 K-POP 푸드 축제",
          addr1: "서울특별시 영등포구",
          eventstartdate: "20260918",
          eventenddate: "20260920",
        },
      ]),
      tourApiPayload([
        {
          contentid: "100",
          title: "한강 K-POP 푸드 축제",
          addr1: "서울특별시 영등포구",
          firstimage: "https://example.com/festival.jpg",
          eventstartdate: "20260918",
          eventenddate: "20260920",
          overview: "한강 먹거리와 K-POP 공연이 함께 열리는 축제",
          mapx: "126.92",
          mapy: "37.52",
        },
      ]),
      tourApiPayload([
        {
          contentid: "200",
          title: "여의도 한강공원",
          contenttypeid: "12",
          dist: "800",
        },
      ]),
    ];
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) =>
      jsonResponse(responses.shift()),
    );
    const fetchImpl = fetchMock as unknown as typeof fetch;
    const apiKey = "test-key+/=";

    const tourism = await getTourismContext(sampleFestivalPlan, { apiKey, fetchImpl });

    expect(tourism.provenance.sourceStatus).toBe("live");
    expect(tourism.similarFestivals[0]).toMatchObject({
      id: "100",
      name: "한강 K-POP 푸드 축제",
      region: "서울특별시 영등포구",
    });
    expect(tourism.nearbySpots[0]).toMatchObject({
      id: "200",
      name: "여의도 한강공원",
      category: "관광지",
      distanceKm: 0.8,
    });

    const urls = fetchMock.mock.calls.map(([input]) => new URL(String(input)));
    expect(urls.map((url) => url.pathname.split("/").at(-1))).toEqual([
      "areaCode2",
      "searchFestival2",
      "detailCommon2",
      "locationBasedList2",
    ]);
    expect(urls.every((url) => url.searchParams.get("serviceKey") === apiKey)).toBe(true);
    expect(String(fetchMock.mock.calls[0][0])).toContain("serviceKey=test-key%2B%2F%3D");
    expect(String(fetchMock.mock.calls[0][0])).not.toContain("%252B");
    expect(urls[1].searchParams.get("areaCode")).toBe("1");
    expect(urls[1].searchParams.get("eventStartDate")).toBe("20260918");
    expect(urls[1].searchParams.get("eventEndDate")).toBe("20260920");
    expect(urls[2].searchParams.get("contentId")).toBe("100");
    expect(urls[3].searchParams.get("mapX")).toBe("126.92");
    expect(urls[3].searchParams.get("radius")).toBe("5000");
  });

  it("rejects unreliable live data and preserves full versus partial fallback semantics", async () => {
    const httpErrorFetch = vi.fn(async () =>
      jsonResponse({}, { ok: false, status: 503 }),
    ) as unknown as typeof fetch;
    const jsonErrorFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => Promise.reject(new SyntaxError("invalid JSON")),
    })) as unknown as typeof fetch;
    const malformedShapeFetch = vi.fn(async () =>
      jsonResponse({ response: { body: { items: { item: [] } } } }),
    ) as unknown as typeof fetch;
    const malformedItemFetch = vi.fn(async () =>
      jsonResponse(tourApiPayload([{ name: "필수 필드 누락" }])),
    ) as unknown as typeof fetch;
    const missingRegionFetch = vi.fn(async () =>
      jsonResponse(tourApiPayload([{ code: "6", name: "부산" }])),
    ) as unknown as typeof fetch;
    const emptyFestivalResponses = [
      tourApiPayload([{ code: "1", name: "서울" }]),
      tourApiPayload([], 0),
    ];
    const emptyFestivalFetch = vi.fn(async () =>
      jsonResponse(emptyFestivalResponses.shift()),
    ) as unknown as typeof fetch;

    const [httpFallback, jsonFallback, shapeFallback, itemFallback, regionFallback, emptyFallback] =
      await Promise.all([
        getTourismContext(sampleFestivalPlan, { apiKey: "test-key", fetchImpl: httpErrorFetch }),
        getTourismContext(sampleFestivalPlan, { apiKey: "test-key", fetchImpl: jsonErrorFetch }),
        getTourismContext(sampleFestivalPlan, {
          apiKey: "test-key",
          fetchImpl: malformedShapeFetch,
        }),
        getTourismContext(sampleFestivalPlan, { apiKey: "test-key", fetchImpl: malformedItemFetch }),
        getTourismContext(sampleFestivalPlan, { apiKey: "test-key", fetchImpl: missingRegionFetch }),
        getTourismContext(sampleFestivalPlan, { apiKey: "test-key", fetchImpl: emptyFestivalFetch }),
      ]);

    expect(httpFallback.provenance.sourceStatus).toBe("sample-fallback");
    expect(jsonFallback.provenance.sourceStatus).toBe("sample-fallback");
    expect(shapeFallback.provenance.sourceStatus).toBe("sample-fallback");
    expect(itemFallback.provenance.sourceStatus).toBe("sample-fallback");
    expect(regionFallback.provenance.fallbackReason).toContain("지역 코드 매핑");
    expect(emptyFallback.provenance.sourceStatus).toBe("sample-fallback");

    const noLiveRecords = mapTourApiItemsToTourismContext(
      sampleFestivalPlan,
      [{ contentid: "100", title: "주소 없는 축제" }],
      [{ contentid: "200", title: "거리 없는 관광지", contenttypeid: "12" }],
      "2026-07-16T00:00:00.000Z",
    );
    expect(noLiveRecords.provenance.sourceStatus).toBe("sample-fallback");

    const partial = mapTourApiItemsToTourismContext(
      sampleFestivalPlan,
      [{ contentid: "100", title: "유효한 축제", addr1: "서울" }],
      [],
      "2026-07-16T00:00:00.000Z",
    );
    expect(partial.provenance.sourceStatus).toBe("partial-fallback");
    expect(partial.similarFestivals[0].name).toBe("유효한 축제");
  });

  it("returns non-personal trend signals filtered by festival keywords", async () => {
    const trends = await getTrendContext(sampleFestivalPlan);
    const keywords = trends.signals.map((signal) => signal.keyword);

    expect(trends.provenance.collectedPersonalData).toBe(false);
    expect(keywords).toContain("K-POP");
    expect(keywords.every((keyword) => sampleFestivalPlan.keywords.includes(keyword))).toBe(true);
  });
});
