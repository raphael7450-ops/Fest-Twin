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
    expect(tourism.sourceDetails?.every((detail) => detail.sourceType === "sample")).toBe(true);
    expect(tourism.sourceDetails).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceId: "sample-nearby-spots",
          records: expect.arrayContaining([
            expect.objectContaining({ label: tourism.nearbySpots[0].name }),
          ]),
        }),
        expect.objectContaining({
          sourceId: "sample-similar-festivals",
          records: expect.arrayContaining([
            expect.objectContaining({ label: tourism.similarFestivals[0].name }),
          ]),
        }),
      ]),
    );
  });

  it("orchestrates all four TourAPI proxy endpoints without exposing a browser service key", async () => {
    const responses = [
      tourApiPayload([{ code: "1", name: "서울" }]),
      tourApiPayload([
        {
          contentid: "100",
          title: "서울세계불꽃축제",
          addr1: "서울특별시 영등포구",
          eventstartdate: "20260904",
          eventenddate: "20260905",
        },
      ]),
      tourApiPayload([
        {
          contentid: "100",
          title: "서울세계불꽃축제",
          addr1: "서울특별시 영등포구",
          firstimage: "https://example.com/festival.jpg",
          eventstartdate: "20260904",
          eventenddate: "20260905",
          overview: "여의도 한강공원에서 열리는 대형 불꽃축제",
          mapx: "126.9347",
          mapy: "37.5283",
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
      name: "서울세계불꽃축제",
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
    expect(urls[1].searchParams.get("eventStartDate")).toBe("20260904");
    expect(urls[1].searchParams.get("eventEndDate")).toBe("20260905");
    expect(urls[2].searchParams.get("contentId")).toBe("100");
    expect(Array.from(urls[2].searchParams.keys()).sort()).toEqual(["contentId"]);
    expect(urls[3].searchParams.get("mapX")).toBe("126.9347");
    expect(urls[3].searchParams.get("radius")).toBe("5000");
  });

  it("uses the selected festival contentId as the tourism context basis", async () => {
    const responses = [
      tourApiPayload([
        {
          contentid: "777",
          title: "Selected River Light Festival",
          addr1: "Seoul River Park",
          firstimage: "https://example.com/selected.jpg",
          eventstartdate: "20260801",
          eventenddate: "20260807",
          overview: "Selected candidate detail",
          mapx: "126.9001",
          mapy: "37.5001",
        },
      ]),
      tourApiPayload([
        {
          contentid: "888",
          title: "Selected Nearby Spot",
          contenttypeid: "12",
          dist: "450",
        },
      ]),
    ];
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) =>
      jsonResponse(responses.shift()),
    );

    const tourism = await getTourismContext(sampleFestivalPlan, {
      fetchImpl: fetchMock as unknown as typeof fetch,
      selectedCandidate: {
        id: "777",
        title: "Selected River Light Festival",
        address: "Seoul River Park",
        startDate: "2026-08-01",
        endDate: "2026-08-07",
        mapX: "126.9001",
        mapY: "37.5001",
        searchScope: "exact-period",
      },
    });

    expect(tourism.similarFestivals[0]).toMatchObject({
      id: "777",
      name: "Selected River Light Festival",
      region: "Seoul River Park",
    });
    expect(tourism.nearbySpots[0]).toMatchObject({
      id: "888",
      name: "Selected Nearby Spot",
      distanceKm: 0.5,
    });

    const urls = fetchMock.mock.calls.map(([input]) => new URL(String(input), "http://localhost"));
    expect(urls.map((url) => url.pathname)).toEqual([
      "/api/tour/detail",
      "/api/tour/nearby",
    ]);
    expect(urls[0].searchParams.get("contentId")).toBe("777");
    expect(urls[1].searchParams.get("mapX")).toBe("126.9001");
    expect(urls[1].searchParams.get("mapY")).toBe("37.5001");
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
          title: "서울세계불꽃축제",
          addr1: "서울특별시 영등포구 여의도 한강공원",
          eventstartdate: "20260904",
          eventenddate: "20260905",
        },
      ]),
      tourApiPayload([
        {
          contentid: "100",
          title: "서울세계불꽃축제",
          addr1: "서울특별시 영등포구 여의도 한강공원",
          firstimage: "https://example.com/festival.jpg",
          eventstartdate: "20260904",
          eventenddate: "20260905",
          mapx: "126.9347",
          mapy: "37.5283",
        },
      ]),
    ];
    const candidateFetchMock = vi.fn(async (_input: RequestInfo | URL) =>
      jsonResponse(candidateResponses.shift()),
    );

    const candidates = await getFestivalCandidates(sampleFestivalPlan, {
      fetchImpl: candidateFetchMock as unknown as typeof fetch,
      today: "2026-08-30",
    });

    expect(candidates).toMatchObject([
      {
        id: "100",
        title: "서울세계불꽃축제",
        address: "서울특별시 영등포구 여의도 한강공원",
        startDate: "2026-09-04",
        endDate: "2026-09-05",
        mapX: "126.9347",
        mapY: "37.5283",
        imageUrl: "https://example.com/festival.jpg",
        searchScope: "exact-period",
      },
    ]);

    const urls = candidateFetchMock.mock.calls.map(([input]) => new URL(String(input), "http://localhost"));
    expect(urls.map((url) => url.pathname)).toEqual([
      "/api/tour/area-code",
      "/api/tour/festivals",
      "/api/tour/detail",
      "/api/tour/detail-intro",
    ]);
    expect(urls[1].searchParams.get("areaCode")).toBe("1");
    expect(urls[1].searchParams.get("eventStartDate")).toBe("20260904");
    expect(urls[2].searchParams.get("contentId")).toBe("100");
  });

  it("attaches every processed candidate record with separate search and detail attribution", async () => {
    const festivalItems = Array.from({ length: 8 }, (_, index) => ({
      contentid: String(3439947 + index),
      title: `축제 후보 ${index + 1}`,
      addr1: "서울특별시 영등포구",
      eventstartdate: "20260904",
      eventenddate: "20260905",
      mapx: "126.9347",
      mapy: "37.5283",
    }));
    const responses = [
      tourApiPayload([{ code: "1", name: "서울" }]),
      tourApiPayload(festivalItems),
      ...festivalItems.map((item) => tourApiPayload([{ ...item, overview: "상세 설명" }])),
    ];
    const fetchImpl = vi.fn(async () => jsonResponse(responses.shift()));

    const candidates = await getFestivalCandidates(sampleFestivalPlan, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      today: "2026-08-30",
    });

    const sourceDetails = candidates[0].sourceDetails ?? [];
    const searchDetail = sourceDetails.find(
      (detail) => detail.endpoint === "/api/tour/festivals",
    );
    const festivalDetails = sourceDetails.filter(
      (detail) => detail.endpoint === "/api/tour/detail",
    );

    expect(candidates).toHaveLength(8);
    expect(searchDetail).toMatchObject({
      sourceName: "TourAPI 축제 정보 조회",
      sourceType: "tourapi",
      endpoint: "/api/tour/festivals",
    });
    expect(searchDetail?.records).toHaveLength(8);
    expect(festivalDetails).toHaveLength(5);
    expect(
      festivalDetails.map((detail) => detail.query?.find((field) => field.label === "contentId")?.value),
    ).toEqual(festivalItems.slice(0, 5).map((item) => item.contentid));
    expect(JSON.stringify(sourceDetails)).toContain("eventStartDate");
    expect(JSON.stringify(sourceDetails)).not.toMatch(/serviceKey/i);
  });

  it("keeps source details on live tourism context lookup", async () => {
    const responses = [
      tourApiPayload([{ code: "1", name: "서울" }]),
      tourApiPayload([
        {
          contentid: "3439947",
          title: "서울세계불꽃축제",
          addr1: "서울특별시 영등포구",
          eventstartdate: "20260904",
          eventenddate: "20260905",
        },
      ]),
      tourApiPayload([
        {
          contentid: "3439947",
          title: "서울세계불꽃축제",
          addr1: "서울특별시 영등포구",
          eventstartdate: "20260904",
          eventenddate: "20260905",
          mapx: "126.9347",
          mapy: "37.5283",
        },
      ]),
      tourApiPayload(
        Array.from({ length: 6 }, (_, index) => ({
          contentid: String(200 + index),
          title: `주변 관광지 ${index + 1}`,
          contenttypeid: "12",
          addr1: "서울특별시 영등포구 영동대로",
          dist: String(750 + index * 100),
          mapx: "127.0588",
          mapy: "37.5126",
        })),
      ),
    ];
    const fetchImpl = vi.fn(async () => jsonResponse(responses.shift()));

    const tourism = await getTourismContext(sampleFestivalPlan, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const serialized = JSON.stringify(tourism.sourceDetails);
    const festivalSearch = tourism.sourceDetails?.find(
      (detail) => detail.endpoint === "/api/tour/festivals",
    );
    const festivalDetail = tourism.sourceDetails?.find(
      (detail) => detail.endpoint === "/api/tour/detail",
    );
    const nearbyDetail = tourism.sourceDetails?.find(
      (detail) => detail.endpoint === "/api/tour/nearby",
    );

    expect(serialized).toContain("/api/tour/festivals");
    expect(festivalSearch?.query).toEqual(
      expect.arrayContaining([{ label: "eventStartDate", value: "20260904" }]),
    );
    expect(festivalDetail?.query).toEqual([{ label: "contentId", value: "3439947" }]);
    expect(serialized).toContain("/api/tour/nearby");
    expect(nearbyDetail?.records).toHaveLength(6);
    expect(tourism.nearbySpots).toHaveLength(6);
    expect(serialized).toContain("contentid");
    expect(serialized).not.toMatch(/serviceKey|clientSecret|Authorization|Cookie/i);
  });

  it("excludes sensitive query fields and raw secret-bearing URLs from source evidence", () => {
    expect(
      safeQueryFields({
        category: "festival",
        cookie: "session=secret",
        callbackUrl: "https://example.com/callback?serviceKey=secret",
        redirect: "/callback?serviceKey=secret",
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
    expect(urls[1].searchParams.get("eventStartDate")).toBe("20260904");
    expect(urls[1].searchParams.get("eventEndDate")).toBe("20260905");
    expect(urls[2].searchParams.get("eventStartDate")).toBe("20260101");
    expect(urls[2].searchParams.get("eventEndDate")).toBe("20261231");
    expect(urls.every((url) => url.searchParams.has("serviceKey"))).toBe(false);
  });

  it("treats TourAPI empty object items as an empty festival result before broadening candidates", async () => {
    const responses = [
      tourApiPayload([{ code: "6", name: "부산" }]),
      {
        response: {
          header: { resultCode: "0000", resultMsg: "OK" },
          body: {
            items: {},
            numOfRows: 10,
            pageNo: 1,
            totalCount: 0,
          },
        },
      },
      tourApiPayload([
        {
          contentid: "600",
          title: "부산 바다 축제",
          addr1: "부산광역시 해운대구",
          eventstartdate: "20260801",
          eventenddate: "20260807",
        },
      ]),
      tourApiPayload([
        {
          contentid: "600",
          title: "부산 바다 축제",
          addr1: "부산광역시 해운대구",
          firstimage: "https://example.com/busan.jpg",
          eventstartdate: "20260801",
          eventenddate: "20260807",
          mapx: "129.1604",
          mapy: "35.1587",
        },
      ]),
    ];
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => jsonResponse(responses.shift()));

    const candidates = await getFestivalCandidates(
      {
        ...sampleFestivalPlan,
        startDate: "2026-08-01",
        endDate: "2026-08-31",
        region: "부산",
      },
      { fetchImpl: fetchMock as unknown as typeof fetch, today: "2026-08-01" },
    );

    expect(candidates).toMatchObject([
      {
        id: "600",
        title: "부산 바다 축제",
        searchScope: "annual-region",
      },
    ]);

    const urls = fetchMock.mock.calls.map(([input]) => new URL(String(input), "http://localhost"));
    expect(urls.map((url) => url.pathname)).toEqual([
      "/api/tour/area-code",
      "/api/tour/festivals",
      "/api/tour/festivals",
      "/api/regional-festivals",
      "/api/tour/detail",
      "/api/tour/detail-intro",
    ]);
    expect(urls[1].searchParams.get("eventStartDate")).toBe("20260801");
    expect(urls[2].searchParams.get("eventStartDate")).toBe("20260101");
  });

  it("fetches a broader festival page and returns deterministic period-overlap candidates", async () => {
    const festivalItems = [
      {
        contentid: "old-1",
        title: "가을 축제",
        addr1: "충청남도 공주시",
        eventstartdate: "20251001",
        eventenddate: "20251003",
      },
      {
        contentid: "period-2",
        title: "겨울 바다 야간 축제",
        addr1: "충청남도 보령시",
        eventstartdate: "20251224",
        eventenddate: "20251228",
      },
      {
        contentid: "period-1",
        title: "연말 해돋이 행사",
        addr1: "충청남도 서천군",
        eventstartdate: "20241231",
        eventenddate: "20250101",
      },
      ...Array.from({ length: 13 }, (_, index) => ({
        contentid: `filler-${index}`,
        title: `가을 후보 ${index}`,
        addr1: "충청남도",
        eventstartdate: "20250901",
        eventenddate: "20250902",
      })),
    ];
    const responses = [
      tourApiPayload([{ code: "34", name: "충남" }]),
      tourApiPayload(festivalItems),
      ...festivalItems.map((item) => tourApiPayload([{ ...item, mapx: "126.1", mapy: "36.3" }])),
    ];
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => jsonResponse(responses.shift()));

    const candidates = await getFestivalCandidates(
      {
        ...sampleFestivalPlan,
        region: "충남",
        startDate: "2025-12-19",
        endDate: "2026-01-03",
      },
      { fetchImpl: fetchMock as unknown as typeof fetch, today: "2025-12-01" },
    );

    expect(candidates.map((candidate) => candidate.id)).toEqual(["period-2"]);
    expect(candidates).toHaveLength(1);

    const urls = fetchMock.mock.calls.map(([input]) => new URL(String(input), "http://localhost"));
    expect(urls[1].searchParams.get("numOfRows")).toBe("50");
  });

  it("supplements sparse TourAPI spring results with regional festival candidates", async () => {
    const responses = [
      tourApiPayload([{ code: "34", name: "충청남도" }]),
      tourApiPayload([
        {
          contentid: "140682",
          title: "서천 마량진항 해넘이 해돋이 행사",
          addr1: "충청남도 서천군 서면 서인로 58",
          eventstartdate: "20241231",
          eventenddate: "20250101",
        },
      ]),
      tourApiPayload([
        {
          contentid: "140682",
          title: "서천 마량진항 해넘이 해돋이 행사",
          addr1: "충청남도 서천군 서면 서인로 58",
          eventstartdate: "20241231",
          eventenddate: "20250101",
        },
      ]),
    ];
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => jsonResponse(responses.shift()));

    const candidates = await getFestivalCandidates(
      {
        ...sampleFestivalPlan,
        region: "충청남도",
        startDate: "2025-01-01",
        endDate: "2025-05-31",
      },
      { fetchImpl: fetchMock as unknown as typeof fetch, today: "2025-01-01" },
    );

    expect(candidates.map((candidate) => candidate.title)).toEqual(
      expect.arrayContaining([
        "논산딸기축제",
        "서천 동백꽃주꾸미축제",
        "태안 세계튤립꽃박람회",
        "공주 석장리 구석기축제",
      ]),
    );
    expect(candidates.some((candidate) => candidate.searchScope === "regional-supplement")).toBe(true);
  });

  it("matches abbreviated Korean regions to official TourAPI area names", async () => {
    const responses = [
      tourApiPayload([{ code: "34", name: "충청남도" }]),
      tourApiPayload([], 0),
      tourApiPayload([], 0),
    ];
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => jsonResponse(responses.shift()));

    await getFestivalCandidates(
      {
        ...sampleFestivalPlan,
        region: "충남",
        startDate: "2025-01-01",
        endDate: "2025-05-31",
      },
      { fetchImpl: fetchMock as unknown as typeof fetch, today: "2025-01-01" },
    );

    const urls = fetchMock.mock.calls.map(([input]) => new URL(String(input), "http://localhost"));
    expect(urls[1].searchParams.get("areaCode")).toBe("34");
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
          statusLabel: "조회하지 않음: 축제 좌표 없음",
        }),
        expect.objectContaining({ sourceId: "sample-nearby-spots" }),
      ]),
    );
    expect(tourism.sourceDetails).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceId: "sample-similar-festivals" }),
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
    expect(keywords).toContain("서울세계불꽃축제");
    expect(keywords.every((keyword) => sampleFestivalPlan.keywords.includes(keyword))).toBe(true);
  });
  it("maps Naver DataLab proxy results into trend context evidence", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        sourceStatus: "live",
        sourceName: "Naver DataLab search trend",
        retrievedAt: "2026-07-28T00:00:00.000Z",
        results: [
          {
            title: "festival",
            keywords: ["festival", "winter festival"],
            data: [
              { period: "2026-07-07", ratio: 20 },
              { period: "2026-07-14", ratio: 40 },
              { period: "2026-07-21", ratio: 80 },
            ],
          },
        ],
      }),
    );

    const trends = await getTrendContext(sampleFestivalPlan, {
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(trends.provenance.sourceStatus).toBe("live");
    expect(trends.provenance.sourceName).toContain("Naver DataLab");
    expect(trends.searchInterestScore).toBe(47);
    expect(trends.trendAcceleration).toBe(60);
    expect(trends.points).toEqual([
      { period: "2026-07-07", ratio: 20 },
      { period: "2026-07-14", ratio: 40 },
      { period: "2026-07-21", ratio: 80 },
    ]);
    expect(trends.sourceDetails?.[0]).toMatchObject({
      sourceName: "Naver DataLab search trend",
      sourceType: "derived",
      endpoint: "/api/trends/naver-search",
    });
    expect(JSON.stringify(trends.sourceDetails)).not.toMatch(
      /clientSecret|serviceKey|Authorization|Cookie/i,
    );
  });
});
