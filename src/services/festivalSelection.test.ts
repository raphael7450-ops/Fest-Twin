import { describe, expect, it } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import { getDemandBackdataContext } from "./demandBackdataAdapter";
import type { FestivalCandidate } from "./tourApiAdapter";
import {
  applyFestivalCandidateToPlan,
  createSelectedFestivalBasis,
} from "./festivalSelection";

const candidate: FestivalCandidate = {
  id: "3439947",
  title: "Gangnam Media Winter Festa",
  address: "Seoul Gangnam-gu Yeongdong-daero 511",
  startDate: "2025-12-19",
  endDate: "2026-01-03",
  mapX: "127.0610512042",
  mapY: "37.5103955843",
  searchScope: "exact-period",
};

describe("festivalSelection", () => {
  it("creates a selected festival basis from a TourAPI candidate", () => {
    const basis = createSelectedFestivalBasis(candidate);

    expect(basis).toEqual({
      contentId: "3439947",
      title: "Gangnam Media Winter Festa",
      address: "Seoul Gangnam-gu Yeongdong-daero 511",
      startDate: "2025-12-19",
      endDate: "2026-01-03",
      mapX: "127.0610512042",
      mapY: "37.5103955843",
      sourceName: "TourAPI selected festival candidate",
    });
  });

  it("applies selected candidate identity while preserving planning assumptions", () => {
    const nextPlan = applyFestivalCandidateToPlan(sampleFestivalPlan, candidate);

    expect(nextPlan.name).toBe("Gangnam Media Winter Festa");
    expect(nextPlan.venueAddress).toBe("Seoul Gangnam-gu Yeongdong-daero 511");
    expect(nextPlan.startDate).toBe("2025-12-19");
    expect(nextPlan.endDate).toBe("2026-01-03");
    expect(nextPlan.keywords[0]).toBe("Gangnam Media Winter Festa");
    expect(nextPlan.totalBudgetMillionKrw).toBe(sampleFestivalPlan.totalBudgetMillionKrw);
    expect(nextPlan.expectedCapacity).toBe(sampleFestivalPlan.expectedCapacity);
    expect(nextPlan.programs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "night-main",
          startHour: 18,
          endHour: 22,
        }),
      ]),
    );
  });

  it("prefills budget and expected capacity from the best matching festival backdata", () => {
    const seoulLightCandidate: FestivalCandidate = {
      id: "4000001",
      title: "서울라이트 광화문",
      address: "서울특별시 종로구 세종대로 175",
      startDate: "2025-12-19",
      endDate: "2026-01-03",
      searchScope: "exact-period",
    };
    const candidatePlan = applyFestivalCandidateToPlan(sampleFestivalPlan, seoulLightCandidate);
    const demandBackdata = getDemandBackdataContext(candidatePlan);

    const nextPlan = applyFestivalCandidateToPlan(sampleFestivalPlan, seoulLightCandidate, {
      demandBackdata,
    });

    expect(nextPlan.totalBudgetMillionKrw).toBe(1100);
    expect(nextPlan.expectedCapacity).toBe(12200);
  });

  it("prefills budget and expected capacity directly from a regional DB candidate", () => {
    const regionalDbCandidate: FestivalCandidate = {
      id: "mcst-boryeong-mud-2026",
      title: "제29회 보령머드축제",
      address: "충청남도 보령시 대천해수욕장",
      startDate: "2026-07-24",
      endDate: "2026-08-09",
      budgetMillionKrw: 3500,
      visitors: 1690359,
      searchScope: "regional-supplement",
    };

    const nextPlan = applyFestivalCandidateToPlan(sampleFestivalPlan, regionalDbCandidate);

    expect(nextPlan.totalBudgetMillionKrw).toBe(3500);
    expect(nextPlan.expectedCapacity).toBe(338072);
  });

  it("extends operating hours and adds a midnight program for countdown festivals", () => {
    const countdownCandidate: FestivalCandidate = {
      id: "busan-countdown-2026",
      title: "부산 카운트다운 축제",
      address: "부산광역시 해운대구",
      startDate: "2026-12-31",
      endDate: "2027-01-01",
      searchScope: "regional-supplement",
    };

    const nextPlan = applyFestivalCandidateToPlan(sampleFestivalPlan, countdownCandidate);

    expect(nextPlan.operatingHours).toEqual([18, 20, 22, 23, 24]);
    expect(nextPlan.programs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "countdown-midnight",
          startHour: 23,
          endHour: 24,
          expectedDraw: 96,
        }),
      ]),
    );
  });

  it("changes operating hours and programs for daytime flower or family festivals", () => {
    const flowerCandidate: FestivalCandidate = {
      id: "taean-tulip-2026",
      title: "태안 세계튤립꽃박람회",
      address: "충청남도 태안군",
      startDate: "2026-04-10",
      endDate: "2026-05-10",
      searchScope: "regional-supplement",
    };

    const nextPlan = applyFestivalCandidateToPlan(sampleFestivalPlan, flowerCandidate);

    expect(nextPlan.operatingHours).toEqual([9, 11, 13, 15, 17, 18]);
    expect(nextPlan.programs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "daytime-main",
          startHour: 9,
          endHour: 17,
        }),
        expect.objectContaining({
          id: "daytime-family",
          startHour: 11,
          endHour: 16,
        }),
      ]),
    );
  });

  it("uses verified operating time from the selected festival detail when available", () => {
    const timedCandidate: FestivalCandidate = {
      id: "timed-festival-2026",
      title: "일반 지역문화축제",
      address: "경기도 의정부시",
      startDate: "2026-05-18",
      endDate: "2026-05-25",
      operatingTimeText: "09:30 ~ 22:00",
      openingHour: 9,
      closingHour: 22,
      searchScope: "exact-period",
    };

    const nextPlan = applyFestivalCandidateToPlan(sampleFestivalPlan, timedCandidate);

    expect(nextPlan.operatingHours).toEqual([9, 11, 13, 15, 17, 19, 21, 22]);
    expect(nextPlan.programs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "verified-night-peak",
          startHour: 19,
          endHour: 21,
        }),
      ]),
    );
  });

  it("preserves user-edited planning values when applying backdata recommendations", () => {
    const seoulLightCandidate: FestivalCandidate = {
      id: "4000001",
      title: "서울라이트 광화문",
      address: "서울특별시 종로구 세종대로 175",
      startDate: "2025-12-19",
      endDate: "2026-01-03",
      searchScope: "exact-period",
    };
    const candidatePlan = applyFestivalCandidateToPlan(sampleFestivalPlan, seoulLightCandidate);
    const demandBackdata = getDemandBackdataContext(candidatePlan);

    const nextPlan = applyFestivalCandidateToPlan(
      { ...sampleFestivalPlan, totalBudgetMillionKrw: 777, expectedCapacity: 8888 },
      seoulLightCandidate,
      {
        demandBackdata,
        preserveBudget: true,
        preserveExpectedCapacity: true,
      },
    );

    expect(nextPlan.totalBudgetMillionKrw).toBe(777);
    expect(nextPlan.expectedCapacity).toBe(8888);
  });
});
