/**
 * 파일 : server/trafficProxy.js
 * 내용 : 국가교통DB(KTDB) & ITS 도로 링크별 통행 속도 및 교통량 중계 프록시 라우터
 * 수정 : 2026-07-24. View-T 선택 링크 교통량 API 중계 및 LINKID 파라미터 검증
 */

import express from "express";
import { getCachedData, setCachedData } from "./cache.js";
import { noopLogger } from "./logger.js";

const VIEWT_SELECTED_LINK_URL = "https://viewt.ktdb.go.kr/cong/api/selectedLink_road.do";
const VIEWT_OD_EMD_URL = "https://viewt.ktdb.go.kr/cong/api/basedPathOD_emd2emd.do";
const SELECTED_LINK_QUERY_KEYS = new Set(["linkId", "year", "weekType", "time"]);
const OD_EMD_QUERY_KEYS = new Set(["zoneId", "year", "weekType", "time"]);
const YEAR_MIN = 2019;
const YEAR_MAX = 2025;

function errorResponse(response, status, code, message) {
  return response.status(status).json({
    error: { code, message },
  });
}

function isScalar(value) {
  return !Array.isArray(value) && typeof value !== "object";
}

function isSafeLinkId(value) {
  return typeof value === "string" && /^\d{7}$/.test(value);
}

function isSafeZoneId(value) {
  return typeof value === "string" && /^\d{7,10}$/.test(value);
}

function isValidYear(value) {
  return (
    typeof value === "string" &&
    /^\d{4}$/.test(value) &&
    Number(value) >= YEAR_MIN &&
    Number(value) <= YEAR_MAX
  );
}

function isValidWeekType(value) {
  return value === "weekday" || value === "weekend";
}

function isValidTime(value) {
  return value === "ALL" || (/^\d{1,2}$/.test(value) && Number(value) >= 0 && Number(value) <= 23);
}

function validateCommonQuery(query, allowedKeys) {
  for (const key of Object.keys(query)) {
    if (!allowedKeys.has(key)) {
      return { ok: false, message: "Unsupported traffic query parameter." };
    }
    if (!isScalar(query[key])) {
      return { ok: false, message: "Traffic query parameter must be a scalar value." };
    }
  }

  const { year, weekType, time } = query;
  if (!isValidYear(year)) {
    return { ok: false, message: "Traffic year is invalid." };
  }
  if (!isValidWeekType(weekType)) {
    return { ok: false, message: "Traffic weekType is invalid." };
  }
  if (!isValidTime(time)) {
    return { ok: false, message: "Traffic time is invalid." };
  }

  return { ok: true };
}

function validateSelectedLinkQuery(query) {
  const common = validateCommonQuery(query, SELECTED_LINK_QUERY_KEYS);
  if (!common.ok) return common;
  if (!isSafeLinkId(query.linkId)) {
    return { ok: false, message: "Traffic linkId is invalid." };
  }
  return { ok: true };
}

function validateOdEmdQuery(query) {
  const common = validateCommonQuery(query, OD_EMD_QUERY_KEYS);
  if (!common.ok) return common;
  if (!isSafeZoneId(query.zoneId)) {
    return { ok: false, message: "Traffic zoneId is invalid." };
  }
  return { ok: true };
}

function weekTypeToViewT(value) {
  return value === "weekend" ? "1" : "0";
}

function buildViewTUrl(query) {
  const url = new URL(VIEWT_SELECTED_LINK_URL);

  url.searchParams.set("LINKID", String(query.linkId));
  url.searchParams.set("YEAR", String(query.year));
  url.searchParams.set("WEEKTYPE", weekTypeToViewT(query.weekType));
  url.searchParams.set("TIME", String(query.time).toUpperCase());

  return url;
}

function buildOdEmdViewTUrl(query) {
  const url = new URL(VIEWT_OD_EMD_URL);

  url.searchParams.set("ZONEID", String(query.zoneId));
  url.searchParams.set("YEAR", String(query.year));
  url.searchParams.set("WEEKTYPE", weekTypeToViewT(query.weekType));
  url.searchParams.set("TIME", String(query.time).toUpperCase());

  return url;
}

function valueFrom(record, ...keys) {
  for (const key of keys) {
    if (record?.[key] !== undefined && record?.[key] !== null) return record[key];
  }
  return undefined;
}

