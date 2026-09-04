/**
 * 파일 : server/db/regionalFestivalDatabase.js
 * 내용 : 문화체육관광부 지역축제 정보 정규화 JSON DB 조회 레이어
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFestivalCorrectionRegistry } from "../festivalCorrectionRegistry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE_PATH = path.resolve(__dirname, "../../data/regional_festivals_db.json");
const festivalCorrectionRegistry = createFestivalCorrectionRegistry();

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, "").toLowerCase();
}

const KNOWN_METRO_REGIONS = {
  서울: ["서울", "서울특별시", "seoul"],
  부산: ["부산", "부산광역시", "busan"],
  대구: ["대구", "대구광역시", "daegu"],
  인천: ["인천", "인천광역시", "incheon"],
  광주: ["광주", "광주광역시", "gwangju"],
  대전: ["대전", "대전광역시", "daejeon"],
  울산: ["울산", "울산광역시", "ulsan"],
  세종: ["세종", "세종특별자치시", "sejong"],
  경기: ["경기", "경기도", "gyeonggi"],
  강원: ["강원", "강원도", "강원특별자치도", "gangwon"],
  충북: ["충북", "충청북", "충청북도", "chungbuk", "chungcheongbuk"],
  충남: ["충남", "충청남", "충청남도", "chungnam", "chungcheongnam"],
  전북: ["전북", "전라북", "전라북도", "전북특별자치도", "jeonbuk", "jeollabuk"],
  전남: ["전남", "전라남", "전라남도", "jeonnam", "jeollanam"],
  경북: ["경북", "경상북", "경상북도", "gyeongbuk", "gyeongsangbuk"],
  경남: ["경남", "경상남", "경상남도", "gyeongnam", "gyeongsangnam"],
  제주: ["제주", "제주도", "제주특별자치도", "jeju"],
};

function canonicalRegion(value) {
  if (!value) return "";
  const text = String(value).trim().replace(/^대한민국\s*|^한국\s*/, "").replace(/\s+/g, "");
  const lower = text.toLowerCase();

  for (const [canonical, aliases] of Object.entries(KNOWN_METRO_REGIONS)) {
    for (const alias of aliases) {
      if (lower === alias || lower.startsWith(alias) || text.startsWith(alias)) {
        return canonical;
      }
    }
  }

  return text.replace(/특별자치도|특별자치시|광역시|특별시|자치도|도$/g, "");
}

function regionMatches(requestedRegion, candidateRegion, localGovernment) {
  if (!requestedRegion) return true;
  const canonReq = canonicalRegion(requestedRegion);
  const canonCand = canonicalRegion(candidateRegion);

  if (canonReq in KNOWN_METRO_REGIONS) {
    if (canonCand === canonReq) return true;
    if (localGovernment && canonicalRegion(localGovernment) === canonReq) return true;
    return false;
  }

  const reqLower = String(requestedRegion).replace(/\s+/g, "").toLowerCase();
  const candText = [candidateRegion, localGovernment].filter(Boolean).join(" ").replace(/\s+/g, "").toLowerCase();
  return candText.includes(reqLower);
}

function overlapsDateRange(record, startDate, endDate) {
  if (!startDate && !endDate) return true;
  if (!record.startDate && !record.endDate) return false;
  const recordStart = record.startDate ?? record.endDate;
  const recordEnd = record.endDate ?? record.startDate;
  if ((!endDate || recordStart <= endDate) && (!startDate || recordEnd >= startDate)) {
    return true;
  }
  if (startDate && recordStart) {
    const sMD = startDate.slice(5);
    const eMD = endDate ? endDate.slice(5) : "12-31";
    const rsMD = recordStart.slice(5);
    const reMD = recordEnd ? recordEnd.slice(5) : rsMD;
    if (rsMD <= eMD && reMD >= sMD) {
      return true;
    }
  }
  return false;
}

function endsOnOrAfter(record, minEndDate) {
  if (!minEndDate) return true;
  const recordEnd = record.endDate ?? record.startDate;
  if (!recordEnd) return true;
  if (recordEnd >= minEndDate) return true;
  if (recordEnd.slice(5) >= minEndDate.slice(5)) return true;
  return false;
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

function expandSearchTerms(terms) {
  const expanded = new Set();
  for (const raw of terms) {
    if (!raw) continue;
    const term = String(raw).toLowerCase().trim();
    if (!term) continue;
    expanded.add(term);

    const stripped = term.replace(/축제$|페스티벌$|행사$/g, "").trim();
    if (stripped.length >= 2) {
      expanded.add(stripped);
    }

    for (const r of Object.keys(KNOWN_METRO_REGIONS)) {
      if (term.startsWith(r) && term.length > r.length) {
        const remainder = term.slice(r.length).replace(/축제$|페스티벌$|행사$/g, "").trim();
        if (remainder.length >= 2) {
          expanded.add(remainder);
        }
      }
    }
  }
  return Array.from(expanded);
}

function matchesQuery(record, query) {
  if (!query || typeof query !== "string" || !query.trim()) return true;
  const q = query.trim().toLowerCase();
  const full = `${record.name} ${record.region || ""} ${record.localGovernment || ""} ${record.venue || ""}`.toLowerCase();
  if (full.includes(q)) return true;

  const candidateTerms = expandSearchTerms([q]);
  return candidateTerms.some((term) => term.length >= 2 && full.includes(term));
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
    const canonRegion = canonicalRegion(region);
    const rawKeywords = Array.isArray(keywords)
      ? keywords
      : String(keywords || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
    if (query && typeof query === "string" && query.trim()) {
      rawKeywords.push(query.trim());
    }
    const searchTerms = expandSearchTerms(rawKeywords.map((k) => k.toLowerCase()).filter(Boolean));
    const requestedYear = Number(year);
    const hasSearchTerms = searchTerms.length > 0;

    const filtered = this.records
      .map((record) => festivalCorrectionRegistry.apply(record))
      .filter((record) => regionMatches(region, record.region, record.localGovernment))
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
        if (query && !matchesQuery(record, query)) return false;
        if (hasSearchTerms && record.keywordMatchScore > 0) return true;
        if (startDate || endDate) return overlapsDateRange(record, startDate, endDate);
        return true;
      })
      .filter((record) => endsOnOrAfter(record, minEndDate))
      .filter((record) => !minEndDate || festivalCorrectionRegistry.isAvailable(record));

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
