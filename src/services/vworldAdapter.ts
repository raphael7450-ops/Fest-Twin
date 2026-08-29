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

export async function resolveVenueCoordinatesByVWorld(
  input: { title: string; address: string; region: string },
  options: VWorldSearchOptions = {},
): Promise<VWorldCoordinateMatch | null> {
  for (const query of buildVWorldCoordinateQueries(input)) {
    for (const type of ["PLACE", "ADDRESS"] as const) {
      const items = await fetchVWorldSearchItems(query, type, options);
      const match = items.map(itemToCoordinateMatch).find(Boolean);
      if (match) return match;
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
