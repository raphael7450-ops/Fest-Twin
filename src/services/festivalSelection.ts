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

export function selectedFestivalBasisToCandidate(
  basis?: SelectedFestivalBasis | null,
): FestivalCandidate | null {
  if (!basis) return null;

  return {
    id: basis.contentId,
    title: basis.title,
    address: basis.address,
    startDate: basis.startDate,
    endDate: basis.endDate,
    mapX: basis.mapX,
    mapY: basis.mapY,
    searchScope: "exact-period",
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
