/**
 * 파일 : server/spendingProxy.js
 * 내용 : 관광데이터랩 카드 소비 지출 데이터 중계 프록시 라우터
 * 수정 : 2026-07-24. BC/신한카드 지출 데이터 OpenAPI 중계 및 파라미터 검증
 */

import express from "express";
import { getCachedData, setCachedData } from "./cache.js";
import { noopLogger } from "./logger.js";

const SPENDING_API_BASE_URL = "https://apis.data.go.kr/B551011/AreaTarDemDsService";
const DEFAULT_OPERATION = "areaTarExpDsList";
const ALLOWED_QUERY_KEYS = new Set([
  "numOfRows",
  "pageNo",
  "baseYm",
  "areaCd",
  "signguCd",
  "tarExpDsIxCd",
]);
const NUMERIC_QUERY_KEYS = new Set(["numOfRows", "pageNo", "baseYm", "areaCd", "signguCd", "tarExpDsIxCd"]);

function errorResponse(response, status, code, message) {
  return response.status(status).json({
    error: { code, message },
  });
}

function validateQuery(query) {
  for (const key of Object.keys(query)) {
    if (key === "serviceKey" || !ALLOWED_QUERY_KEYS.has(key)) {
      return { ok: false, message: "Unsupported tourism spending query parameter." };
    }
    const value = query[key];
    if (Array.isArray(value) || typeof value === "object") {
      return { ok: false, message: "Tourism spending query parameter must be a scalar value." };
    }
    if (
      NUMERIC_QUERY_KEYS.has(key) &&
      (typeof value !== "string" || value.trim() === "" || !Number.isFinite(Number(value)))
    ) {
      return { ok: false, message: "Tourism spending numeric query parameter is invalid." };
    }
  }

  return { ok: true };
}

function buildSpendingApiUrl(apiKey, query) {
  const operation = process.env.TOURISM_DEMAND_CONSUMPTION_OPERATION ?? DEFAULT_OPERATION;
  const url = new URL(`${SPENDING_API_BASE_URL}/${operation}`);

  url.searchParams.set("serviceKey", apiKey);
  url.searchParams.set("MobileOS", "ETC");
  url.searchParams.set("MobileApp", "FestTwin");
  url.searchParams.set("_type", "json");
  url.searchParams.set("numOfRows", "20");
  url.searchParams.set("pageNo", "1");

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  return url;
}

export function createSpendingProxyRouter(options = {}) {
  const router = express.Router();
  const fetchImpl = options.fetchImpl ?? fetch;
  const log = options.logger ?? noopLogger;

  router.get("/consumer-strength", async (request, response) => {
    const apiKey = options.apiKey ?? process.env.TOUR_API_KEY ?? "";
    if (!apiKey) {
      return errorResponse(
        response,
        503,
        "TOUR_API_KEY_MISSING",
        "Tourism spending server key is not configured.",
      );
    }

    const validation = validateQuery(request.query);
    if (!validation.ok) {
      return errorResponse(response, 400, "INVALID_QUERY", validation.message);
    }

    const cacheKey = `spending:consumer-strength:${JSON.stringify(request.query)}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return response.status(200).json(cachedData);
    }

    try {
      const upstreamResponse = await fetchImpl(buildSpendingApiUrl(apiKey, request.query));
      if (!upstreamResponse.ok) {
        log.warn("Tourism spending upstream error", {
          event: "SPENDING_UPSTREAM_FALLBACK",
          upstreamStatus: upstreamResponse.status,
        });
        return errorResponse(
          response,
          502,
          "SPENDING_UPSTREAM_ERROR",
          "Tourism spending upstream request failed.",
        );
      }

      const payload = await upstreamResponse.json();
      setCachedData(cacheKey, payload);
      return response.status(200).json(payload);
    } catch (error) {
      const code = error instanceof SyntaxError
        ? "SPENDING_INVALID_RESPONSE"
        : "SPENDING_UPSTREAM_ERROR";
      log.error("Tourism spending proxy request failed", {
        event: "SPENDING_PROXY_ERROR",
        errorCode: code,
        message: error.message,
      });
      return errorResponse(response, 502, code, "Tourism spending proxy request failed.");
    }
  });

  return router;
}
