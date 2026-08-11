import { describe, expect, it } from "vitest";
import { sampleFestivalPlan } from "./sampleFestivalPlan";

describe("sampleFestivalPlan", () => {
  it("uses a large upcoming festival as the first-screen default plan", () => {
    expect(sampleFestivalPlan.name).toContain("서울세계불꽃축제");
    expect(sampleFestivalPlan.startDate).toBe("2026-09-04");
    expect(sampleFestivalPlan.endDate).toBe("2026-09-05");
    expect(sampleFestivalPlan.venueAddress).toContain("여의도");
    expect(sampleFestivalPlan.expectedCapacity).toBeGreaterThanOrEqual(100000);
  });
});
