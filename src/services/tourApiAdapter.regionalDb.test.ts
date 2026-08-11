import { describe, expect, it, vi } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import { getFestivalCandidates, sortFestivalCandidatesByDateAsc } from "./tourApiAdapter";

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

describe("TourAPI candidate regional DB supplement", () => {
  it("shows Busan Sea Festival only once and keeps the verified seven-day schedule", async () => {
    let festivalCallCount = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");

      if (url.pathname === "/api/tour/area-code") {
        return jsonResponse(tourApiPayload([{ code: "6", name: "부산" }]));
      }

      if (url.pathname === "/api/tour/festivals") {
        festivalCallCount += 1;
        if (festivalCallCount === 1) return jsonResponse(tourApiPayload([], 0));

        return jsonResponse(
          tourApiPayload([
            {
              contentid: "tourapi-busan-sea",
              title: "부산바다축제",
              eventstartdate: "20260807",
              eventenddate: "20260813",
              addr1: "부산 다대포해수욕장",
            },
          ]),
        );
      }

      if (url.pathname === "/api/regional-festivals") {
        return jsonResponse({
          count: 1,
          records: [
            {
              id: "mcst-busan-sea-2026",
              year: 2026,
              name: "제30회 부산바다축제",
              region: "부산",
              venue: "다대포해수욕장",
              startDate: "2026-08-07",
              endDate: "2026-08-13",
              budgetMillionKrw: 1260,
              visitors: 82435,
            },
          ],
        });
      }

      return jsonResponse(tourApiPayload([], 0));
    });

    const candidates = await getFestivalCandidates(
      {
        ...sampleFestivalPlan,
        name: "부산바다축제",
        region: "부산",
        startDate: "2026-08-01",
        endDate: "2026-08-31",
        keywords: ["부산바다축제"],
      },
      { fetchImpl: fetchMock as unknown as typeof fetch },
    );

    const busanSeaCandidates = candidates.filter((candidate) =>
      candidate.title.replace(/\s+/g, "").includes("부산바다축제"),
    );

    expect(busanSeaCandidates).toHaveLength(1);
    expect(busanSeaCandidates[0]).toMatchObject({
      title: "제30회 부산바다축제",
      startDate: "2026-08-07",
      endDate: "2026-08-13",
    });
  });

  it("does not show annual fallback candidates outside the selected date range", async () => {
    let festivalCallCount = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");

      if (url.pathname === "/api/tour/area-code") {
        return jsonResponse(tourApiPayload([{ code: "6", name: "Busan" }]));
      }

      if (url.pathname === "/api/tour/festivals") {
        festivalCallCount += 1;
        if (festivalCallCount === 1) return jsonResponse(tourApiPayload([], 0));

        return jsonResponse(
          tourApiPayload([
            {
              contentid: "august",
              title: "Busan August Festival",
              eventstartdate: "20260810",
              eventenddate: "20260815",
              addr1: "Busan Haeundae",
            },
            {
              contentid: "winter",
              title: "Haeundae Light Festival",
              eventstartdate: "20261201",
              eventenddate: "20261231",
              addr1: "Busan Haeundae",
            },
          ]),
        );
      }

      if (url.pathname === "/api/regional-festivals") {
        return jsonResponse({ count: 0, records: [] });
      }

      return jsonResponse(tourApiPayload([], 0));
    });

    const candidates = await getFestivalCandidates(
      {
        ...sampleFestivalPlan,
        name: "Busan August Planning",
        region: "Busan",
        startDate: "2026-08-01",
        endDate: "2026-08-31",
        keywords: [],
      },
      { fetchImpl: fetchMock as unknown as typeof fetch },
    );

    expect(candidates.map((candidate) => candidate.id)).toEqual(["august"]);
  });

  it("uses server regional festival DB records as selectable candidates", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");

      if (url.pathname === "/api/tour/area-code") {
        return jsonResponse(tourApiPayload([{ code: "34", name: "충청남도" }]));
      }

      if (url.pathname === "/api/tour/festivals") {
        return jsonResponse(tourApiPayload([], 0));
      }

      if (url.pathname === "/api/regional-festivals") {
        return jsonResponse({
          count: 1,
          records: [
            {
              id: "mcst-boryeong-mud-2026",
              year: 2026,
              name: "제29회 보령머드축제",
              region: "충청남도",
              localGovernment: "보령시",
              type: "문화예술",
              venue: "대천해수욕장일원",
              startDate: "2026-07-24",
              endDate: "2026-08-09",
              budgetMillionKrw: 3500,
              visitors: 1690359,
              sourceName: "문화체육관광부_지역축제 정보",
              sourceFile: "2026년 지역축제 개최 계획 현황(공개용).xlsx",
            },
          ],
        });
      }

      return jsonResponse(tourApiPayload([], 0));
    });

    const candidates = await getFestivalCandidates(
      {
        ...sampleFestivalPlan,
        name: "보령머드축제",
        region: "충청남도",
        startDate: "2026-07-01",
        endDate: "2026-07-31",
        keywords: ["보령", "머드"],
      },
      { fetchImpl: fetchMock as unknown as typeof fetch },
    );

    expect(fetchMock.mock.calls.map(([input]) => new URL(String(input), "http://localhost").pathname)).toContain(
      "/api/regional-festivals",
    );
    const boryeongCandidate = candidates.find(
      (candidate) => candidate.id === "mcst-boryeong-mud-2026",
    );
    expect(boryeongCandidate).toEqual(
      expect.objectContaining({
        budgetMillionKrw: 3500,
        visitors: 1690359,
        searchScope: "regional-supplement",
      }),
    );
    expect(candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "mcst-boryeong-mud-2026",
          title: "제29회 보령머드축제",
          address: "충청남도 보령시 대천해수욕장일원",
          searchScope: "regional-supplement",
        }),
      ]),
    );
  });

  it("sorts festival candidates by startDate in ascending order (asc)", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");

      if (url.pathname === "/api/tour/area-code") {
        return jsonResponse(tourApiPayload([{ code: "1", name: "서울" }]));
      }

      if (url.pathname === "/api/tour/festivals") {
        return jsonResponse(
          tourApiPayload([
            {
              contentid: "200",
              title: "Late Festival",
              eventstartdate: "20261225",
              eventenddate: "20261231",
              addr1: "Seoul Gangnam",
            },
            {
              contentid: "100",
              title: "Early Festival",
              eventstartdate: "20260501",
              eventenddate: "20260505",
              addr1: "Seoul Gangnam",
            },
          ]),
        );
      }

      return jsonResponse(tourApiPayload([], 0));
    });

    const candidates = await getFestivalCandidates(
      {
        ...sampleFestivalPlan,
        startDate: "2026-01-01",
        endDate: "2026-12-31",
      },
      {
        fetchImpl: fetchMock as unknown as typeof fetch,
      },
    );
    const sorted = sortFestivalCandidatesByDateAsc(candidates);

    expect(sorted.length).toBe(2);
    expect(sorted[0].startDate).toBe("2026-05-01");
    expect(sorted[1].startDate).toBe("2026-12-25");
  });
});
