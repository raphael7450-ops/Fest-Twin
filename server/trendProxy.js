import express from "express";
import { getCachedData, setCachedData } from "./cache.js";
import { noopLogger } from "./logger.js";

const NAVER_DATALAB_SEARCH_URL = "https://openapi.naver.com/v1/datalab/search";
const ALLOWED_BODY_KEYS = new Set(["startDate", "endDate", "timeUnit", "keywordGroups"]);
const ALLOWED_TIME_UNITS = new Set(["date", "week", "month"]);

function errorResponse(response, status, code, message) {
  return response.status(status).json({
    error: { code, message },
  });
}

function fallbackResponse(reason, keywordGroups = []) {
  const safeGroups = Array.isArray(keywordGroups)
    ? keywordGroups.map((group) => ({
        title: String(group.groupName ?? group.title ?? "search interest"),
        keywords: Array.isArray(group.keywords)
          ? group.keywords.map((keyword) => String(keyword)).slice(0, 20)
          : [],
        data: [
          { period: "2026-10-01", ratio: 38 },
          { period: "2026-10-08", ratio: 44 },
          { period: "2026-10-15", ratio: 52 },
          { period: "2026-10-22", ratio: 61 },
        ],
      }))
    : [];

  return {
    sourceStatus: "sample-fallback",
    sourceName: "Naver DataLab search trend fallback",
    fallbackReason: reason,
    results: safeGroups.length > 0
      ? safeGroups
      : [
          {
            title: "festival search interest",
            keywords: ["festival"],
            data: [
              { period: "2026-10-01", ratio: 38 },
              { period: "2026-10-08", ratio: 44 },
              { period: "2026-10-15", ratio: 52 },
              { period: "2026-10-22", ratio: 61 },
            ],
          },
        ],
  };
}

function isDateString(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function validateKeywordGroups(keywordGroups) {
  if (!Array.isArray(keywordGroups) || keywordGroups.length === 0 || keywordGroups.length > 5) {
    return false;
  }

  return keywordGroups.every((group) => {
    if (!group || typeof group !== "object" || Array.isArray(group)) return false;
    const groupName = group.groupName ?? group.title;
    if (typeof groupName !== "string" || groupName.trim() === "") return false;
    if (!Array.isArray(group.keywords) || group.keywords.length === 0 || group.keywords.length > 20) {
      return false;
    }
    return group.keywords.every((keyword) => typeof keyword === "string" && keyword.trim() !== "");
  });
}

function validateBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, message: "Naver DataLab trend body must be an object." };
  }

  for (const key of Object.keys(body)) {
    if (!ALLOWED_BODY_KEYS.has(key)) {
      return { ok: false, message: "Unsupported Naver DataLab trend body field." };
    }
  }

  if (!isDateString(body.startDate) || !isDateString(body.endDate)) {
    return { ok: false, message: "Naver DataLab trend date fields must be YYYY-MM-DD." };
  }
  if (!ALLOWED_TIME_UNITS.has(body.timeUnit)) {
    return { ok: false, message: "Naver DataLab trend timeUnit is invalid." };
  }
  if (!validateKeywordGroups(body.keywordGroups)) {
    return { ok: false, message: "Naver DataLab trend keywordGroups are invalid." };
  }

  return { ok: true };
}

function buildNaverRequestBody(body) {
  return {
    startDate: body.startDate,
    endDate: body.endDate,
    timeUnit: body.timeUnit,
    keywordGroups: body.keywordGroups.map((group) => ({
      groupName: group.groupName ?? group.title,
      keywords: group.keywords,
    })),
  };
}

function normalizeNaverPayload(payload) {
  const results = Array.isArray(payload?.results)
    ? payload.results.map((result) => ({
        title: String(result.title ?? result.groupName ?? "search interest"),
        keywords: Array.isArray(result.keywords) ? result.keywords.map((keyword) => String(keyword)) : [],
        data: Array.isArray(result.data)
          ? result.data
              .filter((point) => typeof point?.period === "string" && Number.isFinite(Number(point?.ratio)))
              .map((point) => ({
                period: point.period,
                ratio: Number(point.ratio),
              }))
          : [],
      }))
    : [];

  return {
    sourceStatus: "live",
    sourceName: "Naver DataLab search trend",
    results,
  };
}

export function createTrendProxyRouter(options = {}) {
  const router = express.Router();
  const fetchImpl = options.fetchImpl ?? fetch;
  const log = options.logger ?? noopLogger;

  router.post("/naver-search", async (request, response) => {
    const validation = validateBody(request.body);
    if (!validation.ok) {
      return errorResponse(response, 400, "INVALID_TREND_QUERY", validation.message);
    }

    const clientId = options.clientId ?? process.env.NAVER_DATALAB_CLIENT_ID ?? "";
    const clientSecret = options.clientSecret ?? process.env.NAVER_DATALAB_CLIENT_SECRET ?? "";
    const requestBody = buildNaverRequestBody(request.body);

    if (!clientId || !clientSecret) {
      return response
        .status(200)
        .json(fallbackResponse("Naver DataLab credentials are not configured.", requestBody.keywordGroups));
    }

    const cacheKey = `trends:naver-search:${JSON.stringify(requestBody)}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return response.status(200).json(cachedData);
    }

    try {
      const upstreamResponse = await fetchImpl(NAVER_DATALAB_SEARCH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Naver-Client-Id": clientId,
          "X-Naver-Client-Secret": clientSecret,
        },
        body: JSON.stringify(requestBody),
      });

      if (!upstreamResponse.ok) {
        log.warn("Naver DataLab upstream error", {
          event: "NAVER_DATALAB_UPSTREAM_FALLBACK",
          upstreamStatus: upstreamResponse.status,
        });
        return response
          .status(200)
          .json(fallbackResponse("Naver DataLab upstream request failed.", requestBody.keywordGroups));
      }

      const payload = await upstreamResponse.json();
      const normalized = normalizeNaverPayload(payload);
      setCachedData(cacheKey, normalized);
      return response.status(200).json(normalized);
    } catch (error) {
      log.error("Naver DataLab proxy request failed", {
        event: "NAVER_DATALAB_PROXY_ERROR",
        message: error.message,
      });
      return response
        .status(200)
        .json(fallbackResponse("Naver DataLab upstream response was unavailable.", requestBody.keywordGroups));
    }
  });

  return router;
}