function normalizeTrafficRecord(record) {
  const value = record?.VALUE && typeof record.VALUE === "object" ? record.VALUE : {};
  return {
    LINKID: valueFrom(record, "LINKID"),
    ROAD_NAME: valueFrom(record, "ROAD_NAME", "LINKNAME"),
    ROAD_RANK: valueFrom(record, "ROAD_RANK", "LINKRANK"),
    LANES: valueFrom(record, "LANES", "LINKLINECNT"),
    VALUE_IN: valueFrom(record, "VALUE_IN") ?? valueFrom(value, "IN"),
    VALUE_OUT: valueFrom(record, "VALUE_OUT") ?? valueFrom(value, "OUT"),
  };
}

function normalizeOdRecord(record) {
  const value = record?.VALUE && typeof record.VALUE === "object" ? record.VALUE : {};
  return {
    ZONEID: valueFrom(record, "ZONEID"),
    ZONENAME: valueFrom(record, "ZONENAME", "ZONE_NAME"),
    VALUE_IN: valueFrom(record, "VALUE_IN") ?? valueFrom(value, "IN"),
    VALUE_OUT: valueFrom(record, "VALUE_OUT") ?? valueFrom(value, "OUT"),
  };
}

function normalizeViewTPayload(payload) {
  const records = Array.isArray(payload?.result)
    ? payload.result
    : Array.isArray(payload?.RESULT)
      ? payload.RESULT
      : [];

  return {
    state: valueFrom(payload, "state", "STATE"),
    msg: valueFrom(payload, "msg", "MSG"),
    count: valueFrom(payload, "count", "CNT"),
    linkId: valueFrom(payload, "linkId", "LINKID"),
    result: records.map(normalizeTrafficRecord),
  };
}

function normalizeOdPayload(payload, query = {}) {
  const records = Array.isArray(payload?.result)
    ? payload.result
    : Array.isArray(payload?.RESULT)
      ? payload.RESULT
      : [];

  return {
    state: valueFrom(payload, "state", "STATE"),
    msg: valueFrom(payload, "msg", "MSG"),
    count: valueFrom(payload, "count", "CNT"),
    zoneId: valueFrom(payload, "zoneId", "ZONEID") ?? query.zoneId,
    result: records.map(normalizeOdRecord),
  };
}

async function forwardViewTRequest({
  request,
  response,
  fetchImpl,
  log,
  cacheKey,
  buildUrl,
  normalizePayload,
}) {
  const cachedData = getCachedData(cacheKey);
  if (cachedData) {
    return response.status(200).json(cachedData);
  }

  try {
    const upstreamResponse = await fetchImpl(buildUrl(request.query));
    if (!upstreamResponse.ok) {
      log.warn("Traffic upstream error", {
        event: "TRAFFIC_UPSTREAM_FALLBACK",
        upstreamStatus: upstreamResponse.status,
      });
      return errorResponse(
        response,
        502,
        "TRAFFIC_UPSTREAM_ERROR",
        "Traffic upstream request failed.",
      );
    }

    const normalizedPayload = normalizePayload(await upstreamResponse.json(), request.query);
    setCachedData(cacheKey, normalizedPayload);
    return response.status(200).json(normalizedPayload);
  } catch (error) {
    const code = error instanceof SyntaxError
      ? "TRAFFIC_INVALID_RESPONSE"
      : "TRAFFIC_UPSTREAM_ERROR";
    log.error("Traffic proxy request failed", {
      event: "TRAFFIC_PROXY_ERROR",
      errorCode: code,
      message: error.message,
    });
    return errorResponse(response, 502, code, "Traffic proxy request failed.");
  }
}

export function createTrafficProxyRouter(options = {}) {
  const router = express.Router();
  const fetchImpl = options.fetchImpl ?? fetch;
  const log = options.logger ?? noopLogger;

  router.get("/selected-link", async (request, response) => {
    const validation = validateSelectedLinkQuery(request.query);
    if (!validation.ok) {
      return errorResponse(response, 400, "INVALID_QUERY", validation.message);
    }

    return forwardViewTRequest({
      request,
      response,
      fetchImpl,
      log,
      cacheKey: `traffic:selected-link:${JSON.stringify(request.query)}`,
      buildUrl: buildViewTUrl,
      normalizePayload: normalizeViewTPayload,
    });
  });

  router.get("/od-emd", async (request, response) => {
    const validation = validateOdEmdQuery(request.query);
    if (!validation.ok) {
      return errorResponse(response, 400, "INVALID_QUERY", validation.message);
    }

    return forwardViewTRequest({
      request,
      response,
      fetchImpl,
      log,
      cacheKey: `traffic:od-emd:${JSON.stringify(request.query)}`,
      buildUrl: buildOdEmdViewTUrl,
      normalizePayload: normalizeOdPayload,
    });
  });

  return router;
}
