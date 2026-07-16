import { describe, expect, it } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import {
  createFallbackTourismContext,
  getTourismContext,
} from "./tourApiAdapter";
import { getTrendContext } from "./trendAdapter";

describe("public data adapters", () => {
  it("returns TourAPI-like fallback data with explicit provenance when no API key is configured", async () => {
    const tourism = await getTourismContext(sampleFestivalPlan);

    expect(tourism.provenance.sourceName).toContain("TourAPI");
    expect(tourism.provenance.sourceStatus).toBe("sample-fallback");
    expect(tourism.provenance.collectedPersonalData).toBe(false);
    expect(tourism.provenance.fallbackReason).toContain("인증키");
    expect(tourism.nearbySpots[0].category).toContain(sampleFestivalPlan.region);
  });

  it("creates a region-aware fallback context with a public-data explanation", () => {
    const tourism = createFallbackTourismContext(sampleFestivalPlan, "테스트 실패");

    expect(tourism.provenance.basisText).toContain("샘플");
    expect(tourism.provenance.fallbackReason).toBe("테스트 실패");
    expect(tourism.nearbySpots.every((spot) => spot.category.includes("서울"))).toBe(true);
  });

  it("returns non-personal trend signals filtered by festival keywords", async () => {
    const trends = await getTrendContext(sampleFestivalPlan);
    const keywords = trends.signals.map((signal) => signal.keyword);

    expect(trends.provenance.collectedPersonalData).toBe(false);
    expect(keywords).toContain("K-POP");
    expect(keywords.every((keyword) => sampleFestivalPlan.keywords.includes(keyword))).toBe(true);
  });
});
