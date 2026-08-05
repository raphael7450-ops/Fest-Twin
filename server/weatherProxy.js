/**
 * 파일 : server/weatherProxy.js
 * 내용 : 기상청 단기예보 OpenAPI 중계 라우터 (위경도->격자좌표 변환, API 호출 및 Fallback)
 */

import { Router } from "express";

// Lambert 정각원추 투영 변환 함수 (위경도 -> 기상청 격자 X, Y)
export function convertLatLonToGrid(lat, lon) {
  const RE = 6371.00877; // 지구 반경(km)
  const GRID = 5.0; // 격자 간격(km)
  const SLAT1 = 30.0; // 투영 위도1(degree)
  const SLAT2 = 60.0; // 투영 위도2(degree)
  const OLON = 126.0; // 기준점 경도(degree)
  const OLAT = 38.0; // 기준점 위도(degree)
  const XO = 43; // 기준점 X좌표(GRID)
  const YO = 136; // 기준점 Y좌표(GRID)

  const DEGRAD = Math.PI / 180.0;
  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;

  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);

  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = (re * sf) / Math.pow(ra, sn);
  let theta = lon * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  const nx = Math.floor(ra * Math.sin(theta) + XO + 0.5);
  const ny = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);

  return { nx, ny };
}

export function createWeatherProxyRouter(options = {}) {
  const router = Router();
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const logger = options.logger;

  router.get("/", async (req, res) => {
    const lat = parseFloat(req.query.lat ?? "37.510395");
    const lon = parseFloat(req.query.lon ?? "127.061051");
    const apiKey = options.apiKey ?? process.env.WEATHER_API_KEY;

    const { nx, ny } = convertLatLonToGrid(lat, lon);

    if (!apiKey) {
      if (logger) {
        logger.info("WEATHER_API_KEY not provided. Returning fallback weather sample.");
      }
      return res.json({
        status: "sample-fallback",
        weather: {
          temperatureCelsius: 18.5,
          precipitationProbabilityPercent: 10,
          windSpeedMetersPerSec: 2.3,
          precipitationType: "none",
          conditionText: "맑음 (기후 샘플 대체)",
        },
        attractivenessMultiplier: 1.08,
        confidenceScore: 75,
        confidenceLevel: "medium",
        provenance: {
          sourceType: "seasonal-climate-sample",
          sourceStatus: "sample-fallback",
          requestedCoordinates: { latitude: lat, longitude: lon },
          baseDateTime: new Date().toISOString(),
        },
      });
    }

    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const baseDate = `${year}${month}${day}`;
      const baseTime = "0500"; // 05:00 AM standard base time

      const url = `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?serviceKey=${encodeURIComponent(apiKey)}&pageNo=1&numOfRows=60&dataType=JSON&base_date=${baseDate}&base_time=${baseTime}&nx=${nx}&ny=${ny}`;

      const response = await fetchImpl(url);
      if (!response.ok) {
        throw new Error(`Weather API HTTP ${response.status}`);
      }

      const data = await response.json();
      const items = data?.response?.body?.items?.item ?? [];

      const popItem = items.find((i) => i.category === "POP");
      const tmpItem = items.find((i) => i.category === "TMP");
      const wsdItem = items.find((i) => i.category === "WSD");
      const ptyItem = items.find((i) => i.category === "PTY");

      const pop = popItem ? parseInt(popItem.fcstValue, 10) : 10;
      const tmp = tmpItem ? parseFloat(tmpItem.fcstValue) : 18.0;
      const wsd = wsdItem ? parseFloat(wsdItem.fcstValue) : 2.0;
      const ptyCode = ptyItem ? parseInt(ptyItem.fcstValue, 10) : 0;

      let ptyType = "none";
      if (ptyCode === 1 || ptyCode === 4) ptyType = "rain";
      else if (ptyCode === 2) ptyType = "rain_snow";
      else if (ptyCode === 3) ptyType = "snow";

      let conditionText = "맑음";
      if (ptyType === "rain") conditionText = "비";
      else if (ptyType === "snow") conditionText = "눈";
      else if (pop >= 50) conditionText = "흐림 (강수 가능성)";

      let multiplier = 1.0;
      if (ptyType === "rain" || ptyType === "rain_snow") {
        multiplier -= (pop / 100) * 0.25;
      } else if (ptyType === "snow") {
        multiplier -= (pop / 100) * 0.15;
      }
      if (tmp < -5) multiplier -= 0.1;
      else if (tmp > 33) multiplier -= 0.15;
      else if (tmp >= 18 && tmp <= 24) multiplier += 0.08;
      if (wsd >= 10) multiplier -= 0.12;

      multiplier = Math.min(Math.max(multiplier, 0.7), 1.15);

      return res.json({
        status: "live",
        weather: {
          temperatureCelsius: tmp,
          precipitationProbabilityPercent: pop,
          windSpeedMetersPerSec: wsd,
          precipitationType: ptyType,
          conditionText,
        },
        attractivenessMultiplier: Number(multiplier.toFixed(2)),
        confidenceScore: 92,
        confidenceLevel: "high",
        provenance: {
          sourceType: "kma-forecast",
          sourceStatus: "live",
          requestedCoordinates: { latitude: lat, longitude: lon },
          baseDateTime: `${baseDate} ${baseTime}`,
        },
      });
    } catch (err) {
      if (logger) {
        logger.warn("Weather API fetch error, falling back", { error: String(err) });
      }

      return res.json({
        status: "sample-fallback",
        weather: {
          temperatureCelsius: 18.0,
          precipitationProbabilityPercent: 10,
          windSpeedMetersPerSec: 2.1,
          precipitationType: "none",
          conditionText: "맑음 (오류 대체 샘플)",
        },
        attractivenessMultiplier: 1.08,
        confidenceScore: 70,
        confidenceLevel: "medium",
        provenance: {
          sourceType: "seasonal-climate-sample",
          sourceStatus: "sample-fallback",
          requestedCoordinates: { latitude: lat, longitude: lon },
          baseDateTime: new Date().toISOString(),
        },
      });
    }
  });

  return router;
}
