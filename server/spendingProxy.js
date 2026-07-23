import express from "express";

const SPENDING_API_BASE_URL = "https://apis.data.go.kr/B551011/AreaTarDemDsService";
const DEFAULT_OPERATION = "areaTarDemCsList";
const ALLOWED_QUERY_KEYS = new Set([
  "numOfRows",
  "pageNo",
  "areaNm",
  "signguNm",
  "baseYm",
  "areaCode",
  "sigunguCode",
]);
const NUMERIC_QUERY_KEYS = new Set(["numOfRows", "pageNo", "baseYm", "areaCode", "sigunguCode"]);

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

    try {
      const upstreamResponse = await fetchImpl(buildSpendingApiUrl(apiKey, request.query));
      if (!upstreamResponse.ok) {
        return errorResponse(
          response,
          502,
          "SPENDING_UPSTREAM_ERROR",
          "Tourism spending upstream request failed.",
        );
      }

      return response.status(200).json(await upstreamResponse.json());
    } catch (error) {
      const code = error instanceof SyntaxError
        ? "SPENDING_INVALID_RESPONSE"
        : "SPENDING_UPSTREAM_ERROR";
      return errorResponse(response, 502, code, "Tourism spending proxy request failed.");
    }
  });

  return router;
}
