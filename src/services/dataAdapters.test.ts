import { describe, expect, it, vi } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import {
  createFallbackTourismContext,
  getFestivalCandidates,
  getTourApiAreaCodes,
  getTourismContext,
  mapTourApiItemsToTourismContext,
  safeQueryFields,
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
          title: "강남 미디어 윈터페스타",
          addr1: "서울특별시 강남구",
          eventstartdate: "20251219",
          eventenddate: "20260103",
        },
      ]),
      tourApiPayload([
        {
          contentid: "100",
          title: "강남 미디어 윈터페스타",
          addr1: "서울특별시 강남구",
          firstimage: "https://example.com/festival.jpg",
          eventstartdate: "20251219",
          eventenddate: "20260103",
          overview: "강남 도심에서 미디어아트와 빛 연출이 함께 열리는 겨울 축제",
          mapx: "127.0610",
          mapy: "37.5103",
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
      name: "강남 미디어 윈터페스타",
      region: "서울특별시 강남구",
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
    expect(urls[1].searchParams.get("eventStartDate")).toBe("20251219");
    expect(urls[1].searchParams.get("eventEndDate")).toBe("20260103");
    expect(urls[2].searchParams.get("contentId")).toBe("100");
    expect(Array.from(urls[2].searchParams.keys()).sort()).toEqual(["contentId"]);
    expect(urls[3].searchParams.get("mapX")).toBe("127.0610");
    expect(urls[3].searchParams.get("radius")).toBe("5000");
  });

  it("returns region codes and festival candidates for the planning selector", async () => {
    const areaFetchMock = vi.fn(async () =>
      jsonResponse(
        tourApiPayload([
          { code: "1", name: "서울" },
          { code: "6", name: "부산" },
        ]),
      ),
    );

    await expect(
      getTourApiAreaCodes({ fetchImpl: areaFetchMock as unknown as typeof fetch }),
    ).resolves.toEqual([
      { code: "1", name: "서울" },
      { code: "6", name: "부산" },
    ]);

    const candidateResponses = [
      tourApiPayload([{ code: "1", name: "서울" }]),
      tourApiPayload([
        {
          contentid: "100",
          title: "강남 미디어 윈터페스타",
          addr1: "서울특별시 강남구 영동대로 511",
          eventstartdate: "20251219",
          eventenddate: "20260103",
        },
      ]),
      tourApiPayload([
        {
          contentid: "100",
          title: "강남 미디어 윈터페스타",
          addr1: "서울특별시 강남구 영동대로 511",
          firstimage: "https://example.com/festival.jpg",
          eventstartdate: "20251219",
          eventenddate: "20260103",
          mapx: "127.0610512042",
          mapy: "37.5103955843",
        },
      ]),
    ];
    const candidateFetchMock = vi.fn(async (_input: RequestInfo | URL) =>
      jsonResponse(candidateResponses.shift()),
    );

    const candidates = await getFestivalCandidates(sampleFestivalPlan, {
      fetchImpl: candidateFetchMock as unknown as typeof fetch,
    });

    expect(candidates).toMatchObject([
      {
        id: "100",
        title: "강남 미디어 윈터페스타",
        address: "서울특별시 강남구 영동대로 511",
        startDate: "2025-12-19",
        endDate: "2026-01-03",
        mapX: "127.0610512042",
        mapY: "37.5103955843",
        imageUrl: "https://example.com/festival.jpg",
        searchScope: "exact-period",
      },
    ]);

    const urls = candidateFetchMock.mock.calls.map(([input]) => new URL(String(input), "http://localhost"));
    expect(urls.map((url) => url.pathname)).toEqual([
      "/api/tour/area-code",
      "/api/tour/festivals",
      "/api/tour/detail",
    ]);
    expect(urls[1].searchParams.get("areaCode")).toBe("1");
    expect(urls[1].searchParams.get("eventStartDate")).toBe("20251219");
    expect(urls[2].searchParams.get("contentId")).toBe("100");
  });

  it("attaches safe source details to festival candidates", async () => {
    const responses = [
      tourApiPayload([{ code: "1", name: "서울" }]),
      tourApiPayload([
        {
          contentid: "3439947",
          title: "강남 미디어 윈터페스타",
          addr1: "서울특별시 강남구",
          eventstartdate: "20261201",
          eventenddate: "20261231",
          mapx: "127.0276",
          mapy: "37.4979",
        },
      ]),
      tourApiPayload([
        {
          contentid: "3439947",
          title: "강남 미디어 윈터페스타",
          addr1: "서울특별시 강남구",
          eventstartdate: "20261201",
          eventenddate: "20261231",
          mapx: "127.0276",
          mapy: "37.4979",
        },
      ]),
    ];
    const fetchImpl = vi.fn(async () => jsonResponse(responses.shift()));

    const candidates = await getFestivalCandidates(sampleFestivalPlan, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(candidates[0].sourceDetails?.[0]).toMatchObject({
      sourceName: "TourAPI 축제 정보 조회",
      sourceType: "tourapi",
      endpoint: "/api/tour/festivals",
    });
    expect(JSON.stringify(candidates[0].sourceDetails)).toContain("3439947");
    expect(JSON.stringify(candidates[0].sourceDetails)).toContain("eventStartDate");
    expect(JSON.stringify(candidates[0].sourceDetails)).not.toMatch(/serviceKey/i);
  });

  it("keeps source details on live tourism context lookup", async () => {
    const responses = [
      tourApiPayload([{ code: "1", name: "서울" }]),
      tourApiPayload([
        {
          contentid: "3439947",
          title: "강남 미디어 윈터페스타",
          addr1: "서울특별시 강남구",
          eventstartdate: "20261201",
          eventenddate: "20261231",
        },
      ]),
      tourApiPayload([
        {
          contentid: "3439947",
          title: "강남 미디어 윈터페스타",
          addr1: "서울특별시 강남구",
          eventstartdate: "20261201",
          eventenddate: "20261231",
          mapx: "127.0276",
          mapy: "37.4979",
        },
      ]),
      tourApiPayload([
        {
          contentid: "200",
          title: "코엑스",
          contenttypeid: "12",
          addr1: "서울특별시 강남구 영동대로",
          dist: "750",
          mapx: "127.0588",
          mapy: "37.5126",
        },
      ]),
    ];
    const fetchImpl = vi.fn(async () => jsonResponse(responses.shift()));

    const tourism = await getTourismContext(sampleFestivalPlan, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const serialized = JSON.stringify(tourism.sourceDetails);

    expect(serialized).toContain("/api/tour/festivals");
    expect(serialized).toContain("/api/tour/nearby");
    expect(serialized).toContain("contentid");
    expect(serialized).not.toMatch(/serviceKey|clientSecret|Authorization|Cookie/i);
  });

  it("excludes sensitive query fields and raw secret-bearing URLs from source evidence", () => {
    expect(
      safeQueryFields({
        category: "festival",
        cookie: "session=secret",
        callbackUrl: "https://example.com/callback?serviceKey=secret",
      }),
    ).toEqual([{ label: "category", value: "festival" }]);
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
    expect(urls[1].searchParams.get("eventStartDate")).toBe("20251219");
    expect(urls[1].searchParams.get("eventEndDate")).toBe("20260103");
    expect(urls[2].searchParams.get("eventStartDate")).toBe("20250101");
    expect(urls[2].searchParams.get("eventEndDate")).toBe("20251231");
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
    expect(tourism.sourceDetails).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          endpoint: "/api/tour/nearby",
          statusLabel: "Not queried: festival coordinates unavailable",
        }),
      ]),
    );
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
    expect(keywords).toContain("미디어아트");
    expect(keywords.every((keyword) => sampleFestivalPlan.keywords.includes(keyword))).toBe(true);
  });
});
