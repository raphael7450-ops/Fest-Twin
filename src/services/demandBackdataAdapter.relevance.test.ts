import { describe, expect, it } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import { getDemandBackdataContextFromApi } from "./demandBackdataAdapter";

describe("demandBackdataAdapter relevance", () => {
  it("prioritizes festival theme and season over raw visitor scale for API backdata", async () => {
    const context = await getDemandBackdataContextFromApi(
      {
        ...sampleFestivalPlan,
        name: "부산 카운트다운 축제",
        region: "부산",
        startDate: "2026-12-31",
        endDate: "2027-01-01",
        keywords: ["부산", "카운트다운", "새해"],
        totalBudgetMillionKrw: 120,
      },
      {
        fetchImpl: async () =>
          ({
            ok: true,
            json: async () => ({
              records: [
                {
                  id: "busan-sea",
                  year: 2026,
                  name: "부산 바다축제",
                  region: "부산",
                  localGovernment: "해운대구",
                  type: "해양/여름",
                  startDate: "2026-08-01",
                  endDate: "2026-08-05",
                  budgetMillionKrw: 3000,
                  visitors: 1900000,
                  sourceName: "문화체육관광부_지역축제 정보",
                  sourceFile: "large.xlsx",
                },
                {
                  id: "busan-countdown",
                  year: 2026,
                  name: "부산 시민의종 타종행사",
                  region: "부산",
                  localGovernment: "중구",
                  type: "타종/새해맞이",
                  startDate: "2026-12-31",
                  endDate: "2027-01-01",
                  budgetMillionKrw: 108,
                  visitors: 7675,
                  sourceName: "문화체육관광부_지역축제 정보",
                  sourceFile: "countdown.xlsx",
                },
              ],
            }),
          }) as Response,
      },
    );

    expect(context.similarFestivalBaselines[0]).toMatchObject({
      id: "busan-countdown",
      name: "부산 시민의종 타종행사",
      sourceName: "문화체육관광부_지역축제 정보",
      sourceFile: "countdown.xlsx",
    });
    expect(context.similarFestivalBaselines.map((festival) => festival.id)).not.toContain("busan-sea");
    expect(context.sourceDetails[0]!.records![0]!.fields).toContainEqual({
      label: "원천 파일",
      value: "countdown.xlsx",
    });
  });
});
