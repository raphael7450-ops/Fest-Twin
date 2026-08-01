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

  searchFestivals({ region, year, startDate, endDate, keywords = [], limit = 20 } = {}) {
    const normalizedRegion = normalizeRegion(region);
    const normalizedKeywords = Array.isArray(keywords) ? keywords : [];
    const requestedYear = Number(year);
    return this.records
      .filter((record) => !normalizedRegion || record.region === normalizedRegion || record.localGovernment?.includes(normalizedRegion))
      .filter((record) => !Number.isFinite(requestedYear) || record.year === requestedYear)
      .map((record) => ({
        ...record,
        keywordMatchScore: keywordScore(record, normalizedKeywords),
      }))
      .filter((record) => {
        if (overlapsDateRange(record, startDate, endDate)) return true;
        return record.keywordMatchScore > 0 && matchesRequestedYear(record, startDate, endDate);
      })
      .map((record) => ({
        ...record,
        matchScore:
          (record.visitors ? Math.min(record.visitors / 10000, 60) : 0) +
          (record.budgetMillionKrw ? Math.min(record.budgetMillionKrw / 80, 25) : 0) +
          record.keywordMatchScore,
      }))
      .sort((a, b) => b.matchScore - a.matchScore || b.year - a.year)
      .slice(0, Math.min(Math.max(Number(limit) || 20, 1), 100));
  }
}

export const regionalFestivalDb = new RegionalFestivalDatabase();
