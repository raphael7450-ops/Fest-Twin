import type {
  DemandBackdataContext,
  DemandBackdataSimilarFestival,
  FestivalPlan,
  ProgramItem,
  SelectedFestivalBasis,
} from "../domain/types";
import type { FestivalCandidate } from "./tourApiAdapter";

type FestivalScheduleProfile = "countdown" | "food" | "daytime" | "night" | "default";

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
  const planningPatch = createFestivalTypePlanningPatch(candidate, options.demandBackdata);

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
    ...planningPatch,
  };
}

function createFestivalTypePlanningPatch(
  candidate: FestivalCandidate,
  demandBackdata?: DemandBackdataContext,
): Partial<FestivalPlan> {
  const profile = classifyFestivalScheduleProfile(candidate, demandBackdata);

  if (profile === "countdown") {
    return {
      operatingHours: [18, 20, 22, 23, 24],
      programs: [
        { id: "night-music", name: "야간 공연", startHour: 20, endHour: 23, expectedDraw: 82 },
        { id: "countdown-midnight", name: "새해 카운트다운", startHour: 23, endHour: 24, expectedDraw: 96 },
      ],
    };
  }

  if (profile === "food") {
    return {
      operatingHours: [10, 12, 14, 16, 18, 20],
      programs: [
        { id: "food-lunch", name: "점심 방문 집중", startHour: 11, endHour: 13, expectedDraw: 78 },
        { id: "food-market", name: "먹거리 부스 운영", startHour: 12, endHour: 19, expectedDraw: 84 },
        { id: "food-dinner", name: "저녁 방문 집중", startHour: 18, endHour: 20, expectedDraw: 82 },
      ],
    };
  }

  if (profile === "daytime") {
    return {
      operatingHours: [10, 12, 14, 16, 18],
      programs: [
        { id: "daytime-main", name: "주간 대표 관람", startHour: 10, endHour: 16, expectedDraw: 88 },
        { id: "daytime-family", name: "가족 체험 프로그램", startHour: 12, endHour: 17, expectedDraw: 82 },
        { id: "daytime-photo", name: "전시·포토존 관람", startHour: 10, endHour: 18, expectedDraw: 76 },
      ],
    };
  }

  if (profile === "night") {
    return {
      operatingHours: [16, 18, 20, 22],
      programs: [
        { id: "night-preview", name: "야간 입장 분산", startHour: 16, endHour: 18, expectedDraw: 62 },
        { id: "night-main", name: "야간 대표 콘텐츠", startHour: 18, endHour: 22, expectedDraw: 92 },
        { id: "night-peak", name: "피크 공연·전시", startHour: 20, endHour: 22, expectedDraw: 88 },
      ],
    };
  }

  return {};
}

function classifyFestivalScheduleProfile(
  candidate: FestivalCandidate,
  demandBackdata?: DemandBackdataContext,
): FestivalScheduleProfile {
  const bestBackdata = demandBackdata?.similarFestivalBaselines[0];
  const text = normalizeText(
    `${candidate.title} ${candidate.address} ${candidate.startDate} ${candidate.endDate} ${bestBackdata?.name ?? ""} ${bestBackdata?.type ?? ""} ${bestBackdata?.periodLabel ?? ""}`,
  );

  if (
    hasAny(text, ["카운트다운", "countdown", "새해", "연말", "타종", "제야", "해맞이", "midnight", "newyear"]) ||
    text.includes("12-31")
  ) {
    return "countdown";
  }

  if (hasAny(text, ["먹거리", "음식", "푸드", "미식", "커피", "맥주", "와인", "수산물", "축산물", "농산물", "한우", "김치"])) {
    return "food";
  }

  if (hasAny(text, ["꽃", "튤립", "벚꽃", "장미", "국화", "유채", "정원", "가족", "어린이", "체험", "낮", "주간"])) {
    return "daytime";
  }

  if (hasAny(text, ["야간", "밤", "빛", "라이트", "미디어", "조명", "드론", "불꽃"])) {
    return "night";
  }

  return "default";
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

  const usableFestivals =
    demandBackdata?.similarFestivalBaselines.filter(
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

function hasAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(normalizeText(keyword)));
}

function estimatePeakCapacity(festival: DemandBackdataSimilarFestival) {
  if (!festival.visitors) return undefined;

  return Math.min(
    festival.visitors,
    Math.max(1000, Math.round(festival.visitors * 0.2)),
  );
}
