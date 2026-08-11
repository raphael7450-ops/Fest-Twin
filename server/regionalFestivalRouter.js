/**
 * 파일 : server/regionalFestivalRouter.js
 * 내용 : 문화체육관광부 지역축제 정보 DB 조회 API 라우터
 */

import express from "express";
import { regionalFestivalDb } from "./db/regionalFestivalDatabase.js";

function parseKeywords(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function sanitizeRecord(record) {
  return {
    id: record.id,
    year: record.year,
    name: record.name,
    region: record.region,
    localGovernment: record.localGovernment,
    type: record.type,
    venue: record.venue,
    startDate: record.startDate,
    endDate: record.endDate,
    periodLabel: record.periodLabel,
    budgetMillionKrw: record.budgetMillionKrw,
    visitors: record.visitors,
    domesticVisitors: record.domesticVisitors,
    foreignVisitors: record.foreignVisitors,
    sourceName: record.sourceName,
    sourceFile: record.sourceFile,
    matchScore: Math.round(record.matchScore ?? 0),
  };
}

export function createRegionalFestivalRouter(options = {}) {
  const router = express.Router();
  const db = options.db ?? regionalFestivalDb;

  router.get("/", (request, response) => {
    const query = request.query.q || request.query.query;
    const records = db.searchFestivals({
      query,
      region: request.query.region,
      year: request.query.year,
      startDate: request.query.startDate,
      endDate: request.query.endDate,
      minEndDate: request.query.minEndDate,
      keywords: parseKeywords(request.query.keywords),
      limit: request.query.limit,
    }).map(sanitizeRecord);

    response.json({
      count: records.length,
      summary: db.getSummary(),
      records,
    });
  });

  return router;
}
