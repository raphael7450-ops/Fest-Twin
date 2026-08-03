import type {
  DemandBackdataContext,
  DemandBackdataSimilarFestival,
  FestivalPlan,
  SelectedFestivalBasis,
} from "../domain/types";
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
  options: {
    demandBackdata?: DemandBackdataContext;
    preserveBudget?: boolean;
    preserveExpectedCapacity?: boolean;
  } = {},
): FestivalPlan {
  const recommendation = createBackdataPlanningRecommendation(candidate, options.demandBackdata);

  return {
    ...currentPlan,
    name: candidate.title,
    venueAddress: candidate.address,
    startDate: candidate.startDate || currentPlan.startDate,
    endDate: candidate.endDate || currentPlan.endDate,
    keywords: Array.from(new Set([candidate.title, ...currentPlan.keywords])).slice(0, 6),
    totalBudgetMillionKrw:
      !options.preserveBudget && recommendation?.budgetMillionKrw
        ? recommendation.budgetMillionKrw
        : currentPlan.totalBudgetMillionKrw,
    expectedCapacity:
      !options.preserveExpectedCapacity && recommendation?.expectedCapacity
        ? recommendation.expectedCapacity
        : currentPlan.expectedCapacity,
  };
}

function createBackdataPlanningRecommendation(
  candidate: FestivalCandidate,
  demandBackdata?: DemandBackdataContext,
) {
  if (candidate.budgetMillionKrw || candidate.visitors) {
    return {
      budgetMillionKrw: candidate.budgetMillionKrw,
      expectedCapacity: candidate.visitors
        ? estimatePeakCapacity({
            id: candidate.id,
            name: candidate.title,
            region: candidate.address,
            type: "selected",
            periodLabel: `${candidate.startDate} ~ ${candidate.endDate}`,
            visitors: candidate.visitors,
            similarityScore: 100,
            sourceName: "selected regional festival DB candidate",
          })
        : undefined,
    };
  }

  const usableFestivals = demandBackdata?.similarFestivalBaselines.filter(
    (festival) => festival.budgetMillionKrw || festival.visitors,
  ) ?? [];
  const candidateName = normalizeText(candidate.title);
  const bestMatch =
    usableFestivals.find((festival) => {
      const festivalName = normalizeText(festival.name);
      return festivalName.includes(candidateName) || candidateName.includes(festivalName);
    }) ?? usableFestivals[0];

  if (!bestMatch) return undefined;

  return {
    budgetMillionKrw: bestMatch.budgetMillionKrw,
    expectedCapacity: estimatePeakCapacity(bestMatch),
  };
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

function estimatePeakCapacity(festival: DemandBackdataSimilarFestival) {
  if (!festival.visitors) return undefined;

  return Math.min(
    festival.visitors,
    Math.max(1000, Math.round(festival.visitors * 0.2)),
  );
}
