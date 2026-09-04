import { describe, expect, it } from "vitest";
import { sampleFestivalPlan } from "./sampleFestivalPlan";

describe("sampleFestivalPlan", () => {
  it("uses a large upcoming festival as the first-screen default plan", () => {
    expect(sampleFestivalPlan.name).toContain("서울 윈터페스타");
    expect(sampleFestivalPlan.startDate).toBe("2026-12-18");
    expect(sampleFestivalPlan.endDate).toBe("2026-12-31");
    expect(sampleFestivalPlan.venueAddress).toContain("광화문광장");
    expect(sampleFestivalPlan.expectedCapacity).toBeGreaterThanOrEqual(40000);
  });
});
