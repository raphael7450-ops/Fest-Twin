import { describe, expect, it, vi } from "vitest";
import { getFestivalCandidates } from "./tourApiAdapter";

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

describe("Daejeon festival candidates debug", () => {
  it("diagnoses candidate retrieval for Daejeon 2026-10-01 ~ 2026-12-31", async () => {
    let callIndex = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");
      callIndex++;
      console.log(`[Fetch Call ${callIndex}]`, url.pathname, url.search);

      if (url.pathname === "/api/tour/area-code") {
        return jsonResponse(tourApiPayload([{ code: "3", name: "대전" }]));
      }

      if (url.pathname === "/api/tour/festivals") {
        if (url.searchParams.get("eventStartDate") === "20261001") {
          return jsonResponse(tourApiPayload([], 0));
        }
        // annual
        return jsonResponse(
          tourApiPayload([
            {
              addr1: "대전광역시 유성구 대덕대로 480 (도룡동)",
              contentid: "3420072",
              contenttypeid: "15",
              eventstartdate: "20260101",
              eventenddate: "20260101",
              title: "2026 선양 맨몸마라톤",
            },
          ]),
        );
      }

      if (url.pathname === "/api/regional-festivals") {
        return jsonResponse({
          count: 2,
          records: [
            {
              id: "mcst-daejeon-chrysanthemum",
              year: 2026,
              name: "제17회 유성국화축제",
              region: "대전",
              localGovernment: "유성구",
              venue: "유림공원, 유성천 일원",
              startDate: "2026-10-17",
              endDate: "2026-11-01",
            },
            {
              id: "mcst-daejeon-xmas",
              year: 2026,
              name: "2026 유성온천 크리스마스축제",
              region: "대전",
              localGovernment: "유성구",
              venue: "유성온천공원",
              startDate: "2026-12-04",
              endDate: "2026-12-06",
            },
          ],
        });
      }

      if (url.pathname === "/api/tour/detail" || url.pathname === "/api/tour/detail-intro") {
        return jsonResponse(tourApiPayload([], 0));
      }

      return jsonResponse({ ok: true });
    });

    const plan = {
      name: "새 축제",
      region: "대전",
      startDate: "2026-10-01",
      endDate: "2026-12-31",
      keywords: [],
      targetAudience: "",
      concept: "",
      scale: "medium" as const,
      expectedDailyVisitors: 10000,
      peakHourMultiplier: 1.5,
      venueAddress: "대전광역시청",
      operatingHours: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22],
    };

    const candidates = await getFestivalCandidates(plan, {
      fetchImpl: fetchMock as unknown as typeof fetch,
      today: "2026-09-08",
    });

    console.log("Candidates returned:", candidates.length, candidates.map((c) => c.title));
    expect(candidates.length).toBeGreaterThan(0);
  });

  it("queries candidates using live remote backend", async () => {
    const remoteFetch: typeof fetch = async (input, init) => {
      const urlStr = String(input);
      const fullUrl = urlStr.startsWith("http") ? urlStr : `http://100.104.94.112:18080${urlStr}`;
      return fetch(fullUrl, init);
    };

    const plan = {
      name: "새 축제",
      region: "대전",
      startDate: "2026-10-01",
      endDate: "2026-12-31",
      keywords: [],
      targetAudience: "",
      concept: "",
      scale: "medium" as const,
      expectedDailyVisitors: 10000,
      peakHourMultiplier: 1.5,
      venueAddress: "대전광역시청",
      operatingHours: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22],
    };

    const candidates = await getFestivalCandidates(plan, {
      fetchImpl: remoteFetch,
      today: "2026-09-08",
    });

    console.log("Live Remote Candidates returned:", candidates.length, candidates.map((c) => ({
      title: c.title,
      startDate: c.startDate,
      endDate: c.endDate,
      address: c.address,
    })));
  });

  it("queries candidates with exact browser state from sampleFestivalPlan", async () => {
    const remoteFetch: typeof fetch = async (input, init) => {
      const urlStr = String(input);
      const fullUrl = urlStr.startsWith("http") ? urlStr : `http://100.104.94.112:18080${urlStr}`;
      return fetch(fullUrl, init);
    };

    // User switches region to "대전", then dates to 2026-10-01 ~ 2026-12-31
    const initialPlan = {
      name: "2026 서울 윈터페스타 & 빛초롱축제",
      region: "서울",
      venueAddress: "서울특별시 종로구 세종대로 172 광화문광장 및 청계광장 일원",
      venueCoordinates: {
        latitude: 37.5759,
        longitude: 126.9768,
        source: "tourapi" as const,
      },
      startDate: "2026-12-18",
      endDate: "2026-12-31",
      operatingHours: [16, 17, 18, 19, 20, 21, 22],
      totalBudgetMillionKrw: 1800,
      promotionBudgetMillionKrw: 280,
      safetyBudgetMillionKrw: 320,
      targetGroups: ["youth", "families", "locals", "foreigners"],
      keywords: ["서울빛초롱", "광화문광장", "윈터페스타", "청계천등불", "미디어아트"],
      expectedCapacity: 45000,
      venueAreaSquareMeters: 35000,
      totalExitWidthMeters: 32,
      evacuationDistanceMeters: 150,
      gridWidth: 35,
      gridHeight: 22,
      programs: [],
      facilities: [],
    };

    const afterRegion = {
      ...initialPlan,
      region: "대전",
      venueAddress: "대전광역시 서구 둔산서로 100 대전광역시청 일원",
      keywords: ["대전", "대전축제", "지역문화", "체험행사"],
    };

    // 1. Region changed to Daejeon, but dates are still default Dec 18~31 (no festivals in late December in Daejeon)
    const regionalDefaultCandidates = await getFestivalCandidates(afterRegion, {
      fetchImpl: remoteFetch,
    });
    console.log("Daejeon with default Dec dates candidates count:", regionalDefaultCandidates.length);
    expect(regionalDefaultCandidates.length).toBe(0);

    // 2. Dates changed to autumn 2026-10-01 ~ 2026-12-31
    const afterDates = {
      ...afterRegion,
      startDate: "2026-10-01",
      endDate: "2026-12-31",
    };

    const autumnCandidates = await getFestivalCandidates(afterDates, {
      fetchImpl: remoteFetch,
    });
    console.log("AfterDates Candidates returned:", autumnCandidates.length);
    expect(autumnCandidates.length).toBeGreaterThan(0);
    expect(autumnCandidates.some((c) => c.address.includes("대전") || c.title.includes("대전") || c.title.includes("유성"))).toBe(true);

    // 3. Dates changed to summer 2026-08-01 ~ 2026-08-20 (Daejeon 0 O'Clock Festival)
    const summerPlan = {
      ...afterRegion,
      startDate: "2026-08-01",
      endDate: "2026-08-20",
    };
    const summerCandidates = await getFestivalCandidates(summerPlan, {
      fetchImpl: remoteFetch,
    });
    console.log("Summer Daejeon candidates count:", summerCandidates.length, summerCandidates.map((c) => c.title));
    expect(summerCandidates.length).toBeGreaterThan(0);
    expect(summerCandidates.some((c) => c.title.includes("중앙시장"))).toBe(true);

    // 4. Region changed to Sejong with autumn dates
    const sejongPlan = {
      ...initialPlan,
      region: "세종",
      venueAddress: "세종특별자치시 세종호수공원 일원",
      startDate: "2026-10-01",
      endDate: "2026-12-31",
      keywords: ["세종", "세종축제"],
    };
    const sejongCandidates = await getFestivalCandidates(sejongPlan, {
      fetchImpl: remoteFetch,
    });
    console.log("Sejong candidates count:", sejongCandidates.length, sejongCandidates.map((c) => c.title));
    expect(sejongCandidates.length).toBeGreaterThan(0);

    // 5. Region changed to Daegu with October dates (떡볶이 페스티벌, 오페라축제 등)
    const daeguPlan = {
      ...initialPlan,
      region: "대구",
      venueAddress: "대구광역시 달서구 두류공원로 200 두류공원 일원",
      startDate: "2026-10-01",
      endDate: "2026-10-31",
      keywords: ["대구", "페스티벌"],
    };
    const daeguCandidates = await getFestivalCandidates(daeguPlan, {
      fetchImpl: remoteFetch,
    });
    console.log("Daegu candidates count:", daeguCandidates.length, daeguCandidates.map((c) => c.title));
    expect(daeguCandidates.length).toBeGreaterThan(0);
    expect(daeguCandidates.some((c) => c.title.includes("떡볶이") || c.title.includes("오페라"))).toBe(true);
  });
});
