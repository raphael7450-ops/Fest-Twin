import { describe, expect, it } from "vitest";
import {
  applyFestivalCorrection,
  getFestivalCorrection,
  isFestivalAvailableForPlanning,
} from "./festivalCorrections";

describe("festival corrections", () => {
  it("corrects Busan Sea Festival to the verified 2026 schedule", () => {
    const record = {
      id: "busan-sea-2026",
      title: "제30회 2026 부산바다축제",
      region: "부산광역시",
      year: 2026,
      startDate: "2026-08-01",
      endDate: "2026-08-09",
    };

    expect(getFestivalCorrection(record)).toMatchObject({
      canonicalKey: "부산바다축제",
      verifiedAt: "2026-08-11",
    });
    expect(applyFestivalCorrection(record)).toMatchObject({
      id: "busan-sea-2026",
      startDate: "2026-08-07",
      endDate: "2026-08-13",
      correction: {
        verifiedAt: "2026-08-11",
      },
    });
  });

  it("marks Daejeon 0 O'clock Festival unavailable for planning", () => {
    expect(
      isFestivalAvailableForPlanning({
        title: "제4회 2026 대전 0시 축제",
        region: "대전",
        year: 2026,
        startDate: "2026-08-07",
        endDate: "2026-08-17",
      }),
    ).toBe(false);
  });

  it("leaves a Daegu record titled Daejeon 0 O'clock Festival available without a correction", () => {
    const record = {
      title: "제4회 2026 대전 0시 축제",
      region: "대구",
      year: 2026,
      startDate: "2026-08-07",
      endDate: "2026-08-17",
    };

    expect(isFestivalAvailableForPlanning(record)).toBe(true);
    expect(applyFestivalCorrection(record)).toEqual(record);
  });

  it("does not apply a correction when the festival region is unavailable", () => {
    expect(
      applyFestivalCorrection({
        title: "부산바다축제",
        year: 2026,
        startDate: "2026-08-01",
        endDate: "2026-08-09",
      }),
    ).toMatchObject({
      startDate: "2026-08-01",
      endDate: "2026-08-09",
    });
  });
});
