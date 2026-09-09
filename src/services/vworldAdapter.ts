import type { VenueCoordinates } from "../domain/types";

interface VWorldSearchOptions {
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

export interface VWorldCoordinateMatch {
  title: string;
  address: string;
  mapX: string;
  mapY: string;
}

interface VWorldItem {
  title?: string;
  address?: {
    road?: string;
    parcel?: string;
  };
  point?: {
    x?: string | number;
    y?: string | number;
  };
}

function hasValidKoreanCoordinates(mapX: string | number | undefined, mapY: string | number | undefined) {
  const longitude = Number(mapX);
  const latitude = Number(mapY);
  return (
    Number.isFinite(longitude) &&
    longitude >= 124 &&
    longitude <= 132 &&
    Number.isFinite(latitude) &&
    latitude >= 33 &&
    latitude <= 39
  );
}

function normalizeQuery(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[()[\]{}]/g, " ")
    .replace(/\b20\d{2}년?\s*/gi, "")
    .replace(/제\s*\d+\s*회\s*/gi, "")
    .replace(/\d+\s*회\s*/gi, "")
    .replace(/\s*(일원|일대|예정|가칭)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractParentheticalPlaceTerms(value: string) {
  return [...value.matchAll(/\(([^)]+)\)/g)]
    .flatMap((match) => match[1].split(/[,/·ㆍ]|및|와|과/))
    .map(normalizeQuery)
    .filter((term) => term.length >= 2);
}

function extractLandmarkTerms(value: string) {
  return [
    ...value.matchAll(/[0-9A-Za-z가-힣]+(?:시장|공원|광장|해수욕장|역|거리|항|성|컨벤션센터|월드컵경기장|천)/g),
  ]
    .map((match) => normalizeQuery(match[0]))
    .filter((term) => term.length >= 2);
}

function dedupe(values: string[]) {
  return Array.from(new Set(values.map(normalizeQuery).filter((value) => value.length >= 2)));
}

export function buildVWorldCoordinateQueries(input: { title: string; address: string; region: string }) {
  const parentheticalTerms = extractParentheticalPlaceTerms(input.address);
  const landmarkTerms = extractLandmarkTerms(`${input.title} ${input.address}`);
  const normalizedAddress = normalizeQuery(input.address);
  const normalizedTitle = normalizeQuery(input.title);

  return dedupe([
    `${input.region} ${normalizedTitle}`,
    normalizedAddress,
    ...landmarkTerms.map((term) => `${input.region} ${term}`),
    parentheticalTerms.length > 0 ? `${input.region} ${parentheticalTerms.join(" ")}` : "",
    ...parentheticalTerms.map((term) => `${input.region} ${term}`),
    `${input.region} ${normalizedAddress}`,
  ]);
}

function extractItems(payload: unknown): VWorldItem[] {
  if (typeof payload !== "object" || payload === null || !("response" in payload)) return [];
  const response = (payload as { response?: unknown }).response;
  if (typeof response !== "object" || response === null || !("result" in response)) return [];
  const result = (response as { result?: unknown }).result;
  if (typeof result !== "object" || result === null || !("items" in result)) return [];
  const items = (result as { items?: unknown }).items;
  return Array.isArray(items) ? (items as VWorldItem[]) : [];
}

async function fetchVWorldSearchItems(
  query: string,
  type: "PLACE" | "ADDRESS",
  options: VWorldSearchOptions,
) {
  const params = new URLSearchParams({ query, type });
  if (type === "ADDRESS") params.set("category", "ROAD");

  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(`/api/vworld/search?${params.toString()}`, {
    signal: options.signal,
  });
  if (!response.ok) return [];
  return extractItems(await response.json());
}

function itemToCoordinateMatch(item: VWorldItem): VWorldCoordinateMatch | null {
  if (!hasValidKoreanCoordinates(item.point?.x, item.point?.y)) return null;
  const address = item.address?.road || item.address?.parcel || "";
  if (!address) return null;

  return {
    title: item.title || address,
    address,
    mapX: String(item.point?.x),
    mapY: String(item.point?.y),
  };
}

const REGION_ALIASES = [
  ["서울", "서울특별시"], ["부산", "부산광역시"], ["대구", "대구광역시"],
  ["인천", "인천광역시"], ["광주", "광주광역시"], ["대전", "대전광역시"],
  ["울산", "울산광역시"], ["세종", "세종특별자치시"], ["경기", "경기도"],
  ["강원", "강원도", "강원특별자치도"], ["충북", "충청북도"], ["충남", "충청남도"],
  ["전북", "전라북도", "전북특별자치도"], ["전남", "전라남도"],
  ["경북", "경상북도"], ["경남", "경상남도"], ["제주", "제주도", "제주특별자치도"],
];

function regionName(value: string) {
  const token = value.trim().split(/\s+/)[0];
  return REGION_ALIASES.find((aliases) => aliases.includes(token))?.[0];
}

function canonicalPlace(value: string) {
  return normalizeQuery(value).replace(/\s+/g, "").toLowerCase();
}

function isRelevantMatch(
  match: VWorldCoordinateMatch,
  input: { title: string; address: string; region: string },
  type: "PLACE" | "ADDRESS",
) {
  const region = regionName(input.region);
  if (!region || regionName(match.address) !== region) return false;
  if (type === "ADDRESS") {
    // An address search for a landmark is not proof of that landmark's identity.
    const canonicalAddress = (value: string) => canonicalPlace(value.replace(/^\S+\s+/, `${region} `));
    return canonicalAddress(input.address) === canonicalAddress(match.address);
  }
  const names = [input.title, ...extractLandmarkTerms(input.address), ...extractParentheticalPlaceTerms(input.address)];
  return names.some((name) => canonicalPlace(name) === canonicalPlace(match.title));
}

export async function resolveVenueCoordinatesByVWorld(
  input: { title: string; address: string; region: string },
  options: VWorldSearchOptions = {},
): Promise<VWorldCoordinateMatch | null> {
  for (const query of buildVWorldCoordinateQueries(input)) {
    for (const type of ["PLACE", "ADDRESS"] as const) {
      const items = await fetchVWorldSearchItems(query, type, options);
      const matches = items.map(itemToCoordinateMatch)
        .filter((match): match is VWorldCoordinateMatch => match !== null && isRelevantMatch(match, input, type));
      const unique = new Map(matches.map((match) => [`${Number(match.mapX)}|${Number(match.mapY)}`, match]));
      if (unique.size > 1) return null;
      if (unique.size === 1) return unique.values().next().value ?? null;
    }
  }

  return null;
}

export function toVWorldVenueCoordinates(match: VWorldCoordinateMatch): VenueCoordinates {
  return {
    longitude: Number(match.mapX),
    latitude: Number(match.mapY),
    source: "vworld",
  };
}
