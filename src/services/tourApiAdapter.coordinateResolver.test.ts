import { describe, expect, it, vi } from "vitest";
import { resolveFestivalCoordinatesByKeyword } from "./tourApiAdapter";

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

function jsonResponse(payload: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => payload,
  } as Response;
}

describe("TourAPI festival coordinate resolver", () => {
  it("prefers an exact normalized festival title in the requested region", async () => {
    let requestedUrl = "";
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      requestedUrl = String(input);
      return jsonResponse(
        tourApiPayload([
          {
            contentid: "other-1",
            title: "서울라이트 한강 빛섬축제",
            addr1: "서울특별시 용산구 노들섬",
            mapx: "126.9584",
            mapy: "37.5177",
          },
          {
            contentid: "3073454",
            title: "서울라이트 광화문",
            addr1: "서울특별시 종로구 세종로 1-68",
            mapx: "126.9767821434",
            mapy: "37.5716786179",
          },
        ]),
      );
    });

    const result = await resolveFestivalCoordinatesByKeyword(
      { title: "2026 서울라이트 광화문", region: "서울" },
      { fetchImpl: fetchMock as unknown as typeof fetch },
    );

    expect(result).toEqual({
      contentId: "3073454",
      title: "서울라이트 광화문",
      address: "서울특별시 종로구 세종로 1-68",
      mapX: "126.9767821434",
      mapY: "37.5716786179",
    });
    const requestUrl = new URL(requestedUrl, "http://localhost");
    expect(requestUrl.pathname).toBe("/api/tour/keyword");
    expect(requestUrl.searchParams.get("keyword")).toBe("서울라이트 광화문");
  });

  it("returns null when no title match has valid Korean coordinates", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(
        tourApiPayload([
          {
            contentid: "3073454",
            title: "서울라이트 광화문",
            addr1: "서울특별시 종로구 세종로 1-68",
            mapx: "not-a-longitude",
            mapy: "91",
          },
        ]),
      ),
    );

    const result = await resolveFestivalCoordinatesByKeyword(
      { title: "2026 서울라이트 광화문", region: "서울" },
      { fetchImpl: fetchMock as unknown as typeof fetch },
    );

    expect(result).toBeNull();
  });

  it("returns null when an exact title belongs to a different region", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(
        tourApiPayload([
          {
            contentid: "other-region",
            title: "서울라이트 광화문",
            addr1: "부산광역시 해운대구",
            mapx: "129.1583",
            mapy: "35.1631",
          },
        ]),
      ),
    );

    const result = await resolveFestivalCoordinatesByKeyword(
      { title: "2026 서울라이트 광화문", region: "서울" },
      { fetchImpl: fetchMock as unknown as typeof fetch },
    );

    expect(result).toBeNull();
  });
});
