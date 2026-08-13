import { beforeEach, describe, expect, it } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import type { SelectedFestivalBasis, VenueAreaProvenance } from "../domain/types";
import {
  clearScenarios,
  loadScenarios,
  normalizeFestivalPlan,
  saveScenario,
} from "./scenarioStorage";

const selectedFestivalBasis: SelectedFestivalBasis = {
  contentId: "3439947",
  title: "Gangnam Media Winter Festa",
  address: "Seoul Gangnam-gu Yeongdong-daero 511",
  startDate: "2025-12-19",
  endDate: "2026-01-03",
  mapX: "127.0610512042",
  mapY: "37.5103955843",
  sourceName: "TourAPI selected festival candidate",
};

const venueAreaProvenance: VenueAreaProvenance = {
  origin: "public-data",
  sourceDataset: "전국도시공원정보표준데이터",
  sourceRecordId: "PARK-001",
  sourceParkName: "여의도공원",
  referenceAreaSquareMeters: 229539,
  managementOrganization: "서울특별시",
  referenceDate: "2026-01-01",
  appliedAt: "2026-08-13T12:00:00.000Z",
};

describe("scenarioStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores and loads festival planning scenarios", () => {
    const scenario = saveScenario(sampleFestivalPlan, 20);

    expect(scenario.name).toContain(sampleFestivalPlan.name);
    expect(scenario.selectedHour).toBe(20);
    expect(loadScenarios()).toHaveLength(1);
    expect(loadScenarios()[0].plan.totalBudgetMillionKrw).toBe(sampleFestivalPlan.totalBudgetMillionKrw);
  });

  it("stores and loads the selected TourAPI festival basis", () => {
    const scenario = saveScenario(sampleFestivalPlan, 20, selectedFestivalBasis);

    expect(scenario.selectedFestivalBasis).toEqual(selectedFestivalBasis);
    expect(loadScenarios()[0].selectedFestivalBasis).toEqual(selectedFestivalBasis);
  });

  it("clears saved scenarios", () => {
    saveScenario(sampleFestivalPlan, 20);
    clearScenarios();

    expect(loadScenarios()).toEqual([]);
  });

  it("keeps only finite venue coordinates within geographic bounds", () => {
    const validPlan = normalizeFestivalPlan({
      ...sampleFestivalPlan,
      venueCoordinates: { latitude: 37.5284, longitude: 126.9348, source: "tourapi" },
    });
    const invalidPlan = normalizeFestivalPlan({
      ...sampleFestivalPlan,
      venueCoordinates: { latitude: 91, longitude: 126.9348, source: "tourapi" },
    });
    const invalidLongitudePlan = normalizeFestivalPlan({
      ...sampleFestivalPlan,
      venueCoordinates: { latitude: 37.5284, longitude: 181, source: "tourapi" },
    });

    expect(validPlan.venueCoordinates).toEqual({
      latitude: 37.5284,
      longitude: 126.9348,
      source: "tourapi",
    });
    expect(invalidPlan.venueCoordinates).toBeUndefined();
    expect(invalidLongitudePlan.venueCoordinates).toBeUndefined();
  });

  it("keeps only finite positive venue measurements", () => {
    const plan = normalizeFestivalPlan({
      ...sampleFestivalPlan,
      venueAreaSquareMeters: 1200,
      totalExitWidthMeters: 0,
      evacuationDistanceMeters: Number.POSITIVE_INFINITY,
    });

    expect(plan.venueAreaSquareMeters).toBe(1200);
    expect(plan.totalExitWidthMeters).toBeUndefined();
    expect(plan.evacuationDistanceMeters).toBeUndefined();
  });

  it("preserves valid venue area provenance when normalizing a saved plan", () => {
    const plan = normalizeFestivalPlan({
      ...sampleFestivalPlan,
      venueAreaSquareMeters: 1200,
      venueAreaProvenance,
    });

    expect(plan.venueAreaProvenance).toEqual(venueAreaProvenance);
  });

  it("discards malformed venue area provenance", () => {
    const plan = normalizeFestivalPlan({
      ...sampleFestivalPlan,
      venueAreaProvenance: {
        ...venueAreaProvenance,
        origin: "unknown",
        referenceAreaSquareMeters: 0,
        referenceDate: "not-a-date",
        appliedAt: "2026-08-13",
      },
    });

    expect(plan.venueAreaProvenance).toBeUndefined();
  });

  it("discards venue area provenance with an overlong metadata string", () => {
    const plan = normalizeFestivalPlan({
      ...sampleFestivalPlan,
      venueAreaProvenance: {
        ...venueAreaProvenance,
        sourceParkName: "x".repeat(201),
      },
    });

    expect(plan.venueAreaProvenance).toBeUndefined();
  });

  it("discards provenance with an invalid calendar date or date-time", () => {
    for (const field of ["referenceDate", "appliedAt"] as const) {
      const plan = normalizeFestivalPlan({
        ...sampleFestivalPlan,
        venueAreaProvenance: {
          ...venueAreaProvenance,
          [field]: field === "referenceDate" ? "2026-02-31" : "2026-02-31T12:00:00.000Z",
        },
      });

      expect(plan.venueAreaProvenance).toBeUndefined();
    }
  });

  it("discards provenance from a dataset other than the National City Park dataset", () => {
    const plan = normalizeFestivalPlan({
      ...sampleFestivalPlan,
      venueAreaProvenance: {
        ...venueAreaProvenance,
        sourceDataset: "another-dataset",
      },
    });

    expect(plan.venueAreaProvenance).toBeUndefined();
  });

  it("loads a legacy saved scenario with an area but no provenance", () => {
    localStorage.setItem(
      "fest-twin-scenarios",
      JSON.stringify([
        {
          id: "legacy-scenario",
          name: "Legacy scenario",
          savedAt: "2026-01-01T00:00:00.000Z",
          selectedHour: 20,
          plan: { ...sampleFestivalPlan, venueAreaSquareMeters: 1800 },
        },
      ]),
    );

    const [scenario] = loadScenarios();

    expect(scenario.plan.venueAreaSquareMeters).toBe(1800);
    expect(scenario.plan.venueAreaProvenance).toBeUndefined();
    expect(JSON.parse(localStorage.getItem("fest-twin-scenarios")!)[0].plan.venueAreaProvenance).toBeUndefined();
  });
});
