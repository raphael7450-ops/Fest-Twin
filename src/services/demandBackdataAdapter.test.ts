import { describe, expect, it } from "vitest";
import {
  sampleDemandBackdataContext,
  sampleRegionalFestivalRecords,
} from "../data/sampleDemandBackdata";

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
