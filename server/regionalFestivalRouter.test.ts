import express from "express";
import { describe, expect, it } from "vitest";
import { createRegionalFestivalRouter } from "./regionalFestivalRouter.js";

function callRegionalFestivalRoute(path: string) {
  const db = {
    searchFestivals: () => [
      {
        id: "mcst-2025-nonsan-strawberry",
        year: 2025,
        name: "논산딸기축제",
        region: "충청남도",
        localGovernment: "논산시",
        type: "지역특산물",
        venue: "논산시민가족공원",
        startDate: "2025-03-27",
        endDate: "2025-03-30",
        budgetMillionKrw: 960,
        visitors: 450000,
        sourceName: "문화체육관광부_지역축제 정보",
        sourceFile: "2025년 지역축제 개최계획 현황(0321).xlsx",
      },
    ],
    getSummary: () => ({ totalCount: 1, years: [2025], regions: ["충청남도"] }),
  };
  const router = createRegionalFestivalRouter({ db });
  const app = express();
  app.use("/api/regional-festivals", router);

  let status = 200;
  let jsonBody: unknown = null;
  const req: any = {
    method: "GET",
    url: `/api/regional-festivals${path}`,
    headers: { "content-type": "application/json" },
  };
  const res: any = {
    setHeader() {},
    status(code: number) {
      status = code;
      return res;
    },
    json(data: unknown) {
      jsonBody = data;
      return res;
    },
  };

  app(req, res, () => {});
  return { status, jsonBody: jsonBody as any };
}

describe("regionalFestivalRouter", () => {
  it("returns normalized MCST festival rows for dashboard backdata", () => {
    const response = callRegionalFestivalRoute(
      "/?region=충청남도&year=2025&keywords=딸기,특산물&limit=3",
    );

    expect(response.status).toBe(200);
    expect(response.jsonBody.count).toBe(1);
    expect(response.jsonBody.records[0]).toMatchObject({
      name: "논산딸기축제",
      region: "충청남도",
      visitors: 450000,
      budgetMillionKrw: 960,
      sourceName: "문화체육관광부_지역축제 정보",
    });
    expect(JSON.stringify(response.jsonBody)).not.toMatch(/연락처|담당자|전화|phone/i);
  });
});