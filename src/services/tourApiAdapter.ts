/**
 * 파일 : src/services/tourApiAdapter.ts
 * 내용 : 한국관광공사 TourAPI 4.0 응답 파싱, 지역별 축제 검색 및 주변 관광 자원 추출 어댑터
 * 수정 : 2026-07-24. 지역 기반 완화 검색, 콘텐츠 ID 상세 조회 및 Fallback 컨텍스트 구축
 */

import { sampleTourismContext } from "../data/sampleTourApi";
import { regionalFestivalCandidateRecords } from "../data/regionalFestivalCandidates";
import { getRepresentativeFestivalImage } from "./festivalImageProvider";
import type {
  FestivalPlan,
  MetricEvidenceSourceDetail,
  SimilarFestival,
  TourismContext,
  TourismSpot,
} from "../domain/types";
import { clamp } from "./forecast";

interface TourApiOptions {
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  selectedCandidate?: FestivalCandidate | null;
}

export interface TourApiAreaCode {
  code: string;
  name: string;
}

export interface FestivalCandidate {
  id: string;
  title: string;
  address: string;
  startDate: string;
  endDate: string;
  mapX?: string;
  mapY?: string;
  imageUrl?: string;
  organizer?: string;
  budgetMillionKrw?: number;
  visitors?: number;
  operatingTimeText?: string;
  openingHour?: number;
  closingHour?: number;
  searchScope: FestivalSearchScope;
  sourceDetails?: MetricEvidenceSourceDetail[];
}

export function sortFestivalCandidatesByDateAsc(
  candidates: FestivalCandidate[],
): FestivalCandidate[] {
  return [...candidates].sort((a, b) =>
    (a.startDate || "").localeCompare(b.startDate || ""),
  );
}

interface TourApiItem {
  code?: string | number;
  name?: string;
  contentid?: string | number;
  title?: string;
  addr1?: string;
  contenttypeid?: string | number;
  dist?: string | number;
  firstimage?: string;
  eventstartdate?: string;
  eventenddate?: string;
  overview?: string;
  playtime?: string;
  eventplace?: string;
  usetimefestival?: string;
  sponsor1?: string;
  sponsor2?: string;
  mapx?: string | number;
  mapy?: string | number;
  budgetMillionKrw?: number;
  visitors?: number;
}

interface RegionalFestivalApiRecord {
  id: string;
  name: string;
  region: string;
  localGovernment?: string;
  venue?: string;
  startDate?: string;
  endDate?: string;
  periodLabel?: string;
  budgetMillionKrw?: number;
  visitors?: number;
  sourceName?: string;
  sourceFile?: string;
}

type TourApiOperation =
  | "area-code"
  | "festivals"
  | "detail"
  | "detail-intro"
  | "nearby";

type FestivalSearchScope = "exact-period" | "annual-region" | "regional-supplement";

type ValidFestivalItem = TourApiItem & {
  contentid: string | number;
  title: string;
  addr1: string;
};

type ValidNearbyItem = TourApiItem & {
  contentid: string | number;
  title: string;
  contenttypeid: string | number;
  dist: string | number;
};

const FESTIVAL_SEARCH_ROWS = 50;
const MAX_FESTIVAL_CANDIDATES = 20;
const MAX_FESTIVAL_CANDIDATE_DETAILS = 5;
const MAX_SIMILAR_FESTIVALS = 5;
const MAX_NEARBY_SPOTS = 6;

const SENSITIVE_QUERY_KEYS = new Set([
  "servicekey",
  "clientsecret",
  "authorization",
  "cookie",
]);

function isSecretBearingUrl(value: string) {
  try {
    const url = new URL(value, "http://localhost");
    return Array.from(url.searchParams.keys()).some((key) =>
      SENSITIVE_QUERY_KEYS.has(key.toLowerCase()),
    );
  } catch {
    return false;
  }
}

export function safeQueryFields(params: Record<string, string | number | undefined>) {
  return Object.entries(params)
    .filter(
      ([key, value]) =>
        value !== undefined &&
        !SENSITIVE_QUERY_KEYS.has(key.toLowerCase()) &&
        !(typeof value === "string" && isSecretBearingUrl(value)),
    )
    .map(([label, value]) => ({ label, value: String(value) }));
}

