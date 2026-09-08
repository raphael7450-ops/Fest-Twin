import type {
  DemandBackdataContext,
  DemandBackdataSimilarFestival,
  FestivalPlan,
  ProgramItem,
  SelectedFestivalBasis,
  VenueFacility,
} from "../domain/types";
import type { FestivalCandidate } from "./tourApiAdapter";

type FestivalScheduleProfile = "countdown" | "food" | "daytime" | "night" | "default";

function createDefaultFacilitiesForCandidate(
  candidate: FestivalCandidate,
  gridWidth = 30,
  gridHeight = 20,
): VenueFacility[] {
  const shortTitle = candidate.title
    .replace(/\b20\d{2}년?\s*/gi, "")
    .replace(/제\s*\d+\s*회\s*/gi, "")
    .replace(/[()[\]{}·ㆍ.,/\\\-_:]/g, " ")
    .trim();
  const venueWords = candidate.address.replace(/[()[\]{}·ㆍ.,/\\\-_:]/g, " ").split(/\s+/).filter(Boolean);
  const venueName =
    venueWords.length >= 2 ? venueWords.slice(-2).join(" ") : venueWords[0] || "행사장";

  return [
    {
      id: `fac_${candidate.id}_entrance`,
      type: "entrance",
      name: `${venueName} 메인 진입 게이트`,
      x: Math.max(1, Math.round(gridWidth * 0.1)),
      y: Math.max(1, Math.round(gridHeight * 0.5)),
      weight: 1.8,
    },
    {
      id: `fac_${candidate.id}_stage`,
      type: "stage",
      name: `${shortTitle} 특설 메인 무대`,
      x: Math.max(1, Math.round(gridWidth * 0.5)),
      y: Math.max(1, Math.round(gridHeight * 0.5)),
      weight: 2.5,
    },
    {
      id: `fac_${candidate.id}_booth`,
      type: "booth",
      name: `${shortTitle} 체험·운영 부스군`,
      x: Math.max(1, Math.round(gridWidth * 0.35)),
      y: Math.max(1, Math.round(gridHeight * 0.3)),
      weight: 1.4,
    },
    {
      id: `fac_${candidate.id}_medical`,
      type: "medical",
      name: "현장 응급의료 및 구급 센터",
      x: Math.max(1, Math.round(gridWidth * 0.8)),
      y: Math.max(1, Math.round(gridHeight * 0.7)),
      weight: 1.0,
    },
    {
      id: `fac_${candidate.id}_restroom`,
      type: "restroom",
      name: "임시 편의 및 공중화장실 거점",
      x: Math.max(1, Math.round(gridWidth * 0.75)),
      y: Math.max(1, Math.round(gridHeight * 0.3)),
      weight: 1.0,
    },
  ];
}

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
      ? { longitude, latitude, source: candidate.coordinateSource ?? "tourapi" }
      : undefined;
  const venueIdentityChanged = candidate.address !== currentPlan.venueAddress;

  return {
    ...currentPlan,
    name: candidate.title,
    venueAddress: candidate.address,
    venueCoordinates,
    venueAreaSquareMeters: venueIdentityChanged ? undefined : currentPlan.venueAreaSquareMeters,
    venueAreaProvenance: venueIdentityChanged ? undefined : currentPlan.venueAreaProvenance,
    totalExitWidthMeters: venueIdentityChanged ? undefined : currentPlan.totalExitWidthMeters,
    evacuationDistanceMeters: venueIdentityChanged ? undefined : currentPlan.evacuationDistanceMeters,
    startDate: candidate.startDate || currentPlan.startDate,
    endDate: candidate.endDate || currentPlan.endDate,
    keywords: venueIdentityChanged
      ? Array.from(
          new Set([
            candidate.title,
            ...candidate.title.replace(/[()[\]{}·ㆍ.,/\\\-_:]/g, " ").split(/\s+/).filter((t) => t.length >= 2),
            currentPlan.region,
          ]),
        ).slice(0, 6)
      : Array.from(new Set([candidate.title, ...currentPlan.keywords])).slice(0, 6),
    totalBudgetMillionKrw:
      !options.preserveBudget && recommendation?.budgetMillionKrw
        ? recommendation.budgetMillionKrw
        : currentPlan.totalBudgetMillionKrw,
    expectedCapacity:
      !options.preserveExpectedCapacity && recommendation?.expectedCapacity
        ? recommendation.expectedCapacity
        : currentPlan.expectedCapacity,
    averageDwellMinutes: undefined,
    parkingCapacityVehicles: undefined,
    restroomFixtureCount: undefined,
    facilities: venueIdentityChanged
      ? createDefaultFacilitiesForCandidate(candidate, currentPlan.gridWidth, currentPlan.gridHeight)
      : currentPlan.facilities,
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

  // General Regional Festival Default in Korea (10:00~21:00 Standard)
  return {
    operatingHours: [10, 12, 14, 16, 18, 20],
    programs: [
      { id: "default-open", name: "10시 공식 개장 및 관람", startHour: 10, endHour: 13, expectedDraw: 75 },
      { id: "default-main", name: "대표 문화 관람 및 지역 전시", startHour: 10, endHour: 18, expectedDraw: 85 },
      { id: "default-booth", name: "주민 참여 체험 및 특산품 부스", startHour: 10, endHour: 20, expectedDraw: 78 },
      { id: "default-peak", name: "저녁 피크 대표 무대 행사", startHour: 18, endHour: 21, expectedDraw: 90 },
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

export interface RegionDefaultGeoInfo {
  region: string;
  fullName: string;
  venueAddress: string;
  latitude: number;
  longitude: number;
}

export const REGION_DEFAULT_GEO_TABLE: Record<string, RegionDefaultGeoInfo> = {
  "서울": { region: "서울", fullName: "서울특별시", venueAddress: "서울특별시 종로구 세종대로 172 광화문광장", latitude: 37.5759, longitude: 126.9768 },
  "부산": { region: "부산", fullName: "부산광역시", venueAddress: "부산광역시 수영구 광안해변로 219 광안리해변", latitude: 35.1532, longitude: 129.1186 },
  "대구": { region: "대구", fullName: "대구광역시", venueAddress: "대구광역시 중구 동성로2가 동성로 야외무대", latitude: 35.8700, longitude: 128.5960 },
  "인천": { region: "인천", fullName: "인천광역시", venueAddress: "인천광역시 연수구 컨벤시아대로 123 송도센트럴파크", latitude: 37.3925, longitude: 126.6392 },
  "광주": { region: "광주", fullName: "광주광역시", venueAddress: "광주광역시 동구 문화전당로 38 국립아시아문화전당", latitude: 35.1468, longitude: 126.9204 },
  "대전": { region: "대전", fullName: "대전광역시", venueAddress: "대전광역시 중구 중앙로 100 대전역~옛도청 구간", latitude: 36.3287, longitude: 127.4258 },
  "울산": { region: "울산", fullName: "울산광역시", venueAddress: "울산광역시 남구 삼산로 35 태화강국가정원", latitude: 35.5510, longitude: 129.2990 },
  "세종": { region: "세종", fullName: "세종특별자치시", venueAddress: "세종특별자치시 연기면 세종호수공원", latitude: 36.4980, longitude: 127.2680 },
  "세종특별자치시": { region: "세종특별자치시", fullName: "세종특별자치시", venueAddress: "세종특별자치시 연기면 세종호수공원", latitude: 36.4980, longitude: 127.2680 },
  "경기": { region: "경기", fullName: "경기도", venueAddress: "경기도 수원시 팔달구 정조로 825 화성행궁", latitude: 37.2828, longitude: 127.0163 },
  "경기도": { region: "경기도", fullName: "경기도", venueAddress: "경기도 수원시 팔달구 정조로 825 화성행궁", latitude: 37.2828, longitude: 127.0163 },
  "강원": { region: "강원", fullName: "강원특별자치도", venueAddress: "강원특별자치도 춘천시 평화로 26 의암공원", latitude: 37.8710, longitude: 127.7120 },
  "강원특별자치도": { region: "강원특별자치도", fullName: "강원특별자치도", venueAddress: "강원특별자치도 춘천시 평화로 26 의암공원", latitude: 37.8710, longitude: 127.7120 },
  "충북": { region: "충북", fullName: "충청북도", venueAddress: "충청북도 청주시 상당구 상당로 143 상당공원", latitude: 36.6380, longitude: 127.4910 },
  "충청북도": { region: "충청북도", fullName: "충청북도", venueAddress: "충청북도 청주시 상당구 상당로 143 상당공원", latitude: 36.6380, longitude: 127.4910 },
  "충남": { region: "충남", fullName: "충청남도", venueAddress: "충청남도 보령시 대천해수욕장 머드광장", latitude: 36.3045, longitude: 126.5165 },
  "충청남도": { region: "충청남도", fullName: "충청남도", venueAddress: "충청남도 보령시 대천해수욕장 머드광장", latitude: 36.3045, longitude: 126.5165 },
  "전북": { region: "전북", fullName: "전북특별자치도", venueAddress: "전북특별자치도 전주시 완산구 기린대로 99 전주한옥마을", latitude: 35.8150, longitude: 127.1530 },
  "전북특별자치도": { region: "전북특별자치도", fullName: "전북특별자치도", venueAddress: "전북특별자치도 전주시 완산구 기린대로 99 전주한옥마을", latitude: 35.8150, longitude: 127.1530 },
  "전남": { region: "전남", fullName: "전라남도", venueAddress: "전라남도 여수시 종화동 해양공원 일원", latitude: 34.7410, longitude: 127.7420 },
  "전라남도": { region: "전라남도", fullName: "전라남도", venueAddress: "전라남도 여수시 종화동 해양공원 일원", latitude: 34.7410, longitude: 127.7420 },
  "경북": { region: "경북", fullName: "경상북도", venueAddress: "경상북도 안동시 육사로 239 탈춤공원", latitude: 36.5647, longitude: 128.7368 },
  "경상북도": { region: "경상북도", fullName: "경상북도", venueAddress: "경상북도 안동시 육사로 239 탈춤공원", latitude: 36.5647, longitude: 128.7368 },
  "경남": { region: "경남", fullName: "경상남도", venueAddress: "경상남도 진주시 남강로 626 진주성 및 남강 일원", latitude: 35.1895, longitude: 128.0827 },
  "경상남도": { region: "경상남도", fullName: "경상남도", venueAddress: "경상남도 진주시 남강로 626 진주성 및 남강 일원", latitude: 35.1895, longitude: 128.0827 },
  "제주": { region: "제주", fullName: "제주특별자치도", venueAddress: "제주특별자치도 제주시 일주동로 17 탑동광장", latitude: 33.5180, longitude: 126.5250 },
  "제주특별자치도": { region: "제주특별자치도", fullName: "제주특별자치도", venueAddress: "제주특별자치도 제주시 일주동로 17 탑동광장", latitude: 33.5180, longitude: 126.5250 },
};

export function getRegionDefaultGeoInfo(region: string): RegionDefaultGeoInfo | undefined {
  const normalized = region.trim();
  if (REGION_DEFAULT_GEO_TABLE[normalized]) return REGION_DEFAULT_GEO_TABLE[normalized];
  const matchedKey = Object.keys(REGION_DEFAULT_GEO_TABLE).find(
    (key) => normalized.includes(key) || key.includes(normalized),
  );
  return matchedKey ? REGION_DEFAULT_GEO_TABLE[matchedKey] : undefined;
}

export function updatePlanRegion(currentPlan: FestivalPlan, newRegion: string): FestivalPlan {
  if (currentPlan.region === newRegion) return currentPlan;

  const geoInfo = getRegionDefaultGeoInfo(newRegion);
  const isAddressInNewRegion =
    currentPlan.venueAddress.includes(newRegion) ||
    (geoInfo ? currentPlan.venueAddress.includes(geoInfo.fullName) : false);

  if (isAddressInNewRegion) {
    return {
      ...currentPlan,
      region: newRegion,
    };
  }

  const nextAddress = geoInfo ? geoInfo.venueAddress : `${newRegion} 행사장 일원`;
  const nextCoordinates = geoInfo
    ? { latitude: geoInfo.latitude, longitude: geoInfo.longitude, source: "vworld" as const }
    : currentPlan.venueCoordinates;

  const nextFacilities: VenueFacility[] = [
    {
      id: `fac_reg_${newRegion}_entrance`,
      type: "entrance",
      name: `${newRegion} 행사장 메인 진입로`,
      x: Math.max(1, Math.round(currentPlan.gridWidth * 0.1)),
      y: Math.max(1, Math.round(currentPlan.gridHeight * 0.5)),
      weight: 1.8,
    },
    {
      id: `fac_reg_${newRegion}_stage`,
      type: "stage",
      name: `${newRegion} 특설 메인 무대`,
      x: Math.max(1, Math.round(currentPlan.gridWidth * 0.5)),
      y: Math.max(1, Math.round(currentPlan.gridHeight * 0.5)),
      weight: 2.5,
    },
    {
      id: `fac_reg_${newRegion}_booth`,
      type: "booth",
      name: `${newRegion} 지역 특산물 및 체험 부스`,
      x: Math.max(1, Math.round(currentPlan.gridWidth * 0.35)),
      y: Math.max(1, Math.round(currentPlan.gridHeight * 0.3)),
      weight: 1.4,
    },
    {
      id: `fac_reg_${newRegion}_medical`,
      type: "medical",
      name: "통합 현장 안전 종합 지휘소",
      x: Math.max(1, Math.round(currentPlan.gridWidth * 0.8)),
      y: Math.max(1, Math.round(currentPlan.gridHeight * 0.7)),
      weight: 1.0,
    },
  ];

  return {
    ...currentPlan,
    region: newRegion,
    venueAddress: nextAddress,
    venueCoordinates: nextCoordinates,
    venueAreaSquareMeters: undefined,
    venueAreaProvenance: undefined,
    totalExitWidthMeters: undefined,
    evacuationDistanceMeters: undefined,
    facilities: nextFacilities,
    keywords: [newRegion, `${newRegion}축제`, "지역문화", "체험행사"],
  };
}

export function updatePlanDates(
  currentPlan: FestivalPlan,
  nextStartDate: string,
  nextEndDate: string,
): FestivalPlan {
  return {
    ...currentPlan,
    startDate: nextStartDate,
    endDate: nextEndDate,
  };
}

