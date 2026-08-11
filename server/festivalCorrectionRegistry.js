import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_CORRECTION_FILE_PATH = path.resolve(__dirname, "../data/festival_corrections.json");

function canonicalizeFestivalTitle(value) {
  return String(value ?? "")
    .replace(/20\d{2}년?/g, "")
    .replace(/제\s*\d+\s*회/g, "")
    .replace(/\d+\s*회/g, "")
    .replace(/[()[\]{}·ㆍ.,/\\\-_:]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function normalizeRegion(value) {
  return String(value ?? "")
    .replace(/\s+/g, "")
    .replace(/특별자치도|특별자치시|광역시|특별시|자치도|도|시|군|구/g, "")
    .toLowerCase();
}

function sourceRecordYear(record) {
  const value = record.sourceRecordYear ?? record.year ?? record.startDate?.slice(0, 4);
  if (value === undefined || value === null || value === "") return undefined;
  const year = Number(value);
  return Number.isFinite(year) ? year : undefined;
}

function regionsMatch(inputRegion, correctionRegions) {
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

function getCorrection(corrections, record) {
  const canonicalKey = canonicalizeFestivalTitle(record.title ?? record.name);
  const recordYear = sourceRecordYear(record);

  return corrections.find((correction) => {
    const officialYear = correction.officialStartDate
      ? Number(correction.officialStartDate.slice(0, 4))
      : undefined;

    return (
      correction.canonicalKey === canonicalKey &&
      regionsMatch(record.region, correction.regions) &&
      (!officialYear || !recordYear || officialYear === recordYear)
    );
  });
}

export function createFestivalCorrectionRegistry(filePath = DEFAULT_CORRECTION_FILE_PATH) {
  const corrections = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  return {
    apply(record) {
      const correction = getCorrection(corrections, record);
      if (!correction) return record;

      return {
        ...record,
        ...(correction.officialStartDate ? { startDate: correction.officialStartDate } : {}),
        ...(correction.officialEndDate ? { endDate: correction.officialEndDate } : {}),
        correction,
      };
    },
    isAvailable(record) {
      const correction = getCorrection(corrections, record);
      return !correction || correction.status === "active";
    },
  };
}
