import { describe, it, expect } from "vitest";
import { getFestivalCandidates } from "../src/services/tourApiAdapter";
import { sampleFestivalPlan } from "../src/data/sampleFestivalPlan";

describe("Daejeon festival candidates debug and cross-season verification", () => {
  it("queries candidates using live remote backend", async () => {
    const remoteFetch: typeof fetch = async (input, init) => {
      const urlStr = String(input);
      const fullUrl = urlStr.startsWith("http") ? urlStr : `http://100.104.94.112:18080${urlStr}`;
      return fetch(fullUrl, init);
    };

    const plan = {
      ...sampleFestivalPlan,
      name: "대전 가을축제 기획",
      region: "대전",
      startDate: "2026-10-01",
      endDate: "2026-12-31",
      venueAddress: "대전광역시 서구 둔산서로 100 대전광역시청 일원",
    };

    const candidates = await getFestivalCandidates(plan, {
      fetchImpl: remoteFetch,
      today: "2026-09-08",
    });

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.some((c) => c.title.includes("유성") || c.address.includes("대전"))).toBe(true);
  });

  it("queries candidates with exact browser state from sampleFestivalPlan across seasons", async () => {
    const remoteFetch: typeof fetch = async (input, init) => {
      const urlStr = String(input);
      const fullUrl = urlStr.startsWith("http") ? urlStr : `http://100.104.94.112:18080${urlStr}`;
      return fetch(fullUrl, init);
    };

    const initialPlan = {
      ...sampleFestivalPlan,
      name: "2026 서울 윈터페스타 & 빛초롱축제",
      region: "서울",
      startDate: "2026-12-18",
      endDate: "2026-12-31",
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
    expect(autumnCandidates.length).toBeGreaterThan(0);
    expect(autumnCandidates.some((c) => c.address.includes("대전") || c.title.includes("대전") || c.title.includes("유성"))).toBe(true);

    // 3. Dates changed to summer 2026-08-01 ~ 2026-08-20 (Daejeon active future festival)
    const summerPlan = {
      ...afterRegion,
      startDate: "2026-08-01",
      endDate: "2026-08-20",
    };
    const summerCandidates = await getFestivalCandidates(summerPlan, {
      fetchImpl: remoteFetch,
    });
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
    expect(sejongCandidates.length).toBeGreaterThan(0);

    // 5. Region changed to Daegu with October dates
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
    expect(daeguCandidates.length).toBeGreaterThan(0);
    expect(daeguCandidates.some((c) => c.title.includes("떡볶이") || c.title.includes("오페라"))).toBe(true);
  });
});
