/**
 * 파일 : server/db/regionalFestivalDatabase.js
 * 내용 : 문화체육관광부 지역축제 정보 정규화 JSON DB 조회 레이어
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE_PATH = path.resolve(__dirname, "../../data/regional_festivals_db.json");

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, "").toLowerCase();
}

function normalizeRegion(value) {
  const text = String(value ?? "").trim();
  const aliases = {
    충남: "충청남도",
    충북: "충청북도",
    전남: "전라남도",
    전북: "전북특별자치도",
    경남: "경상남도",
    경북: "경상북도",
    강원: "강원특별자치도",
    경기: "경기도",
    제주: "제주특별자치도",
  };
  return aliases[text] ?? text;
}

function overlapsDateRange(record, startDate, endDate) {
  if (!startDate && !endDate) return true;
  if (!record.startDate && !record.endDate) return false;
  const recordStart = record.startDate ?? record.endDate;
  const recordEnd = record.endDate ?? record.startDate;
  return (!endDate || recordStart <= endDate) && (!startDate || recordEnd >= startDate);
}

function endsOnOrAfter(record, minEndDate) {
  if (!minEndDate) return true;
  const recordEnd = record.endDate ?? record.startDate;
  return Boolean(recordEnd && recordEnd >= minEndDate);
}

function keywordScore(record, keywords) {
  const haystack = normalizeText(`${record.name} ${record.type} ${record.venue} ${record.localGovernment}`);
  return keywords.reduce((score, keyword) => {
    const normalized = normalizeText(keyword);
    return normalized && haystack.includes(normalized) ? score + 12 : score;
  }, 0);
}

function matchesRequestedYear(record, startDate, endDate) {
  const recordYear = String(record.year ?? "");
  return (
    (startDate && String(startDate).startsWith(recordYear)) ||
    (endDate && String(endDate).startsWith(recordYear))
  );
}

function getBaseFestivalKey(name) {
  return String(name || "")
    .replace(/\b20\d{2}년?\s*/gi, "")
    .replace(/제\s*\d+\s*회\s*/gi, "")
    .replace(/\d+\s*회\s*/gi, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function getCanonicalFestivalKey(name) {
  return String(name || "")
    .replace(/20\d{2}년?/g, "")
    .replace(/제\s*\d+\s*회/g, "")
    .replace(/\d+\s*회/g, "")
    .replace(/[()[\]{}·ㆍ.,/\\\-_:]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function hasEditionNumber(name) {
  return /제\s*\d+\s*회|\d+\s*회/.test(String(name || ""));
}

function applyVerifiedFestivalCorrections(record) {
  if (
    record.region === "부산" &&
    Number(record.year) === 2026 &&
    getCanonicalFestivalKey(record.name) === "부산바다축제"
  ) {
    return {
      ...record,
      startDate: "2026-08-07",
      endDate: "2026-08-13",
      periodLabel: "2026-08-07 ~ 2026-08-13",
      sourceName: record.sourceName || "부산축제조직위원회 / 대한민국 구석구석",
    };
  }

  return record;
}

function deduplicateLatestFestivals(records) {
  const map = new Map();

  for (const record of records) {
    const baseKey = getCanonicalFestivalKey(record.name);
    const key = `${record.region || ""}_${baseKey}`;

    const existing = map.get(key);
    if (!existing) {
      map.set(key, record);
    } else {
      const existingYear = Number(existing.year || 0);
      const currentYear = Number(record.year || 0);
      const existingStart = existing.startDate || "";
      const currentStart = record.startDate || "";

      if (currentYear > existingYear) {
        map.set(key, record);
      } else if (currentYear === existingYear) {
        const currentHasEdition = hasEditionNumber(record.name);
        const existingHasEdition = hasEditionNumber(existing.name);
        if (currentHasEdition && !existingHasEdition) {
          map.set(key, record);
          continue;
        }
        if (!currentHasEdition && existingHasEdition) {
          continue;
        }

        if (currentStart > existingStart || (record.visitors || 0) > (existing.visitors || 0)) {
          map.set(key, record);
        }
      }
    }
  }

  return Array.from(map.values());
}

export class RegionalFestivalDatabase {
  constructor(filePath = DB_FILE_PATH) {
    this.filePath = filePath;
    this.records = [];
    this.metadata = {};
    this.init();
  }

  init() {
    const raw = fs.readFileSync(this.filePath, "utf-8");
    const parsed = JSON.parse(raw);
    this.metadata = {
      generatedAt: parsed.generatedAt,
      source: parsed.source,
    };
    this.records = Array.isArray(parsed.records) ? parsed.records : [];
  }

  getSummary() {
    return {
      ...this.metadata,
      totalCount: this.records.length,
      years: [...new Set(this.records.map((record) => record.year))].sort(),
      regions: [...new Set(this.records.map((record) => record.region).filter(Boolean))].sort(),
    };
  }

  searchFestivals({ query, region, year, startDate, endDate, minEndDate, keywords = [], limit = 30 } = {}) {
    const normalizedRegion = normalizeRegion(region);
    const rawKeywords = Array.isArray(keywords)
      ? keywords
      : String(keywords || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
    if (query && typeof query === "string" && query.trim()) {
      rawKeywords.push(query.trim());
    }
    const searchTerms = rawKeywords.map((k) => k.toLowerCase()).filter(Boolean);
    const requestedYear = Number(year);
    const hasSearchTerms = searchTerms.length > 0;

    const filtered = this.records
      .map(applyVerifiedFestivalCorrections)
      .filter((record) => {
        if (!normalizedRegion) return true;
        return record.region === normalizedRegion || record.localGovernment?.includes(normalizedRegion);
      })
      .filter((record) => !Number.isFinite(requestedYear) || record.year === requestedYear)
      .map((record) => {
        const fullText = `${record.name} ${record.region || ""} ${record.localGovernment || ""} ${record.type || ""} ${record.venue || ""}`.toLowerCase();
        let termMatchScore = 0;

        if (hasSearchTerms) {
          for (const term of searchTerms) {
            if (!term) continue;
            if (fullText.includes(term)) termMatchScore += 25;
            if (record.name.toLowerCase().includes(term)) termMatchScore += 50;
            if (record.region?.toLowerCase().includes(term) || record.localGovernment?.toLowerCase().includes(term)) termMatchScore += 20;
          }
        }

        return {
          ...record,
          keywordMatchScore: termMatchScore,
        };
      })
      .filter((record) => {
        if (hasSearchTerms) return record.keywordMatchScore > 0;
        if (startDate || endDate) return overlapsDateRange(record, startDate, endDate);
        return true;
      })
      .filter((record) => endsOnOrAfter(record, minEndDate));

    // 중복 축제 제거 (동일 축제일 경우 가장 최근 연도 데이터만 유지)
    const deduped = deduplicateLatestFestivals(filtered);

    return deduped
      .map((record) => ({
        ...record,
        matchScore:
          (record.visitors ? Math.min(record.visitors / 10000, 60) : 0) +
          (record.budgetMillionKrw ? Math.min(record.budgetMillionKrw / 80, 25) : 0) +
          record.keywordMatchScore,
      }))
      .sort((a, b) => b.matchScore - a.matchScore || b.year - a.year)
      .slice(0, Math.min(Math.max(Number(limit) || 30, 1), 100));
  }
}

export const regionalFestivalDb = new RegionalFestivalDatabase();
