import { describe, expect, it } from "vitest";
import { createFestivalCorrectionRegistry } from "./festivalCorrectionRegistry.js";

describe("festival correction registry", () => {
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
});
