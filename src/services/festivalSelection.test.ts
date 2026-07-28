import { describe, expect, it } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
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
});
