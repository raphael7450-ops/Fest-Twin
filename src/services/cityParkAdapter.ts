export interface CityParkCandidate {
  id: string;
  name: string;
  type?: string;
  roadAddress?: string;
  lotAddress?: string;
  latitude?: number;
  longitude?: number;
  areaSquareMeters: number;
  managementOrganization?: string;
  referenceDate?: string;
  matchScore: number;
}

export interface CityParkLookupInput {
  venueName: string;
  venueAddress: string;
  region: string;
  coordinates?: { latitude: number; longitude: number };
}

type CityParkResponseItem = Omit<CityParkCandidate, "matchScore">;

interface RankedCandidate {
  candidate: CityParkCandidate;
  distanceKilometers: number;
  isPlausible: boolean;
}

const MAX_CANDIDATES = 10;
const EARTH_RADIUS_KILOMETERS = 6371;
const ADMINISTRATIVE_REGIONS = new Set([
  "서울특별시",
  "부산광역시",
  "대구광역시",
  "인천광역시",
  "광주광역시",
  "대전광역시",
  "울산광역시",
  "세종특별자치시",
  "경기도",
  "강원특별자치도",
  "충청북도",
  "충청남도",
  "전북특별자치도",
  "전라남도",
  "경상북도",
  "경상남도",
  "제주특별자치도",
]);

function createApiUrl(path: string) {
  if (typeof window !== "undefined" && window.location?.origin && window.location.origin !== "null") {
    return new URL(path, window.location.origin).toString();
  }
  return path;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeDisplayText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.normalize("NFKC").replace(/\s+/g, " ").trim();
  return normalized || undefined;
}

function normalizeComparableText(value: unknown): string {
  const text = normalizeDisplayText(value);
  return text ? text.replace(/[\s\p{P}\p{S}]+/gu, "").toLowerCase() : "";
}

function validCoordinates(value: unknown): { latitude: number; longitude: number } | undefined {
  if (!isRecord(value)) return undefined;
  const { latitude, longitude } = value;
  if (
    typeof latitude !== "number" ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    typeof longitude !== "number" ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    return undefined;
  }
  return { latitude, longitude };
}

function parseCandidate(value: unknown): CityParkResponseItem | undefined {
  if (!isRecord(value)) return undefined;

  const id = normalizeDisplayText(value.id);
  const name = normalizeDisplayText(value.name);
  const areaSquareMeters = value.areaSquareMeters;
  if (!id || !name || typeof areaSquareMeters !== "number" || !Number.isFinite(areaSquareMeters) || areaSquareMeters <= 0) {
    return undefined;
  }

  const coordinates = validCoordinates({ latitude: value.latitude, longitude: value.longitude });
  return {
    id,
    name,
    type: normalizeDisplayText(value.type),
    roadAddress: normalizeDisplayText(value.roadAddress),
    lotAddress: normalizeDisplayText(value.lotAddress),
    latitude: coordinates?.latitude,
    longitude: coordinates?.longitude,
    areaSquareMeters,
    managementOrganization: normalizeDisplayText(value.managementOrganization),
    referenceDate: normalizeDisplayText(value.referenceDate),
  };
}

function addressTokens(value: string): Set<string> {
  return new Set(
    value
      .normalize("NFKC")
      .replace(/[\p{P}\p{S}]+/gu, " ")
      .split(/\s+/)
      .map((token) => token.trim().toLowerCase())
      .filter((token) => token.length >= 2),
  );
}

function regionTokens(region: string): string[] {
  const compact = normalizeComparableText(region);
  if (!compact) return [];

  const aliases = [compact];
  const fullNames: Record<string, string> = {
    서울: "서울특별시",
    부산: "부산광역시",
    대구: "대구광역시",
    인천: "인천광역시",
    광주: "광주광역시",
    대전: "대전광역시",
    울산: "울산광역시",
    세종: "세종특별자치시",
    경기: "경기도",
    강원: "강원특별자치도",
    충북: "충청북도",
    충남: "충청남도",
    전북: "전북특별자치도",
    전남: "전라남도",
    경북: "경상북도",
    경남: "경상남도",
    제주: "제주특별자치도",
  };
  const abbreviated = Object.entries(fullNames).find(([, fullName]) => normalizeComparableText(fullName) === compact);
  const shortName = abbreviated?.[0] ?? compact.replace(/(?:특별시|광역시|특별자치시|특별자치도|도)$/u, "");
  aliases.push(shortName, normalizeComparableText(fullNames[shortName]));

  return [...new Set(aliases.filter(Boolean))];
}

