import { Router } from "express";
import { getCachedData, setCachedData } from "./cache.js";
import { assertUpstreamSuccess } from "./upstreamValidity.js";

const services = {
  transit: {
    path: "/nearby-stops", key: "PUBLIC_TRANSIT_API_KEY", source: "국토교통부 TAGO 버스정류소",
    endpoint: "https://apis.data.go.kr/1613000/BusSttnInfoInqireService/getCrdntPrxmtSttnList",
    radius: 500, query: (lat, lon) => ({ _type: "json", gpsLati: lat, gpsLong: lon }),
    fields: { name: "nodenm", id: "nodeid", lat: "gpslati", lon: "gpslong" },
    note: "반경 500m 정류소 조회입니다. 노선 수·배차·접근성 점수는 이 API로 확인되지 않습니다.",
  },
  commercial: {
    path: "/nearby-stores", key: "COMMERCIAL_API_KEY", source: "소상공인시장진흥공단 상가정보",
    endpoint: "https://apis.data.go.kr/B553077/api/open/sdsc2/storeListInRadius",
    radius: 1000, query: (lat, lon) => ({ type: "json", radius: 1000, cx: lon, cy: lat }),
    fields: { name: "bizesNm", id: "bizesId", lat: "lat", lon: "lon", address: "rdnmAdr", category: "indsLclsNm" },
    note: "반경 1km 조회의 첫 100건 중 좌표를 확인한 목록입니다. 전체 조회 건수와 목록 표본은 다르며 점포 수를 임의 확대하지 않습니다.",
  },
  emergency: {
    path: "/nearby-facilities", key: "EMERGENCY_API_KEY", source: "국립중앙의료원 응급의료기관",
    endpoint: "https://apis.data.go.kr/B552657/ErmctInfoInqireService/getEgytLcinfoInqire",
    radius: 5000, query: (lat, lon) => ({ _type: "json", WGS84_LAT: lat, WGS84_LON: lon }),
    fields: { name: "dutyName", id: "hpid", lat: "latitude", lon: "longitude", address: "dutyAddr", category: "dutyDivName" },
    note: "API 첫 100건 중 직선거리 5km 이내 기관입니다. 실제 이송 시간·가용 병상·수용 가능 여부·119 시설은 확인하지 않습니다.",
  },
};

function coordinatesValid(lat, lon) {
  return Number.isFinite(lat) && lat >= 33 && lat <= 39 && Number.isFinite(lon) && lon >= 124 && lon <= 132;
}

function distanceMeters(lat, lon, otherLat, otherLon) {
  const rad = Math.PI / 180;
  const a = Math.sin((otherLat - lat) * rad / 2) ** 2
    + Math.cos(lat * rad) * Math.cos(otherLat * rad) * Math.sin((otherLon - lon) * rad / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
}

export function createInfrastructureProxyRouter(kind, options = {}) {
  const config = services[kind];
  const router = Router();
  router.get(config.path, async (req, res) => {
    const lat = typeof req.query.lat === "string" && req.query.lat.trim() ? Number(req.query.lat) : NaN;
    const lon = typeof req.query.lon === "string" && req.query.lon.trim() ? Number(req.query.lon) : NaN;
    const provenance = {
      sourceName: config.source, requestedCoordinates: { latitude: lat, longitude: lon },
      radiusMeters: config.radius,
    };
    const unavailable = (reason, status = 200) => res.status(status).json({
      status: "unavailable", reason, observations: [], providerTotalCount: null,
      provenance: { ...provenance, sourceStatus: "unavailable" },
    });
    if (!coordinatesValid(lat, lon)) return unavailable("INVALID_COORDINATES", 400);
    const apiKey = options.apiKey ?? process.env[config.key] ?? (kind === "transit" ? process.env.TAGO_API_KEY : undefined);
    if (!apiKey) return unavailable("API_KEY_MISSING");
    const cacheKey = `infrastructure:v1:${kind}:${lat}:${lon}`;
    const cached = getCachedData(cacheKey);
    if (cached) return res.json(cached);
    try {
      const url = new URL(config.endpoint);
      url.search = new URLSearchParams({ ...config.query(lat, lon), serviceKey: apiKey, pageNo: 1, numOfRows: 100 });
      const response = await (options.fetchImpl ?? fetch)(url, { signal: AbortSignal.timeout(options.timeoutMs ?? 2500) });
      if (!response.ok) return unavailable(`UPSTREAM_HTTP_${response.status}`);
      const payload = await response.json();
      assertUpstreamSuccess(payload, { allowNoData: true });
      const header = payload.response?.header ?? payload.header;
      if (!["00", "0000", "03"].includes(String(header?.resultCode))) return unavailable("INVALID_RESPONSE");
      const body = payload.response?.body ?? payload.body;
      if (!body || typeof body !== "object") return unavailable("INVALID_RESPONSE");
      const raw = body.items?.item ?? body.items;
      const rows = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? [raw] : [];
      const observations = rows.flatMap((row) => {
        if (!row || typeof row !== "object") return [];
        const fields = config.fields;
        const name = row[fields.name];
        const pointLat = Number(row[fields.lat]);
        const pointLon = Number(row[fields.lon]);
        if (typeof name !== "string" || !name.trim() || !coordinatesValid(pointLat, pointLon)) return [];
        const distance = distanceMeters(lat, lon, pointLat, pointLon);
        if (distance > config.radius) return [];
        return [{
          id: String(row[fields.id] ?? ""), name: name.trim(),
          address: typeof row[fields.address] === "string" ? row[fields.address] : "",
          category: typeof row[fields.category] === "string" ? row[fields.category] : "",
          latitude: pointLat, longitude: pointLon, distanceMeters: Math.round(distance),
        }];
      }).sort((a, b) => a.distanceMeters - b.distanceMeters);
      const total = Number(body.totalCount);
      const providerTotalCount = body.totalCount !== undefined && Number.isInteger(total) && total >= 0 ? total : null;
      if (!observations.length && (rows.length || providerTotalCount !== 0)) return unavailable("NO_VERIFIABLE_RECORDS");
      const status = observations.length ? "live" : "empty";
      const result = {
        status, observations, providerTotalCount, returnedCount: rows.length, note: config.note,
        provenance: { ...provenance, sourceStatus: status, retrievedAt: new Date().toISOString() },
      };
      setCachedData(cacheKey, result, 60_000);
      return res.json(result);
    } catch {
      options.logger?.warn("Infrastructure upstream unavailable", { kind });
      return unavailable("UPSTREAM_UNAVAILABLE");
    }
  });
  return router;
}
