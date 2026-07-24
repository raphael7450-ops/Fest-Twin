import { describe, expect, it } from "vitest";
import {
  sampleDemandBackdataContext,
  sampleRegionalFestivalRecords,
} from "../data/sampleDemandBackdata";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import {
  createFallbackDemandBackdataContext,
  getDemandBackdataContext,
} from "./demandBackdataAdapter";

describe("sampleDemandBackdata", () => {
  it("provides normalized regional festival visitor and budget records", () => {
    expect(sampleRegionalFestivalRecords.length).toBeGreaterThanOrEqual(3);
    expect(sampleRegionalFestivalRecords[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String),
        region: expect.any(String),
        type: expect.any(String),
        visitors: expect.any(Number),
        sourceName: "문화체육관광부_지역축제 정보",
      }),
    );
    expect(sampleDemandBackdataContext.status).toBe("file-normalized");
    expect(JSON.stringify(sampleDemandBackdataContext.sourceDetails)).not.toMatch(
      /serviceKey|clientSecret|Authorization|Cookie/i,
    );
  });
});

describe("demandBackdataAdapter", () => {
  it("selects similar festival baselines by region and keyword overlap", () => {
    const context = getDemandBackdataContext(sampleFestivalPlan);

    expect(context.status).toBe("file-normalized");
    expect(context.similarFestivalBaselines.length).toBeGreaterThanOrEqual(2);
    expect(context.similarFestivalBaselines[0].visitors).toBeGreaterThan(30000);
    expect(context.similarFestivalBaselines[0].similarityScore).toBeGreaterThanOrEqual(
      context.similarFestivalBaselines[1].similarityScore,
    );
    expect(JSON.stringify(context.sourceDetails)).toContain("방문객 수");
  });

  it("returns a fallback context when no similar festival record is usable", () => {
    const context = createFallbackDemandBackdataContext(
      { ...sampleFestivalPlan, region: "매칭없음", keywords: ["새로운주제"] },
      "테스트 fallback",
    );

    expect(context.status).toBe("sample-fallback");
    expect(context.similarFestivalBaselines.length).toBeGreaterThan(0);
    expect(context.sourceDetails[0].statusLabel).toContain("샘플");
    expect(context.sourceDetails[0].note).toContain("테스트 fallback");
  });
});
