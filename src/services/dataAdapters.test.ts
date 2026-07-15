import { describe, expect, it } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import { getTourismContext } from "./tourApiAdapter";
import { getTrendContext } from "./trendAdapter";

describe("public data adapters", () => {
  it("returns TourAPI-like public data with provenance and no personal data collection", async () => {
    const tourism = await getTourismContext(sampleFestivalPlan);

    expect(tourism.provenance.sourceName).toContain("TourAPI");
    expect(tourism.provenance.collectedPersonalData).toBe(false);
    expect(tourism.nearbySpots[0].category).toContain(sampleFestivalPlan.region);
  });

  it("returns non-personal trend signals filtered by festival keywords", async () => {
    const trends = await getTrendContext(sampleFestivalPlan);
    const keywords = trends.signals.map((signal) => signal.keyword);

    expect(trends.provenance.collectedPersonalData).toBe(false);
    expect(keywords).toContain("K-POP");
    expect(keywords.every((keyword) => sampleFestivalPlan.keywords.includes(keyword))).toBe(true);
  });
});