function formatTourApiDate(value?: string) {
  if (!value || value.length !== 8) return value ?? "-";
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function createTourApiSourceDetail({
  sourceId,
  sourceName,
  endpoint,
  query,
  records,
  statusLabel = "실시간 조회 성공",
  note,
}: {
  sourceId: string;
  sourceName: string;
  endpoint: string;
  query: Record<string, string | number | undefined>;
  records: MetricEvidenceSourceDetail["records"];
  statusLabel?: string;
  note?: string;
}): MetricEvidenceSourceDetail {
  return {
    sourceId,
    sourceName,
    sourceType: "tourapi",
    statusLabel,
    retrievedAt: new Date().toISOString(),
    endpoint,
    query: safeQueryFields(query),
    records,
    note,
  };
}

function festivalRecordFields(item: TourApiItem) {
  return [
    { label: "contentid", value: String(item.contentid ?? "-") },
    { label: "title", value: item.title ?? "-" },
    { label: "addr1", value: item.addr1 ?? "-" },
    { label: "eventstartdate", value: formatTourApiDate(item.eventstartdate) },
    { label: "eventenddate", value: formatTourApiDate(item.eventenddate) },
    { label: "playtime", value: item.playtime ?? "-" },
    { label: "mapx/mapy", value: `${item.mapx ?? "-"}, ${item.mapy ?? "-"}` },
  ];
}

function nearbySpotRecordFields(item: TourApiItem) {
  return [
    { label: "contentid", value: String(item.contentid ?? "-") },
    { label: "title", value: item.title ?? "-" },
    { label: "addr1", value: item.addr1 ?? "-" },
    { label: "dist", value: item.dist ? `${item.dist}m` : "-" },
    { label: "mapx/mapy", value: `${item.mapx ?? "-"}, ${item.mapy ?? "-"}` },
  ];
}

function sampleSourceDetails(sourceIds: string[]) {
  return (sampleTourismContext.sourceDetails ?? []).filter((detail) =>
    sourceIds.includes(detail.sourceId),
  );
}

function createFestivalDetailSources(
  sourceIdPrefix: string,
  items: TourApiItem[],
  statuses?: boolean[],
) {
  return items.map((item, index) => {
    const succeeded = statuses?.[index] ?? true;

    return createTourApiSourceDetail({
      sourceId: `${sourceIdPrefix}-${String(item.contentid ?? index)}`,
      sourceName: "TourAPI 축제 상세 조회",
      endpoint: "/api/tour/detail",
      query: { contentId: item.contentid },
      records: [
        {
          label: String(item.title ?? item.contentid ?? "축제 상세"),
          fields: festivalRecordFields(item),
        },
      ],
      statusLabel: succeeded ? "실시간 조회 성공" : "상세 조회 실패: 검색 결과 사용",
      note: succeeded
        ? undefined
        : "상세 조회에 실패해 축제 검색 응답의 공개 필드만 후보에 사용했습니다.",
    });
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasText(value: unknown): value is string | number {
  return (
    (typeof value === "string" && value.trim().length > 0) ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

function hasFiniteNumber(value: unknown) {
  return hasText(value) && Number.isFinite(Number(value));
}

function isValidContentItem(
  item: TourApiItem,
): item is TourApiItem & { contentid: string | number; title: string } {
  return hasText(item.contentid) && typeof item.title === "string" && item.title.trim().length > 0;
}

function isValidFestivalItem(item: TourApiItem): item is ValidFestivalItem {
  return isValidContentItem(item) && typeof item.addr1 === "string" && item.addr1.trim().length > 0;
}

function isValidNearbyItem(item: TourApiItem): item is ValidNearbyItem {
  return (
    isValidContentItem(item) &&
    hasText(item.contenttypeid) &&
    hasFiniteNumber(item.dist) &&
    Number(item.dist) >= 0
  );
}

export function createFallbackTourismContext(
  plan: FestivalPlan,
  reason: string,
): TourismContext {
  return {
    ...sampleTourismContext,
    provenance: {
      ...sampleTourismContext.provenance,
      sourceStatus: "sample-fallback",
      basisText:
        "TourAPI 형태의 샘플 공공데이터와 메타데이터 기반 추정 수요 프록시를 사용합니다.",
      fallbackReason: reason,
      retrievedAt: new Date().toISOString(),
    },
    nearbySpots: sampleTourismContext.nearbySpots.map((spot) => ({
      ...spot,
      category: `${plan.region} ${spot.category}`,
    })),
  };
}

function createTourApiUrl(
  operation: TourApiOperation,
  params: Record<string, string | number | undefined>,
) {
  const url = new URL(`/api/tour/${operation}`, window.location.origin);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return `${url.pathname}${url.search}`;
}

function formatDateForTourApi(date: string) {
  return date.replace(/-/g, "");
}

function formatTourApiDateForInput(date: string | number | undefined) {
  const value = String(date ?? "");

  if (!/^\d{8}$/.test(value)) return "";

  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function parseOperatingHoursFromText(value?: string) {
  if (!value) return undefined;

  const normalized = value.replace(/[：]/g, ":").replace(/\s+/g, " ").trim();
  const tokens: number[] = [];
  const regex = /(?:(오전|오후|AM|PM|am|pm)\s*)?(\d{1,2})(?::(\d{2})|시)?/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(normalized)) !== null) {
    const ampm = match[1];
    let hour = Number(match[2]);

    if (!Number.isFinite(hour) || hour < 0 || hour > 24) continue;

    if (ampm) {
      const isPm = /오후|PM|pm/i.test(ampm);
      const isAm = /오전|AM|am/i.test(ampm);
      if (isPm && hour < 12) hour += 12;
      if (isAm && hour === 12) hour = 0;
    }
    tokens.push(hour);
  }

  if (tokens.length < 2) return undefined;

  let openingHour = Math.floor(tokens[0]);
  let closingHour = Math.floor(tokens[1]);

  if (closingHour <= openingHour && closingHour >= 1 && closingHour <= 8 && openingHour >= 8) {
    closingHour += 12;
  }

  if (closingHour <= openingHour || openingHour < 6 || closingHour > 24) {
    return undefined;
  }

  return { openingHour, closingHour };
}

function parseTourApiDate(value: string | number | undefined) {
  const normalized = String(value ?? "").replace(/-/g, "");
  if (!/^\d{8}$/.test(normalized)) return undefined;

  const year = Number(normalized.slice(0, 4));
  const month = Number(normalized.slice(4, 6)) - 1;
  const day = Number(normalized.slice(6, 8));
  const timestamp = Date.UTC(year, month, day);

  return Number.isFinite(timestamp) ? timestamp : undefined;
}

function dateOverlapDays(
  startA: string | number | undefined,
  endA: string | number | undefined,
  startB: string,
  endB: string,
) {
  const aStart = parseTourApiDate(startA);
  const aEnd = parseTourApiDate(endA);
  const bStart = parseTourApiDate(startB);
  const bEnd = parseTourApiDate(endB);

  if (aStart === undefined || aEnd === undefined || bStart === undefined || bEnd === undefined) {
    return 0;
  }

  const overlapStart = Math.max(aStart, bStart);
  const overlapEnd = Math.min(aEnd, bEnd);

  if (overlapEnd < overlapStart) return 0;

  return Math.floor((overlapEnd - overlapStart) / 86_400_000) + 1;
}

function sortFestivalItemsForPlan(items: TourApiItem[], plan: FestivalPlan) {
  return [...items].sort((left, right) => {
    const overlapDifference =
      dateOverlapDays(right.eventstartdate, right.eventenddate, plan.startDate, plan.endDate) -
      dateOverlapDays(left.eventstartdate, left.eventenddate, plan.startDate, plan.endDate);
    if (overlapDifference !== 0) return overlapDifference;

    const leftStart = parseTourApiDate(left.eventstartdate) ?? Number.MAX_SAFE_INTEGER;
    const rightStart = parseTourApiDate(right.eventstartdate) ?? Number.MAX_SAFE_INTEGER;
    if (leftStart !== rightStart) return leftStart - rightStart;

    const titleDifference = String(left.title ?? "").localeCompare(String(right.title ?? ""), "ko");
    if (titleDifference !== 0) return titleDifference;

    return String(left.contentid ?? "").localeCompare(String(right.contentid ?? ""));
  });
}

function normalizeRegionText(value: string | undefined) {
  return String(value ?? "")
    .replace(/\s+/g, "")
    .replace(/특별자치도|특별자치시|광역시|특별시|자치도|도|시|군|구/g, "")
    .toLowerCase();
}

const REGION_ALIASES: Record<string, string[]> = {
  충남: ["충남", "충청남"],
  충청남: ["충남", "충청남"],
  충북: ["충북", "충청북"],
  충청북: ["충북", "충청북"],
  경남: ["경남", "경상남"],
  경상남: ["경남", "경상남"],
  경북: ["경북", "경상북"],
  경상북: ["경북", "경상북"],
  전남: ["전남", "전라남"],
  전라남: ["전남", "전라남"],
  전북: ["전북", "전라북"],
  전라북: ["전북", "전라북"],
};

function regionAliases(value: string) {
  const normalized = normalizeRegionText(value);
  return new Set([normalized, ...(REGION_ALIASES[normalized] ?? [])]);
}

function regionMatches(planRegion: string, candidateRegion: string) {
  const planAliases = regionAliases(planRegion);
  const candidateAliases = regionAliases(candidateRegion);

  return Array.from(planAliases).some((planAlias) =>
    Array.from(candidateAliases).some(
      (candidateAlias) =>
        planAlias.length > 0 &&
        candidateAlias.length > 0 &&
        (planAlias.includes(candidateAlias) || candidateAlias.includes(planAlias)),
    ),
  );
}

function createRegionalSupplementSourceDetail(items: TourApiItem[]): MetricEvidenceSourceDetail {
  return {
    sourceId: "regional-festival-candidate-supplement",
    sourceName: "지역축제 공식/표준 후보 보강 데이터",
    sourceType: "sample",
    statusLabel: "TourAPI 후보 보강",
    retrievedAt: new Date().toISOString(),
    endpoint: "regional-festival-candidates",
    records: items.map((item) => ({
      label: String(item.title ?? item.contentid ?? "지역축제 후보"),
      fields: [
        { label: "contentid", value: String(item.contentid ?? "-") },
        { label: "title", value: item.title ?? "-" },
        { label: "addr1", value: item.addr1 ?? "-" },
        { label: "eventstartdate", value: formatTourApiDate(item.eventstartdate) },
        { label: "eventenddate", value: formatTourApiDate(item.eventenddate) },
        { label: "source", value: item.overview ?? "-" },
      ],
    })),
    note:
      "TourAPI searchFestival2가 특정 지역/기간 후보를 충분히 반환하지 않는 경우 공식 지역축제 정보를 후보 탐색용으로 보강합니다.",
  };
}

function getRegionalSupplementFestivalItems(plan: FestivalPlan): TourApiItem[] {
  return regionalFestivalCandidateRecords
    .filter((record) => regionMatches(plan.region, record.region))
    .filter((record) => dateOverlapDays(record.startDate, record.endDate, plan.startDate, plan.endDate) > 0)
    .map((record) => ({
      contentid: record.id,
      title: record.title,
      addr1: record.address,
      eventstartdate: record.startDate.replace(/-/g, ""),
      eventenddate: record.endDate.replace(/-/g, ""),
      overview: `${record.sourceName} (${record.sourceUrl})`,
    }));
}

function planRangeDays(plan: FestivalPlan) {
  const start = Date.parse(`${plan.startDate}T00:00:00.000Z`);
  const end = Date.parse(`${plan.endDate}T00:00:00.000Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.floor((end - start) / 86400000) + 1;
}

function shouldFetchRegionalSupplement(plan: FestivalPlan, festivalItems: TourApiItem[]) {
  return festivalItems.length === 0 || planRangeDays(plan) >= 30;
}

function buildRegionalFestivalSupplementUrl(plan: FestivalPlan) {
  const params = new URLSearchParams();
  params.set("region", plan.region);
  params.set("startDate", plan.startDate);
  params.set("endDate", plan.endDate);
  params.set("keywords", plan.keywords.join(","));
  params.set("limit", String(MAX_FESTIVAL_CANDIDATES));
  return `/api/regional-festivals?${params.toString()}`;
}

function regionalFestivalRecordToTourApiItem(record: RegionalFestivalApiRecord): TourApiItem {
  return {
    contentid: record.id,
    title: record.name,
    addr1: [record.region, record.localGovernment, record.venue].filter(Boolean).join(" "),
    eventstartdate: record.startDate?.replace(/-/g, ""),
    eventenddate: record.endDate?.replace(/-/g, ""),
    budgetMillionKrw: record.budgetMillionKrw,
    visitors: record.visitors,
    overview: `${record.sourceName ?? "문화체육관광부_지역축제 정보"}${
      record.sourceFile ? ` (${record.sourceFile})` : ""
    }`,
  };
}

async function fetchRegionalSupplementFestivalItems(
  plan: FestivalPlan,
  fetchImpl: typeof fetch,
  signal?: AbortSignal,
): Promise<TourApiItem[]> {
  try {
    const response = await fetchImpl(buildRegionalFestivalSupplementUrl(plan), { signal });
    if (!response.ok) throw new Error(`Regional festival DB HTTP ${response.status}`);
    const payload = (await response.json()) as { records?: RegionalFestivalApiRecord[] };
    const records = Array.isArray(payload.records) ? payload.records : [];
    return records.length > 0
      ? records.map(regionalFestivalRecordToTourApiItem)
      : getRegionalSupplementFestivalItems(plan);
  } catch (error) {
    if (
      signal?.aborted ||
      (typeof error === "object" && error !== null && "name" in error && error.name === "AbortError")
    ) {
      throw error;
    }
    return getRegionalSupplementFestivalItems(plan);
  }
}

function mergeMatchingFestivalDetail(searchItem: TourApiItem, detailItem: TourApiItem | undefined) {
  if (
    !detailItem ||
    String(detailItem.contentid ?? "") !== String(searchItem.contentid ?? "")
  ) {
    return searchItem;
  }

  return {
    ...searchItem,
    ...detailItem,
    contentid: searchItem.contentid,
  };
}

function mergeMatchingFestivalIntro(searchItem: TourApiItem, introItem: TourApiItem | undefined) {
  if (!introItem) return searchItem;

  return {
    ...searchItem,
    playtime: introItem.playtime ?? searchItem.playtime,
    eventplace: introItem.eventplace ?? searchItem.eventplace,
    usetimefestival: introItem.usetimefestival ?? searchItem.usetimefestival,
  };
}

function buildExactFestivalSearchParams(plan: FestivalPlan, areaCode: string | number) {
  return {
    numOfRows: FESTIVAL_SEARCH_ROWS,
    pageNo: 1,
    arrange: "A",
    areaCode,
    eventStartDate: formatDateForTourApi(plan.startDate),
    eventEndDate: formatDateForTourApi(plan.endDate),
  };
}

function buildAnnualFestivalSearchParams(plan: FestivalPlan, areaCode: string | number) {
  const year = plan.startDate.slice(0, 4);

  return {
    numOfRows: FESTIVAL_SEARCH_ROWS,
    pageNo: 1,
    arrange: "A",
    areaCode,
    eventStartDate: `${year}0101`,
    eventEndDate: `${year}1231`,
  };
}

function validateItem(operation: TourApiOperation, value: unknown): TourApiItem {
  if (!isRecord(value)) {
    throw new Error(`TourAPI ${operation} item shape is invalid`);
  }

  const item = value as TourApiItem;

  if (operation === "area-code") {
    if (!hasText(item.code) || !hasText(item.name)) {
      throw new Error(`TourAPI ${operation} item is missing code or name`);
    }
    return item;
  }

  if (operation === "detail-intro") {
    return item;
  }

  if (!isValidContentItem(item)) {
    throw new Error(`TourAPI ${operation} item is missing contentid or title`);
  }

  if (operation === "nearby") {
    if (!isValidNearbyItem(item)) {
      throw new Error(`TourAPI ${operation} item is missing content type or distance`);
    }
  } else if (!isValidFestivalItem(item)) {
    throw new Error(`TourAPI ${operation} item is missing an address`);
  }

  return item;
}

function normalizeItems(operation: TourApiOperation, payload: unknown): TourApiItem[] {
  if (!isRecord(payload) || !isRecord(payload.response)) {
    throw new Error(`TourAPI ${operation} response shape is invalid`);
  }

  const { header, body } = payload.response;
  if (!isRecord(header) || header.resultCode !== "0000") {
    throw new Error(`TourAPI ${operation} returned an invalid result code`);
  }
  if (!isRecord(body) || !hasFiniteNumber(body.totalCount) || Number(body.totalCount) < 0) {
    throw new Error(`TourAPI ${operation} body shape is invalid`);
  }

  const totalCount = Number(body.totalCount);
  if (totalCount === 0) {
    const emptyItemsObject =
      isRecord(body.items) &&
      (body.items.item === undefined ||
        (Array.isArray(body.items.item) && body.items.item.length === 0));
    const validEmptyItems =
      body.items === "" ||
      body.items === null ||
      body.items === undefined ||
      emptyItemsObject;
    if (!validEmptyItems) {
      throw new Error(`TourAPI ${operation} empty items shape is invalid`);
    }
    return [];
  }

  if (!isRecord(body.items)) {
    throw new Error(`TourAPI ${operation} items shape is invalid`);
  }

  const rawItems = body.items.item;
  const items = Array.isArray(rawItems) ? rawItems : [rawItems];
  if (items.length === 0 || items.some((item) => item === undefined)) {
    throw new Error(`TourAPI ${operation} items are missing`);
  }

  return items.map((item) => validateItem(operation, item));
}

async function fetchTourApiItems(
  operation: TourApiOperation,
  params: Record<string, string | number | undefined>,
  fetchImpl: typeof fetch,
  signal?: AbortSignal,
) {
  const response = await fetchImpl(createTourApiUrl(operation, params), { signal });

  if (!response.ok) {
    throw new Error(`TourAPI ${operation} HTTP ${response.status}`);
  }

  return normalizeItems(operation, await response.json());
}

function contentTypeLabel(contentTypeId: string | number) {
  const labels: Record<string, string> = {
    "12": "관광지",
    "14": "문화시설",
    "15": "축제·공연·행사",
    "28": "레포츠",
    "38": "쇼핑",
    "39": "음식점",
  };

  return labels[String(contentTypeId)] ?? "기타";
}

function distanceToKm(distance: string | number) {
  const meters = Number(distance);
  return Math.round((meters / 1000) * 10) / 10;
}

function textIncludesAnyKeyword(text: string, keywords: string[]) {
  return keywords.filter((keyword) => text.includes(keyword)).length;
}

function estimateVisitors(item: TourApiItem, nearbyCount: number) {
  const hasImageBonus = item.firstimage ? 6000 : 0;
  const hasOverviewBonus = item.overview ? 5000 : 0;
  const durationBonus =
    item.eventstartdate && item.eventenddate && item.eventstartdate !== item.eventenddate
      ? 8000
      : 3000;

  return 18000 + hasImageBonus + hasOverviewBonus + durationBonus + nearbyCount * 1200;
}

function mapNearbySpot(item: ValidNearbyItem): TourismSpot {
  const distanceKm = distanceToKm(item.dist);

  return {
    id: String(item.contentid),
    name: item.title,
    category: contentTypeLabel(item.contenttypeid),
    distanceKm,
    appealScore: Math.round(
      clamp(86 - distanceKm * 7 + (item.firstimage ? 8 : 0), 40, 95),
    ),
  };
}

function mapSimilarFestival(
  plan: FestivalPlan,
  item: ValidFestivalItem,
  nearbyCount: number,
): SimilarFestival {
  const text = `${item.title} ${item.overview ?? ""}`;
  const matchedKeywords = textIncludesAnyKeyword(text, plan.keywords);
  const themeOverlap = clamp(0.35 + matchedKeywords * 0.18, 0.35, 0.95);

  return {
    id: String(item.contentid ?? item.code ?? Math.random()),
    name: item.title ?? "축제 명칭 미상",
    region: item.addr1 ?? plan.region,
    visitors: estimateVisitors(item, nearbyCount),
    themeOverlap: Math.round(themeOverlap * 100) / 100,
  };
}

export function mapTourApiItemsToTourismContext(
  plan: FestivalPlan,
  festivalItems: TourApiItem[],
  nearbyItems: TourApiItem[],
  retrievedAt: string,
  options: {
    festivalSearchScope?: FestivalSearchScope;
    sourceDetails?: MetricEvidenceSourceDetail[];
  } = {},
): TourismContext {
  const nearbySpots = nearbyItems
    .filter(isValidNearbyItem)
    .slice(0, MAX_NEARBY_SPOTS)
    .map(mapNearbySpot);
  const similarFestivals = festivalItems
    .filter(isValidFestivalItem)
    .slice(0, MAX_SIMILAR_FESTIVALS)
    .map((item) => mapSimilarFestival(plan, item, nearbySpots.length));

  if (nearbySpots.length === 0 && similarFestivals.length === 0) {
    const fallback = createFallbackTourismContext(
      plan,
      "TourAPI 응답에 유효한 관광지와 축제 데이터가 없어 샘플 데이터를 사용합니다.",
    );
    return {
      ...fallback,
      provenance: {
        ...fallback.provenance,
        retrievedAt,
      },
    };
  }

  if (nearbySpots.length === 0 || similarFestivals.length === 0) {
    const fallbackReason =
      options.festivalSearchScope === "annual-region"
        ? "입력 기간 직접 일치 결과가 없어 같은 지역의 연간 TourAPI 축제 데이터를 참고했으며, 부족한 관광지 또는 축제 데이터는 샘플로 보완했습니다."
        : "TourAPI 응답 일부 부족";

    return {
      ...createFallbackTourismContext(
        plan,
        "TourAPI 응답에 예측에 필요한 관광지 또는 축제 데이터가 부족해 샘플을 보완했습니다.",
      ),
      provenance: {
        ...sampleTourismContext.provenance,
        sourceName: "한국관광공사 TourAPI + 샘플 보완",
        sourceStatus: "partial-fallback",
        basisText:
          "실제 TourAPI 조회 결과 일부와 샘플 공공데이터를 함께 사용하며 축제 수요는 메타데이터 기반 추정 프록시입니다.",
        fallbackText:
          "TourAPI 응답이 부족한 항목은 기존 샘플 데이터로 보완합니다.",
        fallbackReason,
        retrievedAt,
      },
      nearbySpots: nearbySpots.length > 0 ? nearbySpots : sampleTourismContext.nearbySpots,
      similarFestivals:
        similarFestivals.length > 0
          ? similarFestivals
          : sampleTourismContext.similarFestivals,
      sourceDetails: [
        ...(options.sourceDetails ?? []),
        ...sampleSourceDetails([
          ...(nearbySpots.length === 0 ? ["sample-nearby-spots"] : []),
          ...(similarFestivals.length === 0 ? ["sample-similar-festivals"] : []),
        ]),
      ],
    };
  }

  if (options.festivalSearchScope === "annual-region") {
    return {
      provenance: {
        sourceName: "한국관광공사 TourAPI + 기간 완화 검색",
        sourceType: "public-data",
        sourceStatus: "partial-fallback",
        basisText:
          "입력 기간 직접 일치 결과가 없어 같은 지역의 연간 TourAPI 축제 데이터를 참고하며 축제 수요는 메타데이터 기반 추정 프록시입니다.",
        fallbackText:
          "입력 기간과 직접 일치하지 않는 항목은 같은 지역의 연간 축제 데이터와 기존 샘플 데이터로 보완합니다.",
        fallbackReason:
          "입력 기간 직접 일치 결과가 없어 같은 지역의 연간 TourAPI 축제 데이터를 참고했습니다.",
        retrievedAt,
        collectedPersonalData: false,
      },
      nearbySpots,
      similarFestivals,
      sourceDetails: options.sourceDetails,
    };
  }

  return {
    provenance: {
      sourceName: "한국관광공사 TourAPI",
      sourceType: "public-data",
      sourceStatus: "live",
      basisText:
        "TourAPI 행사정보와 위치기반 관광정보를 실제 조회하며 축제 수요는 메타데이터 기반 추정 프록시로 사용합니다.",
      fallbackText:
        "호출 실패 또는 응답 부족 시 TourAPI 형태의 샘플 데이터를 사용합니다.",
      retrievedAt,
      collectedPersonalData: false,
    },
    nearbySpots,
    similarFestivals,
    sourceDetails: options.sourceDetails,
  };
}

async function resolveAreaCode(
  plan: FestivalPlan,
  fetchImpl: typeof fetch,
  signal?: AbortSignal,
) {
  const items = (await fetchTourApiItems(
    "area-code",
    { numOfRows: 50, pageNo: 1 },
    fetchImpl,
    signal,
  ));

  return items.find((item) => item.name && regionMatches(plan.region, String(item.name)))?.code;
}

export async function getTourApiAreaCodes(
  options: TourApiOptions = {},
): Promise<TourApiAreaCode[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const items = await fetchTourApiItems(
    "area-code",
    { numOfRows: 50, pageNo: 1 },
    fetchImpl,
    options.signal,
  );

  return items
    .filter((item) => hasText(item.code) && hasText(item.name))
    .map((item) => ({
      code: String(item.code),
      name: String(item.name),
    }));
}

function mapFestivalCandidate(
  item: TourApiItem,
  searchScope: FestivalSearchScope,
  sourceDetails: MetricEvidenceSourceDetail[],
): FestivalCandidate | undefined {
  if (!isValidContentItem(item)) return undefined;
  const operatingTimeText =
    (typeof item.playtime === "string" && item.playtime.trim().length > 0 ? item.playtime.trim() : undefined) ??
    (typeof item.usetimefestival === "string" && item.usetimefestival.trim().length > 0 ? item.usetimefestival.trim() : undefined);

  const operatingHours =
    parseOperatingHoursFromText(operatingTimeText) ??
    parseOperatingHoursFromText(typeof item.overview === "string" ? item.overview : undefined);

  const address =
    (typeof item.addr1 === "string" && item.addr1.trim().length > 0)
      ? item.addr1.trim()
      : (typeof item.overview === "string" && item.overview.trim().length > 0)
        ? item.overview.trim()
        : "주소 정보 미기재";

  const organizer =
    [item.sponsor1, item.sponsor2].filter((s) => typeof s === "string" && s.trim().length > 0).join(" / ") ||
    undefined;

  return {
    id: String(item.contentid ?? item.code ?? Math.random()),
    title: item.title ?? "축제 명칭 미상",
    address,
    startDate: formatTourApiDateForInput(item.eventstartdate),
    endDate: formatTourApiDateForInput(item.eventenddate),
    mapX: hasFiniteNumber(item.mapx) ? String(item.mapx) : undefined,
    mapY: hasFiniteNumber(item.mapy) ? String(item.mapy) : undefined,
    imageUrl: getRepresentativeFestivalImage({
      title: item.title,
      address,
      existingImageUrl: item.firstimage ?? undefined,
    }),
    organizer,
    budgetMillionKrw: hasFiniteNumber(item.budgetMillionKrw)
      ? Number(item.budgetMillionKrw)
      : undefined,
    visitors: hasFiniteNumber(item.visitors) ? Number(item.visitors) : undefined,
    operatingTimeText,
    ...operatingHours,
    searchScope,
    sourceDetails,
  };
}

function selectedCandidateToTourApiItem(candidate: FestivalCandidate): TourApiItem {
  return {
    contentid: candidate.id,
    title: candidate.title,
    addr1: candidate.address,
    eventstartdate: candidate.startDate.replace(/-/g, ""),
    eventenddate: candidate.endDate.replace(/-/g, ""),
    mapx: candidate.mapX,
    mapy: candidate.mapY,
  };
}

async function getSelectedFestivalTourismContext(
  plan: FestivalPlan,
  selectedCandidate: FestivalCandidate,
  fetchImpl: typeof fetch,
  signal?: AbortSignal,
) {
  const fallbackItem = selectedCandidateToTourApiItem(selectedCandidate);
  let selectedItem = fallbackItem;
  let detailSucceeded = false;

  try {
    const detailItems = await fetchTourApiItems(
      "detail",
      { contentId: selectedCandidate.id },
      fetchImpl,
      signal,
    );
    selectedItem = {
      ...fallbackItem,
      ...detailItems[0],
      contentid: selectedCandidate.id,
      title: detailItems[0]?.title ?? selectedCandidate.title,
      addr1: detailItems[0]?.addr1 ?? selectedCandidate.address,
      mapx: detailItems[0]?.mapx ?? selectedCandidate.mapX,
      mapy: detailItems[0]?.mapy ?? selectedCandidate.mapY,
    };
    detailSucceeded = true;
  } catch {
    selectedItem = fallbackItem;
  }

  const nearbyQueryParams =
    selectedItem.mapx && selectedItem.mapy
      ? {
          numOfRows: 10,
          pageNo: 1,
          arrange: "E",
          mapX: selectedItem.mapx,
          mapY: selectedItem.mapy,
          radius: 5000,
        }
      : {};
  const nearbyItems =
    selectedItem.mapx && selectedItem.mapy
      ? await fetchTourApiItems("nearby", nearbyQueryParams, fetchImpl, signal)
      : [];
  const selectedNearbyItems = nearbyItems
    .filter(isValidNearbyItem)
    .slice(0, MAX_NEARBY_SPOTS);
  const detailSource = createTourApiSourceDetail({
    sourceId: `tourapi-selected-tourism-detail-${selectedCandidate.id}`,
    sourceName: "TourAPI 선택 축제 상세 조회",
    endpoint: "/api/tour/detail",
    query: { contentId: selectedCandidate.id },
    records: [
      {
        label: selectedCandidate.title,
        fields: festivalRecordFields(selectedItem),
      },
    ],
    statusLabel: detailSucceeded
      ? "실시간 조회 성공"
      : "상세 조회 실패: 선택 후보 메타데이터 사용",
    note: detailSucceeded
      ? undefined
      : "선택 후보의 contentId, 주소, 기간, 좌표를 현재 관광 컨텍스트 기준으로 사용했습니다.",
  });
  const nearbySource = createTourApiSourceDetail({
    sourceId: "tourapi-selected-tourism-nearby",
    sourceName: "TourAPI 선택 축제 주변 관광지 조회",
    endpoint: "/api/tour/nearby",
    query: nearbyQueryParams,
    records: selectedNearbyItems.map((item) => ({
      label: String(item.title ?? item.contentid ?? "주변 관광지"),
      fields: nearbySpotRecordFields(item),
    })),
    statusLabel:
      selectedItem.mapx && selectedItem.mapy
        ? "실시간 조회 성공"
        : "조회하지 않음: 선택 축제 좌표 없음",
    note:
      selectedItem.mapx && selectedItem.mapy
        ? "선택한 TourAPI 축제 후보의 좌표를 기준으로 주변 관광지를 조회했습니다."
        : "선택 축제 후보에 좌표가 없어 주변 관광지 조회를 생략했습니다.",
  });

  return mapTourApiItemsToTourismContext(
    plan,
    [selectedItem],
    nearbyItems,
    new Date().toISOString(),
    {
      festivalSearchScope: selectedCandidate.searchScope,
      sourceDetails: [detailSource, nearbySource],
    },
  );
}

export async function getFestivalCandidates(
  plan: FestivalPlan,
  options: TourApiOptions = {},
): Promise<FestivalCandidate[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const areaCode = await resolveAreaCode(plan, fetchImpl, options.signal);

  if (!areaCode) return [];

  let festivalSearchScope: FestivalSearchScope = "exact-period";
  let festivalQueryParams = buildExactFestivalSearchParams(plan, areaCode);
  let festivalItems = await fetchTourApiItems(
    "festivals",
    festivalQueryParams,
    fetchImpl,
    options.signal,
  );

  if (festivalItems.length === 0) {
    festivalSearchScope = "annual-region";
    festivalQueryParams = buildAnnualFestivalSearchParams(plan, areaCode);
    festivalItems = await fetchTourApiItems(
      "festivals",
      festivalQueryParams,
      fetchImpl,
      options.signal,
    );
  }

  const supplementalItems = shouldFetchRegionalSupplement(plan, festivalItems)
    ? await fetchRegionalSupplementFestivalItems(plan, fetchImpl, options.signal)
    : [];
  const supplementalIds = new Set(
    festivalItems.map((item) => String(item.contentid ?? "")).concat(
      festivalItems.map((item) => String(item.title ?? "").replace(/\s+/g, "")),
    ),
  );
  const uniqueSupplementalItems = supplementalItems.filter(
    (item) =>
      !supplementalIds.has(String(item.contentid ?? "")) &&
      !supplementalIds.has(String(item.title ?? "").replace(/\s+/g, "")),
  );
  const candidateItems = sortFestivalItemsForPlan(
    [...festivalItems, ...uniqueSupplementalItems],
    plan,
  ).slice(0, MAX_FESTIVAL_CANDIDATES);
  const detailCandidateItems = candidateItems.slice(0, MAX_FESTIVAL_CANDIDATE_DETAILS);
  const detailLookups = await Promise.all(
    detailCandidateItems.map((item) =>
      Promise.allSettled([
        fetchTourApiItems(
          "detail",
          { contentId: item.contentid },
          fetchImpl,
          options.signal,
        ),
        fetchTourApiItems(
          "detail-intro",
          { contentId: item.contentid, contentTypeId: 15 },
          fetchImpl,
          options.signal,
        ),
      ]).then(([detailResult, introResult]) => {
        const detailItem = detailResult.status === "fulfilled" ? detailResult.value[0] : undefined;
        const introItem = introResult.status === "fulfilled" ? introResult.value[0] : undefined;

        return {
          item: mergeMatchingFestivalIntro(mergeMatchingFestivalDetail(item, detailItem), introItem),
          succeeded: detailResult.status === "fulfilled" || introResult.status === "fulfilled",
        };
      }),
    ),
  );
  const detailItems = [
    ...detailLookups.map((lookup) => lookup.item),
    ...candidateItems.slice(MAX_FESTIVAL_CANDIDATE_DETAILS),
  ];

  const searchSourceDetail = createTourApiSourceDetail({
    sourceId: "tourapi-festival-candidates",
    sourceName: "TourAPI 축제 정보 조회",
    endpoint: "/api/tour/festivals",
    query: festivalQueryParams,
    records: candidateItems.map((item) => ({
      label: String(item.title ?? item.contentid ?? "축제 정보"),
      fields: festivalRecordFields(item),
    })),
  });
  const detailSourceDetails = createFestivalDetailSources(
    "tourapi-festival-candidate-detail",
    detailLookups.map((lookup) => lookup.item),
    detailLookups.map((lookup) => lookup.succeeded),
  );
  const supplementSourceDetails =
    uniqueSupplementalItems.length > 0
      ? [createRegionalSupplementSourceDetail(uniqueSupplementalItems)]
      : [];
  const sourceDetails = [searchSourceDetail, ...supplementSourceDetails, ...detailSourceDetails];

  return detailItems
    .map((item) =>
      mapFestivalCandidate(
        item,
        uniqueSupplementalItems.some((supplement) => supplement.contentid === item.contentid)
          ? "regional-supplement"
          : festivalSearchScope,
        sourceDetails,
      ),
    )
    .filter((item): item is FestivalCandidate => Boolean(item))
    .sort((a, b) => (a.startDate || "").localeCompare(b.startDate || ""));
}

export async function getTourismContext(
  plan: FestivalPlan,
  options: TourApiOptions = {},
): Promise<TourismContext> {
  const fetchImpl = options.fetchImpl ?? fetch;

  try {
    if (options.selectedCandidate) {
      return await getSelectedFestivalTourismContext(
        plan,
        options.selectedCandidate,
        fetchImpl,
        options.signal,
      );
    }

    const areaCode = await resolveAreaCode(plan, fetchImpl, options.signal);

    if (!areaCode) {
      return createFallbackTourismContext(
        plan,
        "TourAPI 지역 코드 매핑에 실패해 샘플 데이터를 사용합니다.",
      );
    }

    let festivalSearchScope: FestivalSearchScope = "exact-period";
    let festivalQueryParams = buildExactFestivalSearchParams(plan, areaCode);
    let festivalItems = await fetchTourApiItems(
      "festivals",
      festivalQueryParams,
      fetchImpl,
      options.signal,
    );

    if (festivalItems.length === 0) {
      festivalSearchScope = "annual-region";
      festivalQueryParams = buildAnnualFestivalSearchParams(plan, areaCode);
      festivalItems = await fetchTourApiItems(
        "festivals",
        festivalQueryParams,
        fetchImpl,
        options.signal,
      );
    }

    const usedFestivalItems = festivalItems.slice(0, MAX_SIMILAR_FESTIVALS);
    const detailItems = await Promise.all(
      usedFestivalItems.map((item) =>
        fetchTourApiItems(
          "detail",
          {
            contentId: item.contentid,
          },
          fetchImpl,
          options.signal,
        ).then((items) => mergeMatchingFestivalDetail(item, items[0])),
      ),
    );
    const firstLocatedItem = detailItems.find((item) => item.mapx && item.mapy);
    const nearbyQueryParams = firstLocatedItem
      ? {
          numOfRows: 10,
          pageNo: 1,
          arrange: "E",
          mapX: firstLocatedItem.mapx,
          mapY: firstLocatedItem.mapy,
          radius: 5000,
        }
      : {};
    const nearbyItems = firstLocatedItem
      ? await fetchTourApiItems(
          "nearby",
          nearbyQueryParams,
          fetchImpl,
          options.signal,
        )
      : [];
    const festivalDetailSource = createTourApiSourceDetail({
      sourceId: "tourapi-tourism-festivals",
      sourceName: "TourAPI 축제 정보 조회",
      endpoint: "/api/tour/festivals",
      query: festivalQueryParams,
      records: usedFestivalItems.map((item) => ({
        label: String(item.title ?? item.contentid ?? "축제 정보"),
        fields: festivalRecordFields(item),
      })),
    });
    const festivalDetailSources = createFestivalDetailSources(
      "tourapi-tourism-detail",
      detailItems,
    );
    const usedNearbyItems = nearbyItems
      .filter(isValidNearbyItem)
      .slice(0, MAX_NEARBY_SPOTS);
    const nearbyLocationSource = createTourApiSourceDetail({
      sourceId: "tourapi-tourism-nearby",
      sourceName: "TourAPI 주변 관광지 조회",
      endpoint: "/api/tour/nearby",
      query: nearbyQueryParams,
      records: usedNearbyItems.map((item) => ({
        label: String(item.title ?? item.contentid ?? "주변 관광지"),
        fields: nearbySpotRecordFields(item),
      })),
      statusLabel: firstLocatedItem
        ? undefined
        : "조회하지 않음: 축제 좌표 없음",
      note: firstLocatedItem
        ? undefined
        : "축제 상세 응답에 좌표가 없어 주변 관광지 조회를 요청하지 않았습니다.",
    });

    return mapTourApiItemsToTourismContext(
      plan,
      detailItems,
      nearbyItems,
      new Date().toISOString(),
      {
        festivalSearchScope,
        sourceDetails: [
          festivalDetailSource,
          ...festivalDetailSources,
          nearbyLocationSource,
        ],
      },
    );
  } catch (error) {
    if (
      options.signal?.aborted ||
      (typeof error === "object" && error !== null && "name" in error && error.name === "AbortError")
    ) {
      throw error;
    }
    return createFallbackTourismContext(
      plan,
      "TourAPI 호출 실패로 샘플 데이터를 사용합니다.",
    );
  }
}
