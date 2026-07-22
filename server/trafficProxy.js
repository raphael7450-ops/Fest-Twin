import express from "express";

const VIEWT_BASE_URL = "https://viewt.ktdb.go.kr/cong/api/moveAPI.do";
const ALLOWED_QUERY_KEYS = new Set(["linkId", "year", "weekType", "time"]);
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
  return typeof value === "string" && /^[A-Za-z0-9_-]+$/.test(value);
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

function validateQuery(query) {
  for (const key of Object.keys(query)) {
    if (!ALLOWED_QUERY_KEYS.has(key)) {
      return { ok: false, message: "Unsupported traffic query parameter." };
    }
    if (!isScalar(query[key])) {
      return { ok: false, message: "Traffic query parameter must be a scalar value." };
    }
  }

  const { linkId, year, weekType, time } = query;

  if (!isSafeLinkId(linkId)) {
    return { ok: false, message: "Traffic linkId is invalid." };
  }
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

function weekTypeToViewT(value) {
  return value === "weekend" ? "2" : "1";
}

function buildViewTUrl(query) {
  const url = new URL(VIEWT_BASE_URL);

  url.searchParams.set("url", "detail_selectedLink_road");
  url.searchParams.set("LINKID", String(query.linkId));
  url.searchParams.set("YEAR", String(query.year));
  url.searchParams.set("WEEKTYPE", weekTypeToViewT(query.weekType));
  url.searchParams.set("TIME", String(query.time));

  return url;
}

export function createTrafficProxyRouter(options = {}) {
  const router = express.Router();
  const fetchImpl = options.fetchImpl ?? fetch;

  router.get("/selected-link", async (request, response) => {
    const validation = validateQuery(request.query);
    if (!validation.ok) {
      return errorResponse(response, 400, "INVALID_QUERY", validation.message);
    }

    try {
      const upstreamResponse = await fetchImpl(buildViewTUrl(request.query));
      if (!upstreamResponse.ok) {
        return errorResponse(
          response,
          502,
          "TRAFFIC_UPSTREAM_ERROR",
          "Traffic upstream request failed.",
        );
      }

      return response.status(200).json(await upstreamResponse.json());
    } catch (error) {
      const code = error instanceof SyntaxError
        ? "TRAFFIC_INVALID_RESPONSE"
        : "TRAFFIC_UPSTREAM_ERROR";
      return errorResponse(response, 502, code, "Traffic proxy request failed.");
    }
  });

  return router;
}
