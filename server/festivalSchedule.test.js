import { describe, expect, it } from "vitest";
import { normalizeFestivalSchedule } from "./festivalSchedule.js";

describe("schedule normalization", () => {
  it.each(["2026-02-30", "2026-13-01", "not-a-date"])("does not publish invalid date %s", (startDate) => {
    expect(normalizeFestivalSchedule({ year: 2026, startDate, endDate: startDate })).toMatchObject({
      startDate: null, endDate: null, dateStatus: "needs-review",
    });
  });
  it("does not silently move an inverted interval into the next year", () => {
    const record = normalizeFestivalSchedule({ year: 2026, startDate: "2026-12-01", endDate: "2026-02-01" });
    expect(record).toMatchObject({ startDate: null, endDate: null, dateStatus: "needs-review" });
    expect(record.searchStartDate).toBeUndefined();
  });
  it("preserves the original month-only text and separates search bounds from actual dates", () => {
    expect(normalizeFestivalSchedule({ year: 2026, periodLabel: "10월 중" })).toMatchObject({
      startDate: null, endDate: null, sourcePeriodLabel: "10월 중", dateStatus: "needs-review",
      searchStartDate: "2026-10-01", searchEndDate: "2026-10-31",
    });
  });
});