function haversineDistanceKilometers(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return EARTH_RADIUS_KILOMETERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function scoreCandidate(candidate: CityParkResponseItem, input: CityParkLookupInput): RankedCandidate {
  const venueName = normalizeComparableText(input.venueName);
  const parkQuery = normalizeComparableText(deriveCityParkQuery(input.venueAddress));
  const candidateName = normalizeComparableText(candidate.name);
  const candidateAddress = [candidate.roadAddress, candidate.lotAddress].filter(Boolean).join(" ");
  const candidateComparableAddress = normalizeComparableText(candidateAddress);
  const inputCoordinates = validCoordinates(input.coordinates);
  const candidateCoordinates = validCoordinates({ latitude: candidate.latitude, longitude: candidate.longitude });

  const nameMatches =
    candidateName.length >= 3 &&
    ((venueName.length >= 3 && venueName.includes(candidateName)) ||
      (parkQuery.length >= 3 &&
        (parkQuery.includes(candidateName) || candidateName.includes(parkQuery))));
  let matchScore = 0;
  if (nameMatches) {
    matchScore += 1000;
  }

  const inputRegionTokens = regionTokens(input.region);
  const candidateRegionToken = normalizeComparableText(
    (candidate.roadAddress ?? candidate.lotAddress ?? "").split(/\s+/, 1)[0],
  );
  const regionMatches = inputRegionTokens.includes(candidateRegionToken);
  if (regionMatches) {
    matchScore += 100;
  }

  const venueAddressTokens = addressTokens(input.venueAddress);
  const overlappingTokens = [...addressTokens(candidateAddress)].filter((token) => venueAddressTokens.has(token));
  const overlapCount = overlappingTokens.length;
  const meaningfulOverlapCount = overlappingTokens.filter(
    (token) => !inputRegionTokens.includes(normalizeComparableText(token)),
  ).length;
  matchScore += overlapCount * 10;

  const distanceKilometers =
    inputCoordinates && candidateCoordinates
      ? haversineDistanceKilometers(inputCoordinates, candidateCoordinates)
      : Number.POSITIVE_INFINITY;
  if (distanceKilometers <= 1) matchScore += 30;
  else if (distanceKilometers <= 5) matchScore += 20;
  else if (distanceKilometers <= 20) matchScore += 10;

  return {
    candidate: { ...candidate, matchScore },
    distanceKilometers,
    isPlausible:
      (nameMatches && (inputRegionTokens.length === 0 || regionMatches)) ||
      (distanceKilometers <= 20 && (inputRegionTokens.length === 0 || regionMatches)) ||
      (regionMatches && meaningfulOverlapCount > 0),
  };
}

function candidateIdentity(candidate: CityParkResponseItem): string {
  return [
    normalizeComparableText(candidate.name),
    normalizeComparableText(candidate.roadAddress),
    normalizeComparableText(candidate.lotAddress),
    String(candidate.areaSquareMeters),
  ].join("|");
}

function isAdministrativeToken(token: string): boolean {
  return ADMINISTRATIVE_REGIONS.has(token) || /^[가-힣]+(?:시|군|구|읍|면|동|리)$/u.test(token);
}

function isRoadToken(token: string): boolean {
  return /^[가-힣0-9]+(?:대로|로|길)$/u.test(token);
}

function isAddressNumber(token: string): boolean {
  return /^\d+(?:-\d+)?$/u.test(token);
}

function removeLeadingAddressTokens(words: string[]): string[] {
  let index = 0;
  while (index < words.length) {
    if (isAdministrativeToken(words[index]) || isAddressNumber(words[index])) {
      index += 1;
      continue;
    }
    if (isRoadToken(words[index]) && isAddressNumber(words[index + 1] ?? "")) {
      index += 2;
      continue;
    }
    break;
  }
  return words.slice(index);
}

export function deriveCityParkQuery(venueAddress: string): string {
  const normalized = normalizeDisplayText(venueAddress);
  if (!normalized) return "";

  const firstParkSegment = normalized.split(/(?:\s+(?:및|와|과)\s*|[,/])/u, 1)[0];
  const words = removeLeadingAddressTokens(firstParkSegment.split(/\s+/).filter(Boolean));
  const parkNameEndIndex = words.findIndex((word) => word.endsWith("공원"));
  return parkNameEndIndex >= 0 ? words.slice(0, parkNameEndIndex + 1).join(" ") : "";
}

export function rankCityParkCandidates(items: unknown[], input: CityParkLookupInput): CityParkCandidate[] {
  const ranked = items
    .map(parseCandidate)
    .filter((candidate): candidate is CityParkResponseItem => Boolean(candidate))
    .map((candidate) => scoreCandidate(candidate, input))
    .filter(({ isPlausible }) => isPlausible)
    .sort((left, right) => {
      const scoreDifference = right.candidate.matchScore - left.candidate.matchScore;
      if (scoreDifference !== 0) return scoreDifference;

      if (left.distanceKilometers !== right.distanceKilometers) {
        return left.distanceKilometers - right.distanceKilometers;
      }

      const nameDifference = left.candidate.name.localeCompare(right.candidate.name, "ko-KR");
      if (nameDifference !== 0) return nameDifference;
      return left.candidate.id < right.candidate.id ? -1 : left.candidate.id > right.candidate.id ? 1 : 0;
    });

  const identities = new Set<string>();
  return ranked
    .filter(({ candidate }) => {
      const identity = candidateIdentity(candidate);
      if (identities.has(identity)) return false;
      identities.add(identity);
      return true;
    })
    .slice(0, MAX_CANDIDATES)
    .map(({ candidate }) => candidate);
}

export async function lookupCityParkCandidates(
  input: CityParkLookupInput,
  options: { signal?: AbortSignal; fetchImpl?: typeof fetch } = {},
): Promise<CityParkCandidate[]> {
  const query = deriveCityParkQuery(input.venueAddress);
  if (!query) return [];

  const fetchImpl = options.fetchImpl ?? fetch;
  const requestUrl = new URL(createApiUrl("/api/city-parks"), "http://localhost");
  requestUrl.searchParams.set("query", query);
  const response = await fetchImpl(requestUrl.toString(), { signal: options.signal });
  if (!response.ok) throw new Error(`City park request failed with HTTP ${response.status}`);

  const payload: unknown = await response.json();
  if (!isRecord(payload) || !Array.isArray(payload.items)) {
    throw new TypeError("City park response items are invalid");
  }

  return rankCityParkCandidates(payload.items, input);
}
