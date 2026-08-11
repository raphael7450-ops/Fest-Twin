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
  const hasOfficial = candidate.openingHour !== undefined && candidate.closingHour !== undefined;
  return {
    contentId: candidate.id,
    title: candidate.title,
    address: candidate.address,
    startDate: candidate.startDate,
    endDate: candidate.endDate,
    mapX: candidate.mapX,
    mapY: candidate.mapY,
    imageUrl: candidate.imageUrl,
    organizer: candidate.organizer,
    sourceName: "TourAPI selected festival candidate",
    operatingTimeText: candidate.operatingTimeText ?? (hasOfficial ? `${candidate.openingHour}:00 ~ ${candidate.closingHour}:00` : undefined),
    operatingTimeSource: hasOfficial ? "official" : "classified_by_type",
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
    imageUrl: basis.imageUrl,
    organizer: basis.organizer,
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
  const longitude = Number(candidate.mapX);
  const latitude = Number(candidate.mapY);
  const hasCoordinateValues =
    typeof candidate.mapX === "string" &&
    candidate.mapX.trim().length > 0 &&
    typeof candidate.mapY === "string" &&
    candidate.mapY.trim().length > 0;
  const venueCoordinates =
    hasCoordinateValues &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90
      ? { longitude, latitude, source: "tourapi" as const }
      : undefined;

  return {
    ...currentPlan,
    name: candidate.title,
    venueAddress: candidate.address,
    venueCoordinates,
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
  const verifiedOperatingTimePatch = createVerifiedOperatingTimePatch(candidate);
  if (verifiedOperatingTimePatch) return verifiedOperatingTimePatch;

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
      operatingHours: [9, 11, 13, 15, 17, 18],
      programs: [
        { id: "daytime-open", name: "09시 공식 개장 및 관람 안내", startHour: 9, endHour: 12, expectedDraw: 75 },
        { id: "daytime-main", name: "주간 대표 문화 관람 및 전시", startHour: 9, endHour: 17, expectedDraw: 88 },
        { id: "daytime-family", name: "가족 체험 및 대표 공연 무대", startHour: 11, endHour: 16, expectedDraw: 82 },
        { id: "daytime-photo", name: "주간 포토존 및 특산품 부스", startHour: 9, endHour: 18, expectedDraw: 76 },
      ],
    };
  }

  if (profile === "night") {
    return {
      operatingHours: [16, 18, 20, 22],
      programs: [
        { id: "night-preview", name: "야간 경관 점등 및 준비", startHour: 16, endHour: 18, expectedDraw: 62 },
        { id: "night-main", name: "야간 대표 미디어아트·공연", startHour: 18, endHour: 22, expectedDraw: 92 },
        { id: "night-peak", name: "드론쇼·불꽃 드로우", startHour: 20, endHour: 22, expectedDraw: 88 },
      ],
    };
  }

  // General Regional Festival Default in Korea (09:00~18:00 Standard)
  return {
    operatingHours: [9, 11, 13, 15, 17, 18],
    programs: [
      { id: "default-open", name: "09시 공식 개장 및 관람", startHour: 9, endHour: 12, expectedDraw: 75 },
      { id: "default-main", name: "대표 문화 관람 및 지역 전시", startHour: 9, endHour: 17, expectedDraw: 85 },
      { id: "default-booth", name: "주민 참여 체험 및 특산품 부스", startHour: 9, endHour: 18, expectedDraw: 78 },
      { id: "default-peak", name: "오후 피크 대표 무대 행사", startHour: 13, endHour: 16, expectedDraw: 90 },
    ],
  };
}

function createVerifiedOperatingTimePatch(candidate: FestivalCandidate): Partial<FestivalPlan> | undefined {
  if (
    typeof candidate.openingHour !== "number" ||
    typeof candidate.closingHour !== "number" ||
    candidate.closingHour <= candidate.openingHour
  ) {
    return undefined;
  }

  const hours = createOperatingHours(candidate.openingHour, candidate.closingHour);
  const isNight = candidate.openingHour >= 15 || candidate.closingHour >= 20;

  return {
    operatingHours: hours,
    programs: isNight
      ? [
          {
            id: "verified-night-open",
            name: candidate.operatingTimeText
              ? `야간 개장 (${candidate.operatingTimeText})`
              : "야간 개장 및 입장",
            startHour: candidate.openingHour,
            endHour: Math.min(candidate.closingHour, candidate.openingHour + 2),
            expectedDraw: 72,
          },
          {
            id: "verified-night-peak",
            name: "야간 메인 공연 & 피크 이벤트",
            startHour: Math.max(candidate.openingHour, 19),
            endHour: Math.min(candidate.closingHour, 21),
            expectedDraw: 94,
          },
        ]
      : [
          {
            id: "verified-daytime-booth",
            name: candidate.operatingTimeText
              ? `공식 운영 관람 (${candidate.operatingTimeText})`
              : "주간 전시 및 부스 관람",
            startHour: candidate.openingHour,
            endHour: candidate.closingHour,
            expectedDraw: 78,
          },
          {
            id: "verified-daytime-show",
            name: "오후 피크 메인 무대 공연 & 행사진행",
            startHour: Math.max(candidate.openingHour, 13),
            endHour: Math.min(candidate.closingHour, 16),
            expectedDraw: 92,
          },
        ],
  };
}

function createOperatingHours(openingHour: number, closingHour: number) {
  const hours: number[] = [];
  for (let hour = openingHour; hour < closingHour; hour += 2) {
    hours.push(hour);
  }
  if (!hours.includes(closingHour)) hours.push(closingHour);
  return hours;
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

  if (
    hasAny(text, [
      "먹거리", "음식", "푸드", "미식", "커피", "맥주", "와인", "수산물", "축산물", "농산물", "한우", "김치",
      "막걸리", "초콜릿", "빵", "디저트", "해산물", "굴", "전어", "사과", "배", "감", "곶감", "딸기", "유자", "마늘", "인삼", "산나물", "food", "gourmet", "market"
    ])
  ) {
    return "food";
  }

  if (
    hasAny(text, [
      "야간", "밤", "빛", "라이트", "미디어", "조명", "드론", "불꽃", "야시", "달빛", "별빛", "야행", "야경", "나이트", "일루미네이션", "night", "media", "light", "illumination", "drone", "firework"
    ])
  ) {
    return "night";
  }

  if (
    hasAny(text, [
      "꽃", "튤립", "벚꽃", "장미", "국화", "유채", "정원", "가족", "어린이", "체험", "낮", "주간",
      "문화", "예술", "역사", "비엔날레", "박람회", "페어", "전시", "산", "계곡", "생태", "자연", "학술", "전통", "향토", "유적", "유산", "공예", "도자기", "백자", "청자", "미술", "가요제", "경연", "체육", "수목원", "식물원", "한지", "아리랑", "탈춤", "민속", "서예", "문학", "음악회"
    ])
  ) {
    return "daytime";
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
