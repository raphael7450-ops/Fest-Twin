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
}

interface TourApiItem {
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

interface TourApiAreaCodeItem {
  code?: string;
  name?: string;
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
        "TourAPI 형태의 샘플 공공데이터를 사용해 수요 예측 근거를 유지합니다.",
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
  operation: string,
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

function normalizeItems(payload: unknown): TourApiItem[] {
  const body = (payload as { response?: { body?: { items?: { item?: unknown } } } })
    .response?.body;
  const item = body?.items?.item;

  if (!item) return [];
  return Array.isArray(item) ? (item as TourApiItem[]) : [item as TourApiItem];
}

async function fetchTourApiItems(
  operation: string,
  apiKey: string,
  params: Record<string, string | number | undefined>,
  fetchImpl: typeof fetch,
) {
  const response = await fetchImpl(createTourApiUrl(operation, apiKey, params));

  if (!response.ok) {
    throw new Error(`TourAPI ${operation} HTTP ${response.status}`);
  }

  return normalizeItems(await response.json());
}

function contentTypeLabel(contentTypeId: string | number | undefined) {
  const labels: Record<string, string> = {
    "12": "관광지",
    "14": "문화시설",
    "15": "축제·공연·행사",
    "28": "레포츠",
    "38": "쇼핑",
    "39": "음식점",
  };

  return labels[String(contentTypeId ?? "")] ?? "관광지";
}

function distanceToKm(distance: string | number | undefined, fallback: number) {
  const meters = Number(distance);

  if (!Number.isFinite(meters) || meters <= 0) return fallback;
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

function mapNearbySpot(item: TourApiItem, index: number): TourismSpot {
  const distanceKm = distanceToKm(item.dist, index + 1);

  return {
    id: String(item.contentid ?? `spot-${index + 1}`),
    name: item.title ?? `주변 관광지 ${index + 1}`,
    category: contentTypeLabel(item.contenttypeid),
    distanceKm,
    appealScore: Math.round(
      clamp(86 - distanceKm * 7 + (item.firstimage ? 8 : 0), 40, 95),
    ),
  };
}

function mapSimilarFestival(
  plan: FestivalPlan,
  item: TourApiItem,
  nearbyCount: number,
  index: number,
): SimilarFestival {
  const text = `${item.title ?? ""} ${item.overview ?? ""}`;
  const matchedKeywords = textIncludesAnyKeyword(text, plan.keywords);
  const themeOverlap = clamp(0.35 + matchedKeywords * 0.18, 0.35, 0.95);

  return {
    id: String(item.contentid ?? `festival-${index + 1}`),
    name: item.title ?? `유사 축제 ${index + 1}`,
    region: item.addr1 || plan.region,
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
  const nearbySpots = nearbyItems.slice(0, 6).map(mapNearbySpot);
  const similarFestivals = festivalItems
    .slice(0, 5)
    .map((item, index) => mapSimilarFestival(plan, item, nearbySpots.length, index));

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
          "실제 TourAPI 조회 결과 일부와 샘플 공공데이터를 함께 사용합니다.",
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
        "TourAPI 행사정보와 위치기반 관광정보를 실제 조회해 수요 예측 근거로 사용합니다.",
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
) {
  const items = (await fetchTourApiItems(
    "areaCode2",
    apiKey,
    { numOfRows: 50, pageNo: 1 },
    fetchImpl,
  )) as TourApiAreaCodeItem[];

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
    const areaCode = await resolveAreaCode(plan, apiKey, fetchImpl);

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
      },
      fetchImpl,
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
        )
      : [];

    return mapTourApiItemsToTourismContext(
      plan,
      detailItems,
      nearbyItems,
      new Date().toISOString(),
    );
  } catch {
    return createFallbackTourismContext(
      plan,
      "TourAPI 호출 실패로 샘플 데이터를 사용합니다.",
    );
  }
}
