import corrections from "../../data/festival_corrections.json";

export interface FestivalCorrection {
  canonicalKey: string;
  regions: string[];
  status: "active" | "inactive";
  officialStartDate?: string;
  officialEndDate?: string;
  verifiedAt: string;
  sourceName: string;
  sourceUrl: string;
}

export interface FestivalCorrectionInput {
  title?: string | number;
  name?: string | number;
  region?: string;
  sourceRecordYear?: string | number;
  year?: string | number;
  startDate?: string;
  endDate?: string;
}

const festivalCorrections = corrections as FestivalCorrection[];

function canonicalizeFestivalTitle(value: string | number | undefined) {
  return String(value ?? "")
    .replace(/20\d{2}년?/g, "")
    .replace(/제\s*\d+\s*회/g, "")
    .replace(/\d+\s*회/g, "")
    .replace(/[()[\]{}·ㆍ.,/\\\-_:]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function normalizeRegion(value: string | undefined) {
  return String(value ?? "")
    .replace(/\s+/g, "")
    .replace(/특별자치도|특별자치시|광역시|특별시|자치도|도|시|군|구/g, "")
    .toLowerCase();
}

function sourceRecordYear(input: FestivalCorrectionInput) {
  const value = input.sourceRecordYear ?? input.year ?? input.startDate?.slice(0, 4);
  if (value === undefined || value === null || value === "") return undefined;
  const year = Number(value);
  return Number.isFinite(year) ? year : undefined;
}

function regionsMatch(inputRegion: string | undefined, correctionRegions: string[]) {
  const normalizedInput = normalizeRegion(inputRegion);
  if (!normalizedInput) return false;
  return correctionRegions.some((region) => {
    const normalizedCorrection = normalizeRegion(region);
    return (
      normalizedInput === normalizedCorrection ||
      normalizedInput.includes(normalizedCorrection) ||
      normalizedCorrection.includes(normalizedInput)
    );
  });
}

export function getFestivalCorrection(input: FestivalCorrectionInput) {
  const canonicalKey = canonicalizeFestivalTitle(input.title ?? input.name);
  const recordYear = sourceRecordYear(input);

  return festivalCorrections.find((correction) => {
    const officialYear = correction.officialStartDate
      ? Number(correction.officialStartDate.slice(0, 4))
      : undefined;

    return (
      correction.canonicalKey === canonicalKey &&
      regionsMatch(input.region, correction.regions) &&
      (!officialYear || !recordYear || officialYear === recordYear)
    );
  });
}

export function applyFestivalCorrection<T extends FestivalCorrectionInput>(candidate: T) {
  const correction = getFestivalCorrection(candidate);
  if (!correction) return candidate;

  return {
    ...candidate,
    ...(correction.officialStartDate ? { startDate: correction.officialStartDate } : {}),
    ...(correction.officialEndDate ? { endDate: correction.officialEndDate } : {}),
    correction,
  };
}

export function isFestivalAvailableForPlanning(candidate: FestivalCorrectionInput) {
  const correction = getFestivalCorrection(candidate);
  return !correction || correction.status === "active";
}
