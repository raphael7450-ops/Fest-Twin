import type { FestivalPlan, SelectedFestivalBasis } from "../domain/types";
import type { FestivalCandidate } from "./tourApiAdapter";

export function createSelectedFestivalBasis(
  candidate: FestivalCandidate,
): SelectedFestivalBasis {
  return {
    contentId: candidate.id,
    title: candidate.title,
    address: candidate.address,
    startDate: candidate.startDate,
    endDate: candidate.endDate,
    mapX: candidate.mapX,
    mapY: candidate.mapY,
    sourceName: "TourAPI selected festival candidate",
  };
}

export function applyFestivalCandidateToPlan(
  currentPlan: FestivalPlan,
  candidate: FestivalCandidate,
): FestivalPlan {
  return {
    ...currentPlan,
    name: candidate.title,
    venueAddress: candidate.address,
    startDate: candidate.startDate || currentPlan.startDate,
    endDate: candidate.endDate || currentPlan.endDate,
    keywords: Array.from(new Set([candidate.title, ...currentPlan.keywords])).slice(0, 6),
  };
}
