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
  it("returns TourAPI-like fallback data with explicit provenance when the proxy fails", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}, { ok: false, status: 503 }));
    const tourism = await getTourismContext(sampleFestivalPlan, {
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(tourism.provenance.sourceName).toContain("TourAPI");
    expect(tourism.provenance.sourceStatus).toBe("sample-fallback");
    expect(tourism.provenance.collectedPersonalData).toBe(false);
    expect(tourism.provenance.fallbackReason).toContain("호출 실패");
    expect(tourism.nearbySpots[0].category).toContain(sampleFestivalPlan.region);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("creates a region-aware fallback context with a public-data explanation", () => {
    const tourism = createFallbackTourismContext(sampleFestivalPlan, "테스트 실패");

    expect(tourism.provenance.basisText).toContain("샘플");
    expect(tourism.provenance.fallbackReason).toBe("테스트 실패");
    expect(tourism.nearbySpots.every((spot) => spot.category.includes("서울"))).toBe(true);
  });

  it("orchestrates all four TourAPI proxy endpoints without exposing a browser service key", async () => {
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
    const tourism = await getTourismContext(sampleFestivalPlan, { fetchImpl });

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

    const urls = fetchMock.mock.calls.map(([input]) => new URL(String(input), "http://localhost"));
    expect(urls.map((url) => url.pathname)).toEqual([
      "/api/tour/area-code",
      "/api/tour/festivals",
      "/api/tour/detail",
      "/api/tour/nearby",
    ]);
    expect(urls.every((url) => url.searchParams.has("serviceKey"))).toBe(false);
    expect(urls[1].searchParams.get("areaCode")).toBe("1");
    expect(urls[1].searchParams.get("eventStartDate")).toBe("20260918");
    expect(urls[1].searchParams.get("eventEndDate")).toBe("20260920");
    expect(urls[2].searchParams.get("contentId")).toBe("100");
    expect(urls[3].searchParams.get("mapX")).toBe("126.92");
    expect(urls[3].searchParams.get("radius")).toBe("5000");
  });

  it("broadens empty exact-period festival searches to annual same-region TourAPI data", async () => {
    const responses = [
      tourApiPayload([{ code: "1", name: "서울" }]),
      tourApiPayload([], 0),
      tourApiPayload([
        {
          contentid: "300",
          title: "서울라이트 광화문",
          addr1: "서울특별시 종로구",
          eventstartdate: "20251212",
          eventenddate: "20260104",
        },
      ]),
      tourApiPayload([
        {
          contentid: "300",
          title: "서울라이트 광화문",
          addr1: "서울특별시 종로구",
          firstimage: "https://example.com/light.jpg",
          eventstartdate: "20251212",
          eventenddate: "20260104",
          overview: "광화문 일대에서 열리는 빛 축제",
          mapx: "126.9767",
          mapy: "37.5716",
        },
      ]),
      tourApiPayload([
        {
          contentid: "400",
          title: "광화문광장",
          contenttypeid: "12",
          dist: "300",
        },
      ]),
    ];
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => jsonResponse(responses.shift()));

    const tourism = await getTourismContext(sampleFestivalPlan, {
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(tourism.provenance.sourceStatus).toBe("partial-fallback");
    expect(tourism.provenance.fallbackReason).toContain("입력 기간");
    expect(tourism.provenance.fallbackReason).toContain("연간");
    expect(tourism.similarFestivals[0].name).toBe("서울라이트 광화문");

    const urls = fetchMock.mock.calls.map(([input]) => new URL(String(input), "http://localhost"));
    expect(urls.map((url) => url.pathname)).toEqual([
      "/api/tour/area-code",
      "/api/tour/festivals",
      "/api/tour/festivals",
      "/api/tour/detail",
      "/api/tour/nearby",
    ]);
    expect(urls[1].searchParams.get("eventStartDate")).toBe("20260918");
    expect(urls[1].searchParams.get("eventEndDate")).toBe("20260920");
    expect(urls[2].searchParams.get("eventStartDate")).toBe("20260101");
    expect(urls[2].searchParams.get("eventEndDate")).toBe("20261231");
    expect(urls.every((url) => url.searchParams.has("serviceKey"))).toBe(false);
  });

  it("discloses the annual broadened search when missing detail coordinates require sample supplementation", async () => {
    const responses = [
      tourApiPayload([{ code: "1", name: "서울" }]),
      tourApiPayload([], 0),
      tourApiPayload([
        {
          contentid: "300",
          title: "서울라이트 광화문",
          addr1: "서울특별시 종로구",
          eventstartdate: "20251212",
          eventenddate: "20260104",
        },
      ]),
      tourApiPayload([
        {
          contentid: "300",
          title: "서울라이트 광화문",
          addr1: "서울특별시 종로구",
        },
      ]),
    ];
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => jsonResponse(responses.shift()));

    const tourism = await getTourismContext(sampleFestivalPlan, {
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(tourism.provenance.sourceStatus).toBe("partial-fallback");
    expect(tourism.provenance.fallbackReason).toContain("입력 기간");
    expect(tourism.provenance.fallbackReason).toContain("연간");
    expect(tourism.provenance.fallbackReason).toMatch(/부족|샘플.*보완/);
    expect(fetchMock).toHaveBeenCalledTimes(4);
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
      tourApiPayload([], 0),
    ];
    const emptyFestivalFetch = vi.fn(async () =>
      jsonResponse(emptyFestivalResponses.shift()),
    ) as unknown as typeof fetch;

    const [httpFallback, jsonFallback, shapeFallback, itemFallback, regionFallback, emptyFallback] =
      await Promise.all([
        getTourismContext(sampleFestivalPlan, { fetchImpl: httpErrorFetch }),
        getTourismContext(sampleFestivalPlan, { fetchImpl: jsonErrorFetch }),
        getTourismContext(sampleFestivalPlan, {
          fetchImpl: malformedShapeFetch,
        }),
        getTourismContext(sampleFestivalPlan, { fetchImpl: malformedItemFetch }),
        getTourismContext(sampleFestivalPlan, { fetchImpl: missingRegionFetch }),
        getTourismContext(sampleFestivalPlan, { fetchImpl: emptyFestivalFetch }),
      ]);

    expect(httpFallback.provenance.sourceStatus).toBe("sample-fallback");
    expect(jsonFallback.provenance.sourceStatus).toBe("sample-fallback");
    expect(shapeFallback.provenance.sourceStatus).toBe("sample-fallback");
    expect(itemFallback.provenance.sourceStatus).toBe("sample-fallback");
    expect(regionFallback.provenance.fallbackReason).toContain("지역 코드 매핑");
    expect(emptyFallback.provenance.sourceStatus).toBe("sample-fallback");
    expect(emptyFestivalFetch).toHaveBeenCalledTimes(3);

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
