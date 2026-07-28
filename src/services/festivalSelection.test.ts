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
    expect(nextPlan.facilities).toBe(sampleFestivalPlan.facilities);
    expect(nextPlan.programs).toBe(sampleFestivalPlan.programs);
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
