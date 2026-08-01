import { describe, expect, it } from "vitest";
import {
  sampleDemandBackdataContext,
  sampleRegionalFestivalRecords,
} from "../data/sampleDemandBackdata";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import {
  createFallbackDemandBackdataContext,
  getDemandBackdataContextFromApi,
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

  it("loads MCST regional festival rows from the server DB for dashboard forecasting", async () => {
    const requestedUrls: string[] = [];
    const context = await getDemandBackdataContextFromApi(sampleFestivalPlan, {
      fetchImpl: async (input) => {
        requestedUrls.push(String(input));
        return {
          ok: true,
          json: async () => ({
            count: 2,
            records: [
              {
                id: "mcst-2025-seoul-light",
                year: 2025,
                name: "서울라이트 광화문",
                region: "서울",
                localGovernment: "종로구",
                type: "문화예술",
                startDate: "2025-12-20",
                endDate: "2026-01-12",
                budgetMillionKrw: 3674,
                visitors: 1896426,
                sourceName: "문화체육관광부_지역축제 정보",
                sourceFile: "2025년 지역축제 개최계획 현황(0321).xlsx",
              },
              {
                id: "mcst-2024-seoul-festa",
                year: 2024,
                name: "서울페스타 2024",
                region: "서울",
                localGovernment: "-",
                type: "문화예술",
                startDate: "2024-05-01",
                endDate: "2024-05-06",
                budgetMillionKrw: 2115,
                visitors: 392000,
                sourceName: "문화체육관광부_지역축제 정보",
                sourceFile: "2024년 지역축제 개최계획(홈페이지 게시)0930.xlsx",
              },
            ],
          }),
        } as Response;
      },
    });

    expect(requestedUrls[0]).toContain("/api/regional-festivals");
    expect(context.status).toBe("file-normalized");
    expect(context.similarFestivalBaselines[0]).toMatchObject({
      name: "서울라이트 광화문",
      visitors: 1896426,
      sourceName: "문화체육관광부_지역축제 정보",
    });
    expect(context.sourceDetails[0].statusLabel).toContain("서버 DB");
  });
});