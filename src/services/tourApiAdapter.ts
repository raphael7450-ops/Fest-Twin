import { sampleTourismContext } from "../data/sampleTourApi";
import type {
  FestivalPlan,
  SimilarFestival,
  TourismContext,
  TourismSpot,
} from "../domain/types";
import { clamp } from "./forecast";

const TOUR_API_BASE_URL = "https://apis.data.go.kr/B551011/KorService2";
const MOBILE_OS = "ETC";
const MOBILE_APP = "FestTwin";

interface TourApiOptions {
  apiKey?: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
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
  mapx?: string | number;
  mapy?: string | number;
}

type TourApiOperation =
  | "areaCode2"
  | "searchFestival2"
  | "detailCommon2"
  | "locationBasedList2";

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
  apiKey: string,
  params: Record<string, string | number | undefined>,
) {
  const url = new URL(`${TOUR_API_BASE_URL}/${operation}`);

  url.searchParams.set("serviceKey", apiKey);
  url.searchParams.set("MobileOS", MOBILE_OS);
  url.searchParams.set("MobileApp", MOBILE_APP);
  url.searchParams.set("_type", "json");

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

function validateItem(operation: TourApiOperation, value: unknown): TourApiItem {
  if (!isRecord(value)) {
    throw new Error(`TourAPI ${operation} item shape is invalid`);
  }

  const item = value as TourApiItem;

  if (operation === "areaCode2") {
    if (!hasText(item.code) || !hasText(item.name)) {
      throw new Error(`TourAPI ${operation} item is missing code or name`);
    }
    return item;
  }

  if (!isValidContentItem(item)) {
    throw new Error(`TourAPI ${operation} item is missing contentid or title`);
  }

  if (operation === "locationBasedList2") {
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
    const validEmptyItems =
      body.items === "" ||
      body.items === null ||
      (isRecord(body.items) && Array.isArray(body.items.item) && body.items.item.length === 0);
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
  apiKey: string,
  params: Record<string, string | number | undefined>,
  fetchImpl: typeof fetch,
  signal?: AbortSignal,
) {
  const response = await fetchImpl(createTourApiUrl(operation, apiKey, params), { signal });

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
    id: String(item.contentid),
    name: item.title,
    region: item.addr1,
    visitors: estimateVisitors(item, nearbyCount),
    themeOverlap: Math.round(themeOverlap * 100) / 100,
  };
}

export function mapTourApiItemsToTourismContext(
  plan: FestivalPlan,
  festivalItems: TourApiItem[],
  nearbyItems: TourApiItem[],
  retrievedAt: string,
): TourismContext {
  const nearbySpots = nearbyItems.filter(isValidNearbyItem).slice(0, 6).map(mapNearbySpot);
  const similarFestivals = festivalItems
    .filter(isValidFestivalItem)
    .slice(0, 5)
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
        fallbackReason: "TourAPI 응답 일부 부족",
        retrievedAt,
      },
      nearbySpots: nearbySpots.length > 0 ? nearbySpots : sampleTourismContext.nearbySpots,
      similarFestivals:
        similarFestivals.length > 0
          ? similarFestivals
          : sampleTourismContext.similarFestivals,
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
  };
}

async function resolveAreaCode(
  plan: FestivalPlan,
  apiKey: string,
  fetchImpl: typeof fetch,
  signal?: AbortSignal,
) {
  const items = (await fetchTourApiItems(
    "areaCode2",
    apiKey,
    { numOfRows: 50, pageNo: 1 },
    fetchImpl,
    signal,
  ));

  return items.find((item) => item.name && plan.region.includes(item.name))?.code;
}

export async function getTourismContext(
  plan: FestivalPlan,
  options: TourApiOptions = {},
): Promise<TourismContext> {
  const apiKey = options.apiKey ?? import.meta.env.VITE_TOUR_API_KEY;
  const fetchImpl = options.fetchImpl ?? fetch;

  if (!apiKey) {
    return createFallbackTourismContext(
      plan,
      "TourAPI 인증키가 없어 샘플 데이터를 사용합니다.",
    );
  }

  try {
    const areaCode = await resolveAreaCode(plan, apiKey, fetchImpl, options.signal);

    if (!areaCode) {
      return createFallbackTourismContext(
        plan,
        "TourAPI 지역 코드 매핑에 실패해 샘플 데이터를 사용합니다.",
      );
    }

    const festivalItems = await fetchTourApiItems(
      "searchFestival2",
      apiKey,
      {
        numOfRows: 10,
        pageNo: 1,
        arrange: "A",
        areaCode,
        eventStartDate: plan.startDate.replace(/-/g, ""),
        eventEndDate: plan.endDate.replace(/-/g, ""),
      },
      fetchImpl,
      options.signal,
    );
    const detailItems = await Promise.all(
      festivalItems.slice(0, 5).map((item) =>
        fetchTourApiItems(
          "detailCommon2",
          apiKey,
          {
            contentId: item.contentid,
            defaultYN: "Y",
            firstImageYN: "Y",
            addrinfoYN: "Y",
            mapinfoYN: "Y",
            overviewYN: "Y",
          },
          fetchImpl,
          options.signal,
        ).then((items) => ({ ...item, ...items[0] })),
      ),
    );
    const firstLocatedItem = detailItems.find((item) => item.mapx && item.mapy);
    const nearbyItems = firstLocatedItem
      ? await fetchTourApiItems(
          "locationBasedList2",
          apiKey,
          {
            numOfRows: 10,
            pageNo: 1,
            arrange: "E",
            mapX: firstLocatedItem.mapx,
            mapY: firstLocatedItem.mapy,
            radius: 5000,
          },
          fetchImpl,
          options.signal,
        )
      : [];

    return mapTourApiItemsToTourismContext(
      plan,
      detailItems,
      nearbyItems,
      new Date().toISOString(),
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
