import { describe, expect, it } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import type { FestivalPlan } from "../domain/types";
import { describeVenueArea } from "./venueAreaEvidence";

const publicDataProvenance = {
  origin: "public-data" as const,
  sourceDataset: "전국도시공원정보표준데이터" as const,
  sourceRecordId: "PARK-001",
  sourceParkName: "여의도공원",
  referenceAreaSquareMeters: 229539,
  managementOrganization: "서울특별시",
  referenceDate: "2026-01-01",
  appliedAt: "2026-08-13T12:00:00.000Z",
};

function planWith(overrides: Partial<FestivalPlan>): FestivalPlan {
  return { ...sampleFestivalPlan, ...overrides };
}

describe("describeVenueArea", () => {
  it("describes an area without provenance as user input", () => {
    const description = describeVenueArea(planWith({ venueAreaSquareMeters: 1200 }));

    expect(description.label).toBe("사용자 입력");
    expect(description.note).toContain("운영 경계");
  });

  it("describes an unchanged public-data area with its source metadata", () => {
    const description = describeVenueArea(
      planWith({ venueAreaSquareMeters: 229539, venueAreaProvenance: publicDataProvenance }),
    );

    expect(description.label).toBe("전국도시공원정보표준데이터 참고값 적용");
    expect(description.sourceParkName).toBe("여의도공원");
    expect(description.referenceDate).toBe("2026-01-01");
    expect(description.note).toContain("현장");
    expect(description.note).toContain("도면");
  });

  it("describes an adjusted public-data area as user-adjusted", () => {
    const description = describeVenueArea(
      planWith({
        venueAreaSquareMeters: 1200,
        venueAreaProvenance: { ...publicDataProvenance, origin: "user-adjusted" },
      }),
    );

    expect(description.label).toBe("공공데이터 참고 후 사용자 조정");
    expect(description.sourceParkName).toBe("여의도공원");
    expect(description.referenceDate).toBe("2026-01-01");
  });
});
