import { Router } from "express";

const CITY_PARK_API_URL =
  "https://api.data.go.kr/openapi/tn_pubr_public_cty_park_info_api";
const MAX_QUERY_LENGTH = 80;
const MAX_PAGE_NO = 100;
const MAX_ROWS = 100;
const DEFAULT_TIMEOUT_MS = 10_000;

function errorResponse(response, status, code, message) {
  return response.status(status).json({ error: { code, message } });
}

function readBoundedPositiveInteger(value, fallback, maximum) {
  if (typeof value !== "string" || value.trim() === "") return fallback;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, maximum);
}

function readFiniteNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || value.trim() === "") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readText(value) {
  return typeof value === "string" ? value : "";
}

function extractPayloadItems(payload) {
  if (Array.isArray(payload)) {
    return { rawItems: payload, totalCount: payload.length };
  }

  if (!payload || typeof payload !== "object") {
    throw new TypeError("City park payload must be an object or array.");
  }

  const body = payload.response?.body ?? payload;
  if (!body || typeof body !== "object") {
    throw new TypeError("City park payload body is invalid.");
  }

  const items = body.items;
  const rawItems = Array.isArray(items)
    ? items
    : Array.isArray(items?.item)
      ? items.item
      : items?.item && typeof items.item === "object"
        ? [items.item]
        : items === "" || items == null
          ? []
          : null;

  if (rawItems === null) {
    throw new TypeError("City park payload items are invalid.");
  }

  const totalCount = readFiniteNumber(body.totalCount);
  return { rawItems, totalCount: totalCount !== null && totalCount >= 0 ? totalCount : rawItems.length };
}

function normalizeCityParkItem(item) {
  if (!item || typeof item !== "object") return null;

  const areaSquareMeters = readFiniteNumber(item.parkAr);
  if (areaSquareMeters === null || areaSquareMeters <= 0) return null;

  return {
    id: readText(item.manageNo),
    name: readText(item.parkNm),
    type: readText(item.parkSe),
    roadAddress: readText(item.rdnmadr),
    lotAddress: readText(item.lnmadr),
    latitude: readFiniteNumber(item.latitude),
    longitude: readFiniteNumber(item.longitude),
    areaSquareMeters,
    managementOrganization: readText(item.institutionNm),
    referenceDate: readText(item.referenceDate),
  };
}

export function normalizeCityParkPayload(payload) {
  const { rawItems, totalCount } = extractPayloadItems(payload);
  return {
    items: rawItems.map(normalizeCityParkItem).filter(Boolean),
    totalCount,
  };
}

export function createCityParkProxyRouter(options = {}) {
  const router = Router();
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const logger = options.logger;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  router.get("/", async (request, response) => {
    const apiKey = options.apiKey ?? process.env.CITY_PARK_API_KEY ?? "";
    if (!apiKey) {
      return errorResponse(
        response,
        503,
        "CITY_PARK_API_KEY_MISSING",
        "City park server key is not configured.",
      );
    }

    const query = typeof request.query.query === "string" ? request.query.query.trim() : "";
    if (!query || query.length > MAX_QUERY_LENGTH) {
      return errorResponse(response, 400, "INVALID_QUERY", "City park query is invalid.");
    }

    const boundedPageNo = readBoundedPositiveInteger(request.query.pageNo, 1, MAX_PAGE_NO);
    const boundedRows = readBoundedPositiveInteger(request.query.numOfRows, MAX_ROWS, MAX_ROWS);
    const url = new URL(CITY_PARK_API_URL);
    url.searchParams.set("serviceKey", apiKey);
    url.searchParams.set("type", "json");
    url.searchParams.set("parkNm", query);
    url.searchParams.set("pageNo", String(boundedPageNo));
    url.searchParams.set("numOfRows", String(boundedRows));

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

    try {
      const upstreamResponse = await fetchImpl(url, { signal: abortController.signal });
      if (!upstreamResponse.ok) {
        logger?.warn("City park upstream request failed", {
          event: "CITY_PARK_UPSTREAM_ERROR",
          upstreamStatus: upstreamResponse.status,
        });
        return errorResponse(
          response,
          502,
          "CITY_PARK_UPSTREAM_ERROR",
          "City park upstream request failed.",
        );
      }

      let payload;
      try {
        payload = await upstreamResponse.json();
      } catch {
        logger?.warn("City park upstream response was invalid", {
          event: "CITY_PARK_INVALID_RESPONSE",
        });
        return errorResponse(
          response,
          502,
          "CITY_PARK_INVALID_RESPONSE",
          "City park upstream response was invalid.",
        );
      }

      let normalized;
      try {
        normalized = normalizeCityParkPayload(payload);
      } catch {
        logger?.warn("City park upstream response was invalid", {
          event: "CITY_PARK_INVALID_RESPONSE",
        });
        return errorResponse(
          response,
          502,
          "CITY_PARK_INVALID_RESPONSE",
          "City park upstream response was invalid.",
        );
      }

      return response.json({ ...normalized, retrievedAt: new Date().toISOString() });
    } catch {
      logger?.warn("City park proxy request failed", { event: "CITY_PARK_UPSTREAM_ERROR" });
      return errorResponse(
        response,
        502,
        "CITY_PARK_UPSTREAM_ERROR",
        "City park upstream request failed.",
      );
    } finally {
      clearTimeout(timeoutId);
    }
  });

  return router;
}
