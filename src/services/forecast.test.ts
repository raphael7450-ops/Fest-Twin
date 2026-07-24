import { describe, expect, it } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import { sampleDemandBackdataContext } from "../data/sampleDemandBackdata";
import { sampleTourismContext } from "../data/sampleTourApi";
import { sampleTrendContext } from "../data/sampleTrends";
import { createForecast } from "./forecast";

describe("createForecast", () => {
  it("returns an explainable demand forecast for public review", () => {
    const forecast = createForecast(
      sampleFestivalPlan,
      sampleTourismContext,
      sampleTrendContext,
    );

    expect(forecast.expectedVisitors).toBeGreaterThan(30000);
    expect(forecast.peakHour).toBe(20);
    expect(forecast.reasons.map((reason) => reason.label)).toContain(
      "TourAPI 주변 관광 매력도",
    );
    expect(forecast.reasons.map((reason) => reason.label)).toContain(
      "샘플 트렌드 관심도 프록시",
    );
    expect(forecast.reasons.map((reason) => reason.label)).toContain(
      "유사 축제 추정 수요 프록시",
    );
    expect(forecast.reasons[1].description).toContain("실제 방문객 집계가 아닌");
    expect(forecast.confidence).toBe("medium");

    const liveTourism = {
      ...sampleTourismContext,
      provenance: {
        ...sampleTourismContext.provenance,
        sourceStatus: "live" as const,
      },
    };
    const nonSampleTrends = {
      ...sampleTrendContext,
      provenance: {
        ...sampleTrendContext.provenance,
        sourceType: "public-data" as const,
      },
    };

    expect(createForecast(sampleFestivalPlan, liveTourism, nonSampleTrends).confidence).toBe(
      "high",
    );
    expect(createForecast(sampleFestivalPlan, liveTourism, sampleTrendContext).confidence).toBe(
      "medium",
    );
  });

  it("uses regional festival visitor backdata as the similar demand baseline", () => {
    const tourismWithoutSimilarFestivals = {
      ...sampleTourismContext,
      similarFestivals: [],
    };
    const forecastWithoutBackdata = createForecast(
      sampleFestivalPlan,
      tourismWithoutSimilarFestivals,
      sampleTrendContext,
    );
    const forecastWithBackdata = createForecast(
      sampleFestivalPlan,
      tourismWithoutSimilarFestivals,
      sampleTrendContext,
      sampleDemandBackdataContext,
    );

    expect(forecastWithBackdata.expectedVisitors).toBeGreaterThan(30000);
    expect(forecastWithBackdata.expectedVisitors).not.toBe(
      forecastWithoutBackdata.expectedVisitors,
    );
    expect(forecastWithBackdata.reasons.map((reason) => reason.label)).toContain(
      "지역축제 방문객 기준선",
    );
    expect(
      forecastWithBackdata.reasons.find(
        (reason) => reason.label === "지역축제 방문객 기준선",
      )?.description,
    ).toContain("문화체육관광부");
  });
});
