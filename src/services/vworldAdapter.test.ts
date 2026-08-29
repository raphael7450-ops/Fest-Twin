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
        url.searchParams.get("type") === "ADDRESS"
      ) {
        return jsonResponse({
          response: {
            status: "OK",
            result: {
              items: [
                {
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
