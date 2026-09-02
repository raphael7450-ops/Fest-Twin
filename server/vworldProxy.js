/**
 * 파일 : server/vworldProxy.js
 * 내용 : VWorld 검색 API 중계 프록시 (주소/장소 좌표 보강)
 */

import express from "express";
import { getCachedData, setCachedData } from "./cache.js";
import { noopLogger } from "./logger.js";

const VWORLD_SEARCH_URL = "https://api.vworld.kr/req/search";
const DEFAULT_VWORLD_API_KEY = "2BEE395D-834A-3F75-BC64-CAC185A7A442";
const allowedTypes = new Set(["ADDRESS", "PLACE"]);
const allowedCategories = new Set(["ROAD", "PARCEL"]);

function errorResponse(response, status, code, message) {
  return response.status(status).json({ error: { code, message } });
}

function validateSearchQuery(query) {
  const text = typeof query.query === "string" ? query.query.trim() : "";
  const type = typeof query.type === "string" ? query.type.toUpperCase() : "ADDRESS";
  let category = typeof query.category === "string" ? query.category.toUpperCase() : "";

  if (text.length < 2 || text.length > 120) {
    return { ok: false, message: "VWorld search query must be between 2 and 120 characters." };
  }
  if (!allowedTypes.has(type)) {
    return { ok: false, message: "Unsupported VWorld search type." };
  }
  if (type === "ADDRESS" && !category) {
    category = "ROAD";
  }
  if (category && !allowedCategories.has(category)) {
    return { ok: false, message: "Unsupported VWorld address category." };
  }

  return { ok: true, text, type, category };
}

function buildVWorldSearchUrl(apiKey, { text, type, category }) {
  const url = new URL(VWORLD_SEARCH_URL);
  url.searchParams.set("service", "search");
  url.searchParams.set("request", "search");
  url.searchParams.set("version", "2.0");
  url.searchParams.set("crs", "EPSG:4326");
  url.searchParams.set("size", "5");
  url.searchParams.set("page", "1");
  url.searchParams.set("format", "json");
  url.searchParams.set("errorformat", "json");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("query", text);
  url.searchParams.set("type", type);
  if (type === "ADDRESS" && category) {
    url.searchParams.set("category", category);
  }
  return url;
}

export function createVWorldProxyRouter(options = {}) {
  const router = express.Router();
  const fetchImpl = options.fetchImpl ?? fetch;
  const log = options.logger ?? noopLogger;

  router.get("/search", async (request, response) => {
    const apiKey = options.apiKey ?? process.env.VWORLD_API_KEY ?? DEFAULT_VWORLD_API_KEY;
    const validation = validateSearchQuery(request.query);
    if (!validation.ok) {
      return errorResponse(response, 400, "INVALID_QUERY", validation.message);
    }

    const cacheKey = `vworld:search:${JSON.stringify({
      query: validation.text,
      type: validation.type,
      category: validation.category,
    })}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) return response.status(200).json(cachedData);

    try {
      const upstreamResponse = await fetchImpl(buildVWorldSearchUrl(apiKey, validation));
      if (!upstreamResponse.ok) {
        return errorResponse(response, 502, "VWORLD_UPSTREAM_ERROR", "VWorld upstream request failed.");
      }

      const payload = await upstreamResponse.json();
      setCachedData(cacheKey, payload);
      return response.status(200).json(payload);
    } catch (error) {
      log.error("VWorld proxy request failed", {
        event: "VWORLD_PROXY_ERROR",
        message: error.message,
      });
      return errorResponse(response, 502, "VWORLD_UPSTREAM_ERROR", "VWorld proxy request failed.");
    }
  });

  return router;
}
