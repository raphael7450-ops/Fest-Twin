import { describe, expect, it } from "vitest";
import { sampleDemandBackdataContext } from "../data/sampleDemandBackdata";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import { sampleSpendingContext } from "../data/sampleSpending";
import { sampleTourismContext } from "../data/sampleTourApi";
import { sampleTrafficContext } from "../data/sampleTraffic";
import { sampleTrendContext } from "../data/sampleTrends";
import type { FestivalPlan, SelectedFestivalBasis } from "../domain/types";
import { getFallbackWeatherContext } from "./weatherAdapter";
import {
  createAnalysisKey,
  createFestivalAnalysisSnapshot,
  deriveFestivalId,
  normalizeAnalysisDataStatus,
  type AnalysisDatasets,
} from "./analysisSnapshot";

const selectedBasis: SelectedFestivalBasis = {
  contentId: "festival-content-42",
  title: sampleFestivalPlan.name,
  address: sampleFestivalPlan.venueAddress,
  startDate: sampleFestivalPlan.startDate,
  endDate: sampleFestivalPlan.endDate,
  sourceName: "TourAPI selected festival candidate",
};

function datasets(): AnalysisDatasets {
  return {
    tourism: {
      status: "supplemented",
      value: structuredClone(sampleTourismContext),
      sourceName: sampleTourismContext.provenance.sourceName,
    },
    trends: {
      status: "supplemented",
      value: structuredClone(sampleTrendContext),
      sourceName: sampleTrendContext.provenance.sourceName,
    },
    traffic: {
      status: "supplemented",
      value: structuredClone(sampleTrafficContext),
      sourceName: sampleTrafficContext.provenance.sourceName,
    },
    spending: {
      status: "supplemented",
      value: structuredClone(sampleSpendingContext),
      sourceName: sampleSpendingContext.sourceName,
    },
    demandBackdata: {
      status: "cached",
      value: structuredClone(sampleDemandBackdataContext),
      sourceName: "Regional festival DB",
    },
    weather: {
      status: "supplemented",
      value: getFallbackWeatherContext(),
      sourceName: "Seasonal climate sample",
    },
  };
}

describe("analysis snapshot", () => {
  it("normalizes legacy adapter statuses without presenting fallback data as live", () => {
    expect(normalizeAnalysisDataStatus("live")).toBe("live");
    expect(normalizeAnalysisDataStatus("file-normalized")).toBe("cached");
    expect(normalizeAnalysisDataStatus("partial-fallback")).toBe("supplemented");
    expect(normalizeAnalysisDataStatus("sample-fallback")).toBe("supplemented");
    expect(normalizeAnalysisDataStatus(undefined)).toBe("unavailable");
    expect(normalizeAnalysisDataStatus("rejected")).toBe("unavailable");
  });

  it("creates the same key for semantically identical inputs regardless of property order", () => {
    const reorderedPlan = Object.fromEntries(
      Object.entries(sampleFestivalPlan).reverse(),
    ) as unknown as FestivalPlan;

    expect(
      createAnalysisKey({
        plan: sampleFestivalPlan,
        selectedFestivalBasis: selectedBasis,
        selectedHour: 20,
      }),
    ).toBe(
      createAnalysisKey({
        plan: reorderedPlan,
        selectedFestivalBasis: { ...selectedBasis },
        selectedHour: 20,
      }),
    );
  });

  it("changes the key when festival identity, plan inputs, or selected hour change", () => {
    const baseline = createAnalysisKey({
      plan: sampleFestivalPlan,
      selectedFestivalBasis: selectedBasis,
      selectedHour: 20,
    });

    expect(
      createAnalysisKey({
        plan: sampleFestivalPlan,
        selectedFestivalBasis: { ...selectedBasis, contentId: "different-festival" },
        selectedHour: 20,
      }),
    ).not.toBe(baseline);
    expect(
      createAnalysisKey({
        plan: sampleFestivalPlan,
        selectedFestivalBasis: { ...selectedBasis, address: "Updated official venue" },
        selectedHour: 20,
      }),
    ).not.toBe(baseline);
    expect(
      createAnalysisKey({
        plan: { ...sampleFestivalPlan, expectedCapacity: sampleFestivalPlan.expectedCapacity + 1 },
        selectedFestivalBasis: selectedBasis,
        selectedHour: 20,
      }),
    ).not.toBe(baseline);
    expect(
      createAnalysisKey({
        plan: sampleFestivalPlan,
        selectedFestivalBasis: selectedBasis,
        selectedHour: 21,
      }),
    ).not.toBe(baseline);
  });

  it("uses candidate content ID or a plan identity that distinguishes dates and address", () => {
    expect(deriveFestivalId(sampleFestivalPlan, selectedBasis)).toBe("festival-content-42");

    const baseline = deriveFestivalId(sampleFestivalPlan);
    expect(deriveFestivalId({ ...sampleFestivalPlan, startDate: "2027-01-01" })).not.toBe(baseline);
    expect(deriveFestivalId({ ...sampleFestivalPlan, venueAddress: "Another venue" })).not.toBe(
      baseline,
    );
  });

  it("commits one immutable canonical snapshot isolated from later input mutation", () => {
    const plan = structuredClone(sampleFestivalPlan);
    const resolvedDatasets = datasets();
    const snapshot = createFestivalAnalysisSnapshot({
      plan,
      selectedFestivalBasis: selectedBasis,
      selectedHour: 20,
      datasets: resolvedDatasets,
      now: new Date("2026-08-11T00:00:00.000Z"),
    });

    plan.name = "Mutated plan";
    resolvedDatasets.tourism.value!.nearbySpots[0].name = "Mutated tourism";

    expect(snapshot.analysisId).toMatch(/^analysis_/);
    expect(snapshot.festivalId).toBe(selectedBasis.contentId);
    expect(snapshot.plan.name).toBe(sampleFestivalPlan.name);
    expect(snapshot.datasets.tourism.value?.nearbySpots[0].name).toBe(
      sampleTourismContext.nearbySpots[0].name,
    );
    expect(snapshot.report.summary).toContain(sampleFestivalPlan.name);
    expect(snapshot.metrics.summary.successPotential.score).toBe(snapshot.forecast.successScore);
    expect(snapshot.metrics.summary.successPotential.score).toBeGreaterThanOrEqual(0);
    expect(snapshot.metrics.summary.successPotential.score).toBeLessThanOrEqual(100);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.plan.programs)).toBe(true);
    expect(Object.isFrozen(snapshot.datasets.tourism.value?.nearbySpots)).toBe(true);
  });

  it("keeps deterministic analysis keys but unique IDs for separate completed commits", () => {
    const input = {
      plan: sampleFestivalPlan,
      selectedFestivalBasis: selectedBasis,
      selectedHour: 20,
      datasets: datasets(),
      now: new Date("2026-08-11T00:00:00.000Z"),
    };
    const first = createFestivalAnalysisSnapshot(input);
    const second = createFestivalAnalysisSnapshot({ ...input, datasets: datasets() });

    expect(second.analysisKey).toBe(first.analysisKey);
    expect(second.analysisId).not.toBe(first.analysisId);
  });
});
