import { describe, expect, it } from "vitest";
import { sampleDemandBackdataContext } from "../data/sampleDemandBackdata";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
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
    expect(forecast.reasons).toHaveLength(5);
    expect(forecast.reasons.map((reason) => reason.label)).toContain(
      "Naver DataLab 검색량 보정",
    );
    expect(forecast.reasons.every((reason) => reason.description.length > 0)).toBe(true);
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
    expect(forecastWithBackdata.reasons.some((reason) => reason.impact > 0)).toBe(true);
  });

  it("applies bounded search trend correction to demand forecasting", () => {
    const scalablePlan = {
      ...sampleFestivalPlan,
      expectedCapacity: 80000,
    };
    const neutralTrends = {
      ...sampleTrendContext,
      searchInterestScore: 50,
      trendAcceleration: 0,
    };
    const risingTrends = {
      ...sampleTrendContext,
      provenance: {
        ...sampleTrendContext.provenance,
        sourceName: "Naver DataLab search trend",
        sourceType: "public-data" as const,
        sourceStatus: "live" as const,
      },
      searchInterestScore: 100,
      trendAcceleration: 100,
    };
    const coolingTrends = {
      ...sampleTrendContext,
      searchInterestScore: 0,
      trendAcceleration: -100,
    };

    const neutralForecast = createForecast(
      scalablePlan,
      sampleTourismContext,
      neutralTrends,
    );
    const risingForecast = createForecast(
      scalablePlan,
      sampleTourismContext,
      risingTrends,
    );
    const coolingForecast = createForecast(
      scalablePlan,
      sampleTourismContext,
      coolingTrends,
    );

    expect(risingForecast.expectedVisitors).toBeGreaterThan(
      neutralForecast.expectedVisitors,
    );
    expect(coolingForecast.expectedVisitors).toBeLessThan(
      neutralForecast.expectedVisitors,
    );
    expect(risingForecast.expectedVisitors).toBeLessThanOrEqual(
      scalablePlan.expectedCapacity * 1.45,
    );
    expect(coolingForecast.expectedVisitors).toBeGreaterThanOrEqual(5000);
    expect(risingForecast.reasons.map((reason) => reason.label)).toContain(
      "Naver DataLab 검색량 보정",
    );
  });
  it("keeps MCST visitor baselines distinct when selected festivals change", () => {
    const smallBackdata = {
      ...sampleDemandBackdataContext,
      similarFestivalBaselines: [
        {
          id: "mcst-small-festival",
          name: "소규모 지역축제",
          region: sampleFestivalPlan.region,
          type: "문화예술",
          periodLabel: "봄",
          budgetMillionKrw: 300,
          visitors: 30000,
          similarityScore: 90,
          sourceName: "문화체육관광부_지역축제 정보",
        },
      ],
    };
    const largeBackdata = {
      ...sampleDemandBackdataContext,
      similarFestivalBaselines: [
        {
          id: "mcst-large-festival",
          name: "대규모 지역축제",
          region: sampleFestivalPlan.region,
          type: "문화예술",
          periodLabel: "봄",
          budgetMillionKrw: 1800,
          visitors: 450000,
          similarityScore: 90,
          sourceName: "문화체육관광부_지역축제 정보",
        },
      ],
    };

    const smallForecast = createForecast(
      sampleFestivalPlan,
      sampleTourismContext,
      sampleTrendContext,
      smallBackdata,
    );
    const largeForecast = createForecast(
      sampleFestivalPlan,
      sampleTourismContext,
      sampleTrendContext,
      largeBackdata,
    );

    expect(largeForecast.expectedVisitors).toBeGreaterThan(smallForecast.expectedVisitors * 2);
  });

  it("changes hourly demand profile when the selected festival theme changes", () => {
    const daytimeFestivalPlan = {
      ...sampleFestivalPlan,
      name: "논산딸기축제",
      keywords: ["논산딸기축제", "딸기", "지역특산물", "가족체험"],
    };
    const nighttimeFestivalPlan = {
      ...sampleFestivalPlan,
      name: "강남 미디어 윈터페스타",
      keywords: ["미디어아트", "빛축제", "야간관광", "겨울축제"],
    };

    const daytimeForecast = createForecast(
      daytimeFestivalPlan,
      sampleTourismContext,
      sampleTrendContext,
      sampleDemandBackdataContext,
    );
    const nighttimeForecast = createForecast(
      nighttimeFestivalPlan,
      sampleTourismContext,
      sampleTrendContext,
      sampleDemandBackdataContext,
    );

    expect(daytimeForecast.peakHour).toBeLessThan(nighttimeForecast.peakHour);
    expect(daytimeForecast.visitorsByHour.map((item) => item.visitors)).not.toEqual(
      nighttimeForecast.visitorsByHour.map((item) => item.visitors),
    );
  });
});
