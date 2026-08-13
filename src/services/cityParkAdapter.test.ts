import { describe, expect, it, vi } from "vitest";
import {
  deriveCityParkQuery,
  lookupCityParkCandidates,
  rankCityParkCandidates,
} from "./cityParkAdapter";

function park(overrides: Record<string, unknown> = {}) {
  return {
    id: "PARK-001",
    name: "여의도한강공원",
    type: "근린공원",
    roadAddress: "서울특별시 영등포구 여의공원로 68",
    lotAddress: "서울특별시 영등포구 여의도동 2",
    latitude: 37.5268,
    longitude: 126.922,
    areaSquareMeters: 229539,
    managementOrganization: "서울특별시",
    referenceDate: "2026-01-01",
    ...overrides,
  };
}

function jsonResponse(payload: unknown, options: { ok?: boolean; status?: number } = {}) {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: async () => payload,
  } as Response;
}

describe("cityParkAdapter", () => {
  it("extracts the first park name from a multi-park address", () => {
    expect(deriveCityParkQuery("여의도 한강공원 및 이촌 한강공원 일대"))
      .toBe("여의도 한강공원");
  });

  it("returns an empty query for an address without a park", () => {
    expect(deriveCityParkQuery("서울특별시 종로구 세종대로 175"))
      .toBe("");
  });

  it("ranks exact normalized park names before regional and address matches", () => {
    const result = rankCityParkCandidates(
      [
        park({ id: "other", name: "여의도공원", roadAddress: "서울특별시 영등포구 국제금융로" }),
        park({ id: "target", name: "여의도 한강공원" }),
      ],
      {
        venueName: "서울세계불꽃축제",
        venueAddress: "서울특별시 영등포구 여의도 한강공원 일대",
        region: "서울",
        coordinates: { latitude: 37.528, longitude: 126.934 },
      },
    );

    expect(result[0]).toMatchObject({ id: "target", name: "여의도 한강공원" });
    expect(result[0].matchScore).toBeGreaterThan(result[1].matchScore);
  });

  it("recognizes abbreviated Korean regions and road or lot address overlap", () => {
    const result = rankCityParkCandidates(
      [
        park({ id: "road", name: "노들섬공원", roadAddress: "서울특별시 용산구 이촌로 29" }),
        park({ id: "lot", name: "이촌공원", lotAddress: "서울 용산구 이촌동 302-146" }),
        park({ id: "other", name: "부산공원", roadAddress: "부산광역시 해운대구 해운대로" }),
      ],
      {
        venueName: "음악 축제",
        venueAddress: "서울 용산구 이촌동 302-146 이촌로 29",
        region: "서울",
      },
    );

    expect(result.slice(0, 2).map((candidate) => candidate.id)).toEqual(["lot", "road"]);
    expect(result[1].matchScore).toBeGreaterThan(result[2].matchScore);
  });

  it("uses Haversine distance as a deterministic tie breaker", () => {
    const result = rankCityParkCandidates(
      [
        park({
          id: "far",
          name: "동일공원",
          lotAddress: "서울특별시 영등포구 여의도동 3",
          latitude: 37.7,
          longitude: 127.2,
        }),
        park({ id: "near", name: "동일공원", latitude: 37.528, longitude: 126.934 }),
      ],
      {
        venueName: "행사",
        venueAddress: "서울특별시 영등포구",
        region: "서울",
        coordinates: { latitude: 37.528, longitude: 126.934 },
      },
    );

    expect(result.map((candidate) => candidate.id)).toEqual(["near", "far"]);
  });

  it("collapses duplicate park identities and keeps Korean display names intact", () => {
    const result = rankCityParkCandidates(
      [
        park({ id: "duplicate-b", name: "여의도 한강공원" }),
        park({ id: "duplicate-a", name: "여의도 한강공원" }),
      ],
      {
        venueName: "여의도한강공원 축제",
        venueAddress: "서울특별시 영등포구 여의도 한강공원",
        region: "서울",
      },
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "duplicate-a", name: "여의도 한강공원" });
  });

  it("discards invalid areas and coordinates without making ranking fail", () => {
    const result = rankCityParkCandidates(
      [
        park({ id: "zero", areaSquareMeters: 0 }),
        park({ id: "negative", areaSquareMeters: -1 }),
        park({ id: "invalid-coordinate", latitude: 91, longitude: 126.922 }),
      ],
      {
        venueName: "여의도한강공원 축제",
        venueAddress: "서울특별시 영등포구 여의도 한강공원",
        region: "서울",
        coordinates: { latitude: 91, longitude: 126.934 },
      },
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "invalid-coordinate", latitude: undefined, longitude: undefined });
  });

  it("limits ranked candidates to ten results", () => {
    const result = rankCityParkCandidates(
      Array.from({ length: 12 }, (_, index) => park({ id: `park-${index}`, name: `서울공원${index}` })),
      { venueName: "", venueAddress: "서울특별시", region: "서울" },
    );

    expect(result).toHaveLength(10);
  });

  it("validates the normalized proxy response and forwards the abort signal", async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ items: [park()], totalCount: 1 }),
    );

    const result = await lookupCityParkCandidates(
      {
        venueName: "서울세계불꽃축제",
        venueAddress: "서울특별시 영등포구 여의도 한강공원 일대",
        region: "서울",
      },
      { signal: controller.signal, fetchImpl: fetchMock as unknown as typeof fetch },
    );

    expect(result[0]).toMatchObject({ id: "PARK-001", matchScore: expect.any(Number) });
    expect(new URL(String(fetchMock.mock.calls[0][0]), "http://localhost").pathname)
      .toBe("/api/city-parks");
    expect(new URL(String(fetchMock.mock.calls[0][0]), "http://localhost").searchParams.get("query"))
      .toBe("여의도 한강공원");
    expect(fetchMock.mock.calls[0][1]).toEqual({ signal: controller.signal });
  });

  it("rejects malformed proxy payloads", async () => {
    await expect(
      lookupCityParkCandidates(
        {
          venueName: "여의도 축제",
          venueAddress: "여의도 한강공원",
          region: "서울",
        },
        { fetchImpl: vi.fn(async () => jsonResponse({ items: "invalid" })) as unknown as typeof fetch },
      ),
    ).rejects.toThrow("City park response items are invalid");
  });

  it("does not request the proxy for a non-park address", async () => {
    const fetchMock = vi.fn();

    await expect(
      lookupCityParkCandidates(
        { venueName: "도심 축제", venueAddress: "서울특별시 종로구 세종대로 175", region: "서울" },
        { fetchImpl: fetchMock as unknown as typeof fetch },
      ),
    ).resolves.toEqual([]);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
