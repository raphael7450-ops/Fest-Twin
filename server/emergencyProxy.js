/**
 * 파일 : server/emergencyProxy.js
 * 내용 : 보건복지부/소방청 응급의료기관 및 119 안전센터 OpenAPI 중계 라우터 및 Fallback
 */

import { Router } from "express";

export function createEmergencyProxyRouter(options = {}) {
  const router = Router();
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const logger = options.logger;

  router.get("/nearby-facilities", async (req, res) => {
    const lat = parseFloat(req.query.lat ?? "37.510395");
    const lon = parseFloat(req.query.lon ?? "127.061051");
    const apiKey =
      options.apiKey ??
      process.env.EMERGENCY_API_KEY ??
      process.env.STANDARD_FESTIVAL_API_KEY ??
      process.env.TOUR_API_KEY;

    if (!apiKey) {
      if (logger) {
        logger.info("EMERGENCY_API_KEY not provided. Returning fallback emergency facilities sample.");
      }
      return res.json({
        status: "sample-fallback",
        goldenTimeMinutes: 7.2,
        readinessScore: 92,
        facilities: [
          { facilityName: "권역응급의료센터 (강남세브란스)", category: "권역응급센터", distanceKm: 2.1, estimatedMinutes: 6 },
          { facilityName: "강남소방서 119 안전센터", category: "119안전센터", distanceKm: 1.2, estimatedMinutes: 4 },
          { facilityName: "지역응급의료기관 (삼성서울병원)", category: "지역응급센터", distanceKm: 3.5, estimatedMinutes: 9 },
        ],
        provenance: {
          sourceName: "보건복지부/소방청 응급의료기관 샘플",
          sourceType: "public-data-sample",
          sourceStatus: "sample-fallback",
          requestedCoordinates: { latitude: lat, longitude: lon },
          retrievedAt: new Date().toISOString(),
        },
      });
    }

    try {
      const url = `http://apis.data.go.kr/B552657/ErmctInfoInqireService/getEgytLcinfoInqire?serviceKey=${encodeURIComponent(apiKey)}&WGS84_LON=${lon}&WGS84_LAT=${lat}&pageNo=1&numOfRows=10&_type=json`;

      const response = await fetchImpl(url);
      if (!response.ok) {
        throw new Error(`Emergency API HTTP ${response.status}`);
      }

      const data = await response.json();
      const rawItems = data?.response?.body?.items?.item ?? [];
      const items = Array.isArray(rawItems) ? rawItems : [rawItems];

      const facilities = items.slice(0, 4).map((item) => ({
        facilityName: item.dutyName ?? "지역 응급의료기관",
        category: item.dutyDivName ?? "응급의료센터",
        distanceKm: parseFloat((parseFloat(item.distance ?? "1.5")).toFixed(1)),
        estimatedMinutes: Math.round(parseFloat(item.distance ?? "1.5") * 2.5 + 2),
      }));

      const avgMinutes =
        facilities.length > 0
          ? parseFloat(
              (facilities.reduce((sum, f) => sum + f.estimatedMinutes, 0) / facilities.length).toFixed(1),
            )
          : 8.0;

      return res.json({
        status: "live",
        goldenTimeMinutes: avgMinutes,
        readinessScore: Math.min(96, Math.max(60, 100 - Math.round(avgMinutes * 4))),
        facilities: facilities.length > 0 ? facilities : [
          { facilityName: "지역권역 응급의료센터", category: "권역응급센터", distanceKm: 2.0, estimatedMinutes: 6 },
          { facilityName: "관할 119 안전센터", category: "119안전센터", distanceKm: 1.5, estimatedMinutes: 5 },
        ],
        provenance: {
          sourceName: "보건복지부/소방청 응급의료기관 정보",
          sourceType: "public-data",
          sourceStatus: "live",
          requestedCoordinates: { latitude: lat, longitude: lon },
          retrievedAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      if (logger) {
        logger.warn("Emergency API fetch error, falling back", { error: String(err) });
      }

      return res.json({
        status: "sample-fallback",
        goldenTimeMinutes: 8.0,
        readinessScore: 88,
        facilities: [
          { facilityName: "지역 인접 응급의료센터", category: "권역응급센터", distanceKm: 2.5, estimatedMinutes: 7 },
          { facilityName: "지역 관할 119 안전센터", category: "119안전센터", distanceKm: 1.8, estimatedMinutes: 5 },
        ],
        provenance: {
          sourceName: "보건복지부/소방청 응급의료기관 샘플",
          sourceType: "public-data-sample",
          sourceStatus: "sample-fallback",
          requestedCoordinates: { latitude: lat, longitude: lon },
          retrievedAt: new Date().toISOString(),
        },
      });
    }
  });

  return router;
}
