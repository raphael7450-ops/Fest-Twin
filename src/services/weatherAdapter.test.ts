import { describe, expect, it } from "vitest";
import {
  calculateWeatherMultiplier,
  getFallbackWeatherContext,
} from "./weatherAdapter";

describe("weatherAdapter", () => {
  it("calculates baseline weather multiplier correctly", () => {
    const normalWeather = {
      temperatureCelsius: 22,
      precipitationProbabilityPercent: 0,
      windSpeedMetersPerSec: 2,
      precipitationType: "none" as const,
      conditionText: "Clear",
    };

    const multiplier = calculateWeatherMultiplier(normalWeather);
    expect(multiplier).toBeGreaterThan(1.0);
    expect(multiplier).toBeLessThanOrEqual(1.15);
  });

  it("reduces multiplier when rain probability is high", () => {
    const rainyWeather = {
      temperatureCelsius: 15,
      precipitationProbabilityPercent: 80,
      windSpeedMetersPerSec: 3,
      precipitationType: "rain" as const,
      conditionText: "Rainy",
    };

    const multiplier = calculateWeatherMultiplier(rainyWeather);
    expect(multiplier).toBeLessThan(1.0);
    expect(multiplier).toBeGreaterThanOrEqual(0.7);
  });

  it("returns fallback seasonal weather context", () => {
    const winterFallback = getFallbackWeatherContext(37.51, 127.06, 12);
    expect(winterFallback.provenance.sourceType).toBe("seasonal-climate-sample");
    expect(winterFallback.confidenceLevel).toBe("medium");
    expect(winterFallback.attractivenessMultiplier).toBeGreaterThanOrEqual(0.7);
  });
});
