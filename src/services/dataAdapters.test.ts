import { describe, expect, it } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import type { TourismContext } from "../domain/types";
import {
  createFallbackTourismContext,
  getTourismContext,
  mapTourApiItemsToTourismContext,
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

  it("maps TourAPI festival and location items into the existing tourism context shape", () => {
    const tourism: TourismContext = mapTourApiItemsToTourismContext(
      sampleFestivalPlan,
      [
        {
          contentid: "100",
          title: "한강 K-POP 푸드 축제",
          addr1: "서울특별시 영등포구",
          firstimage: "https://example.com/festival.jpg",
          eventstartdate: "20260918",
          eventenddate: "20260920",
          overview: "한강 먹거리와 K-POP 공연이 함께 열리는 축제",
        },
      ],
      [
        {
          contentid: "200",
          title: "여의도 한강공원",
          contenttypeid: "12",
          dist: "800",
          firstimage: "https://example.com/spot.jpg",
        },
      ],
      "2026-07-16T00:00:00.000Z",
    );

    expect(tourism.provenance.sourceStatus).toBe("live");
    expect(tourism.provenance.retrievedAt).toBe("2026-07-16T00:00:00.000Z");
    expect(tourism.similarFestivals[0]).toMatchObject({
      id: "100",
      name: "한강 K-POP 푸드 축제",
      region: "서울특별시 영등포구",
    });
    expect(tourism.similarFestivals[0].visitors).toBeGreaterThan(0);
    expect(tourism.similarFestivals[0].themeOverlap).toBeGreaterThan(0);
    expect(tourism.nearbySpots[0]).toMatchObject({
      id: "200",
      name: "여의도 한강공원",
      category: "관광지",
      distanceKm: 0.8,
    });
  });

  it("falls back to sample data when the live TourAPI fetch fails", async () => {
    const failingFetch = async () => {
      throw new Error("network blocked");
    };
    const tourism = await getTourismContext(sampleFestivalPlan, {
      apiKey: "demo-key",
      fetchImpl: failingFetch,
    });

    expect(tourism.provenance.sourceStatus).toBe("sample-fallback");
    expect(tourism.provenance.fallbackReason).toContain("TourAPI 호출 실패");
  });

  it("returns non-personal trend signals filtered by festival keywords", async () => {
    const trends = await getTrendContext(sampleFestivalPlan);
    const keywords = trends.signals.map((signal) => signal.keyword);

    expect(trends.provenance.collectedPersonalData).toBe(false);
    expect(keywords).toContain("K-POP");
    expect(keywords.every((keyword) => sampleFestivalPlan.keywords.includes(keyword))).toBe(true);
  });
});
