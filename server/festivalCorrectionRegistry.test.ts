import { describe, expect, it } from "vitest";
import { createFestivalCorrectionRegistry } from "./festivalCorrectionRegistry.js";

describe("festival correction registry", () => {
  it("limits audited historical corrections to a known year and region", () => {
    const registry = createFestivalCorrectionRegistry();
    const record = { name: "푸드앤아트페스티벌", region: "전남", year: 2023, startDate: "2023-09-27", endDate: "2023-09-29", visitors: 340000 };
    expect(registry.apply(record)).toMatchObject({ startDate: "2023-10-07", endDate: "2023-10-09", visitors: undefined, unverifiedReportedVisitors: 340000 });
    const unknown = { name: record.name, region: record.region };
    expect(registry.apply(unknown)).toEqual(unknown);
    expect(registry.apply({ ...record, year: 2024 }).startDate).toBe(record.startDate);
    expect(registry.apply({ ...record, region: "충남" }).startDate).toBe(record.startDate);
  });
  it("applies the shared Busan Sea Festival end date to a regional DB record", () => {
    const registry = createFestivalCorrectionRegistry();

    expect(
      registry.apply({
        id: "mcst-busan-sea-2026",
        name: "제30회 2026 부산바다축제",
        region: "부산",
        year: 2026,
        startDate: "2026-08-01",
        endDate: "2026-08-09",
      }),
    ).toMatchObject({
      id: "mcst-busan-sea-2026",
      endDate: "2026-08-13",
      correction: {
        verifiedAt: "2026-08-11",
      },
    });
  });

  it("leaves a Daegu record titled Daejeon 0 O'clock Festival available without a correction", () => {
    const registry = createFestivalCorrectionRegistry();
    const record = {
      id: "daegu-daejeon-title-2026",
      name: "제4회 2026 대전 0시 축제",
      region: "대구",
      year: 2026,
      startDate: "2026-08-07",
      endDate: "2026-08-17",
    };

    expect(registry.isAvailable(record)).toBe(true);
    expect(registry.apply(record)).toEqual(record);
  });
});
