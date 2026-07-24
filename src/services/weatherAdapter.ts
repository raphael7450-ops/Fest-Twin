/**
 * 파일 : src/services/weatherAdapter.ts
 * 내용 : 기상청 단기예보 Open API 기반 기후 조건(강수확률, 기온, 풍속) 수요 가감 어댑터
 * 수정 : 2026-07-24. 단기예보 수신 및 강수/기온 영향도 감쇄 비율(WeatherImpact) 계산
 */

import type { RiskLevel } from "../domain/types";

export interface WeatherInfo {
  temperatureCelsius: number;
  precipitationProbabilityPercent: number;
  windSpeedMetersPerSec: number;
  precipitationType: "none" | "rain" | "rain_snow" | "snow";
  conditionText: string;
}

export interface WeatherProvenance {
  sourceType: "kma-forecast" | "seasonal-climate-sample";
  sourceStatus: "live" | "sample-fallback";
  requestedCoordinates: { latitude: number; longitude: number };
  baseDateTime: string;
}

export interface WeatherContext {
  weather: WeatherInfo;
  attractivenessMultiplier: number;
  confidenceScore: number;
  confidenceLevel: RiskLevel;
  provenance: WeatherProvenance;
}

export function calculateWeatherMultiplier(weather: WeatherInfo): number {
  let multiplier = 1.0;

  // 1. 강수형태/강수확률 보정
  if (weather.precipitationType === "rain" || weather.precipitationType === "rain_snow") {
    multiplier -= (weather.precipitationProbabilityPercent / 100) * 0.25;
  } else if (weather.precipitationType === "snow") {
    multiplier -= (weather.precipitationProbabilityPercent / 100) * 0.15;
  }

  // 2. 극단적 기온(한파/폭염) 보정
  if (weather.temperatureCelsius < -5) {
    multiplier -= 0.1;
  } else if (weather.temperatureCelsius > 33) {
    multiplier -= 0.15;
  } else if (weather.temperatureCelsius >= 18 && weather.temperatureCelsius <= 24) {
    multiplier += 0.08;
  }

  // 3. 강풍 보정
  if (weather.windSpeedMetersPerSec >= 10) {
    multiplier -= 0.12;
  }

  // Clamping between 0.70 and 1.15
  return Math.min(Math.max(multiplier, 0.7), 1.15);
}

export function getFallbackWeatherContext(
  latitude = 37.5103955843,
  longitude = 127.0610512042,
  month = 12,
): WeatherContext {
  const isWinter = month === 12 || month === 1 || month === 2;
  const isSummer = month >= 6 && month <= 8;

  const weather: WeatherInfo = {
    temperatureCelsius: isWinter ? 1.5 : isSummer ? 27.5 : 18.0,
    precipitationProbabilityPercent: 10,
    windSpeedMetersPerSec: 2.1,
    precipitationType: "none",
    conditionText: isWinter ? "맑음 (동계 평년 기후 샘플)" : "맑음 (평년 기후 샘플)",
  };

  const multiplier = calculateWeatherMultiplier(weather);

  return {
    weather,
    attractivenessMultiplier: multiplier,
    confidenceScore: 78,
    confidenceLevel: "medium",
    provenance: {
      sourceType: "seasonal-climate-sample",
      sourceStatus: "sample-fallback",
      requestedCoordinates: { latitude, longitude },
      baseDateTime: new Date().toISOString(),
    },
  };
}
