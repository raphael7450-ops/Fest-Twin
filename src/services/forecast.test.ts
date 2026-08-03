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
    expect(forecast.reasons).toHaveLength(6);
    expect(forecast.reasons.map((reason) => reason.label)).toContain(
      "Naver DataLab 검색량 보정",
    );
    expect(forecast.reasons.map((reason) => reason.label)).toContain(
      "축제 유형별 시간대 패턴",
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

  it("uses festival type backdata to shape hourly demand distribution", () => {
    const foodPlan = {
      ...sampleFestivalPlan,
      name: "지역 먹거리 축제",
      region: "전북",
      operatingHours: [10, 12, 14, 16, 18, 20],
      programs: [
        { id: "food-lunch", name: "대표 메뉴 시식", startHour: 11, endHour: 13, expectedDraw: 70 },
        { id: "food-dinner", name: "야시장", startHour: 18, endHour: 20, expectedDraw: 75 },
      ],
    };
    const foodBackdata = {
      ...sampleDemandBackdataContext,
      similarFestivalBaselines: [
        {
          id: "food",
          name: "지역 먹거리 축제",
          region: "전북",
          type: "먹거리/특산물",
          periodLabel: "가을 주간형",
          budgetMillionKrw: 450,
          visitors: 28000,
          similarityScore: 95,
          sourceName: "문화체육관광부_지역축제 정보",
        },
      ],
    };

    const forecast = createForecast(
      foodPlan,
      sampleTourismContext,
      sampleTrendContext,
      foodBackdata,
    );
    const visitorsAt = new Map(forecast.visitorsByHour.map((item) => [item.hour, item.visitors]));

    expect(visitorsAt.get(12)).toBeGreaterThan(visitorsAt.get(16)!);
    expect(visitorsAt.get(18)).toBeGreaterThan(visitorsAt.get(16)!);
    expect(forecast.reasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "축제 유형별 시간대 패턴",
          description: expect.stringContaining("먹거리/특산물"),
        }),
      ]),
    );
  });

  it("shifts countdown and new year festivals toward a late-night midnight peak", () => {
    const countdownPlan = {
      ...sampleFestivalPlan,
      name: "부산 카운트다운 축제",
      keywords: ["부산", "카운트다운", "새해", "불꽃"],
      operatingHours: [18, 20, 22, 23, 24],
      programs: [
        { id: "music", name: "야간 공연", startHour: 20, endHour: 23, expectedDraw: 82 },
        { id: "countdown", name: "새해 카운트다운", startHour: 23, endHour: 24, expectedDraw: 96 },
      ],
    };
    const countdownBackdata = {
      ...sampleDemandBackdataContext,
      similarFestivalBaselines: [
        {
          id: "busan-countdown",
          name: "부산 카운트다운 축제",
          region: "부산",
          type: "야간/카운트다운",
          periodLabel: "연말 야간",
          budgetMillionKrw: 900,
          visitors: 120000,
          similarityScore: 98,
          sourceName: "지역축제 DB",
        },
      ],
    };

    const forecast = createForecast(
      countdownPlan,
      sampleTourismContext,
      sampleTrendContext,
      countdownBackdata,
    );
    const visitorsAt = new Map(forecast.visitorsByHour.map((item) => [item.hour, item.visitors]));

    expect(forecast.peakHour).toBe(24);
    expect(visitorsAt.get(24)).toBeGreaterThan(visitorsAt.get(20)!);
    expect(visitorsAt.get(23)).toBeGreaterThan(visitorsAt.get(18)!);
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
});
