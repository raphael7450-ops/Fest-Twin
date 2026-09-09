import { describe, expect, it, vi } from "vitest";
import {
  buildVWorldCoordinateQueries,
  resolveVenueCoordinatesByVWorld,
} from "./vworldAdapter";

function jsonResponse(payload: unknown, options: { ok?: boolean; status?: number } = {}) {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: async () => payload,
  } as Response;
}

describe("VWorld coordinate adapter", () => {
  const venueInput = { title: "광화문광장", address: "서울 종로구 광화문광장", region: "서울" };
  const place = (title: string, address = "서울특별시 종로구 세종대로 172", x = "126.9768") => ({
    title, address: { road: address }, point: { x, y: "37.5759" },
  });
  it("chooses an exact venue instead of a similarly named business", async () => {
    const match = await resolveVenueCoordinatesByVWorld(venueInput, {
      fetchImpl: async () => jsonResponse({ response: { status: "OK", result: { items: [
        place("광화문광장치과의원"), place("광화문광장"),
      ] } } }),
    });
    expect(match?.title).toBe("광화문광장");
  });
  it.each([
    [place("광화문광장치과의원")],
    [place("광화문광장", "부산광역시 중구 중앙대로 1")],
    [place("광화문광장", "")],
    [place("광화문광장"), place("광화문광장", undefined, "127.1")],
  ])("does not guess when name, region, or uniqueness is unverified: %j", async (...items) => {
    const match = await resolveVenueCoordinatesByVWorld(venueInput, {
      fetchImpl: async () => jsonResponse({ response: { status: "OK", result: { items } } }),
    });
    expect(match).toBeNull();
  });
  it("extracts landmark and parenthetical place queries from regional festival addresses", () => {
    const queries = buildVWorldCoordinateQueries({
      title: "제4회 중앙시장 주말축제 야시장 동구夜놀자",
      address: "대전 동구 중앙시장 화월통 일원",
      region: "대전",
    });

    expect(queries).toContain("대전 중앙시장");
  });

  it("falls through to a later VWorld query and returns valid Korean coordinates", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");
      if (
        url.searchParams.get("query") === "대전 중앙시장" &&
        url.searchParams.get("type") === "PLACE"
      ) {
        return jsonResponse({
          response: {
            status: "OK",
            result: {
              items: [
                {
                  title: "중앙시장",
                  address: { road: "대전광역시 동구 대전로779번길 8" },
                  point: { x: "127.43286719691503", y: "36.32957497803072" },
                },
              ],
            },
          },
        });
      }

      return jsonResponse({ response: { status: "NOT_FOUND", record: { total: "0" } } });
    });

    const match = await resolveVenueCoordinatesByVWorld(
      {
        title: "제4회 중앙시장 주말축제 야시장 동구夜놀자",
        address: "대전 동구 중앙시장 화월통 일원",
        region: "대전",
      },
      { fetchImpl: fetchMock as unknown as typeof fetch },
    );

    expect(match).toEqual(
      expect.objectContaining({
        address: "대전광역시 동구 대전로779번길 8",
        mapX: "127.43286719691503",
        mapY: "36.32957497803072",
      }),
    );
  });
});
