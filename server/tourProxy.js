import express from "express";

const TOUR_API_BASE_URL = "https://apis.data.go.kr/B551011/KorService2";
const MOBILE_OS = "ETC";
const MOBILE_APP = "FestTwin";

const endpointConfig = {
  "area-code": {
    operation: "areaCode2",
    allowedParams: new Set(["numOfRows", "pageNo", "areaCode"]),
  },
  festivals: {
    operation: "searchFestival2",
    allowedParams: new Set([
      "numOfRows",
      "pageNo",
      "arrange",
      "areaCode",
      "eventStartDate",
      "eventEndDate",
    ]),
  },
  detail: {
    operation: "detailCommon2",
    allowedParams: new Set([
      "contentId",
      "defaultYN",
      "firstImageYN",
      "addrinfoYN",
      "mapinfoYN",
      "overviewYN",
    ]),
  },
  nearby: {
    operation: "locationBasedList2",
    allowedParams: new Set(["numOfRows", "pageNo", "arrange", "mapX", "mapY", "radius"]),
  },
};

const numericParams = new Set([
  "numOfRows",
  "pageNo",
  "areaCode",
  "contentId",
  "mapX",
  "mapY",
  "radius",
]);

function errorResponse(response, status, code, message) {
  return response.status(status).json({
    error: { code, message },
  });
}

function validateQuery(endpoint, query) {
  const config = endpointConfig[endpoint];
  if (!config) {
    return { ok: false, message: "Unsupported TourAPI proxy endpoint." };
  }

  for (const key of Object.keys(query)) {
    if (key === "serviceKey" || !config.allowedParams.has(key)) {
      return { ok: false, message: "Unsupported TourAPI query parameter." };
    }
    const value = query[key];
    if (Array.isArray(value) || typeof value === "object") {
      return { ok: false, message: "TourAPI query parameter must be a scalar value." };
    }
    if (numericParams.has(key) && value !== undefined && value !== "" && Number.isNaN(Number(value))) {
      return { ok: false, message: "TourAPI numeric query parameter is invalid." };
    }
  }

  return { ok: true };
}

function buildTourApiUrl(endpoint, apiKey, query) {
  const config = endpointConfig[endpoint];
  const url = new URL(`${TOUR_API_BASE_URL}/${config.operation}`);

  url.searchParams.set("serviceKey", apiKey);
  url.searchParams.set("MobileOS", MOBILE_OS);
  url.searchParams.set("MobileApp", MOBILE_APP);
  url.searchParams.set("_type", "json");

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  return url;
}

export function createTourProxyRouter(options = {}) {
  const router = express.Router();
  const fetchImpl = options.fetchImpl ?? fetch;

  router.get("/:endpoint", async (request, response) => {
    const apiKey = options.apiKey ?? process.env.TOUR_API_KEY ?? "";
    if (!apiKey) {
      return errorResponse(
        response,
        503,
        "TOUR_API_KEY_MISSING",
        "TourAPI server key is not configured.",
      );
    }

    const validation = validateQuery(request.params.endpoint, request.query);
    if (!validation.ok) {
      return errorResponse(response, 400, "INVALID_QUERY", validation.message);
    }

    const upstreamUrl = buildTourApiUrl(request.params.endpoint, apiKey, request.query);

    try {
      const upstreamResponse = await fetchImpl(upstreamUrl);
      if (!upstreamResponse.ok) {
        return errorResponse(
          response,
          502,
          "TOUR_API_UPSTREAM_ERROR",
          "TourAPI upstream request failed.",
        );
      }

      const payload = await upstreamResponse.json();
      return response.status(200).json(payload);
    } catch (error) {
      const code = error instanceof SyntaxError
        ? "TOUR_API_INVALID_RESPONSE"
        : "TOUR_API_UPSTREAM_ERROR";
      return errorResponse(response, 502, code, "TourAPI proxy request failed.");
    }
  });

  return router;
}
