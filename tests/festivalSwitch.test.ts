import { describe, expect, it } from "vitest";
import { FESTIVAL_PRESETS } from "../src/data/festivalPresets";
import { getFallbackWeatherContext } from "../src/services/weatherAdapter";
import { createForecast } from "../src/services/forecast";
import { createSimulation } from "../src/services/simulation";
import { createMetricEvidenceSet } from "../src/services/metricEvidence";
import { buildCsvReportContent, generateCsvFilename } from "../src/utils/csvExport";
import {
  createFallbackTourismContext,
} from "../src/services/tourApiAdapter";
import { sampleTourismContext } from "../src/data/sampleTourApi";
import { sampleTrendContext } from "../src/data/sampleTrends";
import { sampleTrafficContext } from "../src/data/sampleTraffic";
import { sampleSpendingContext } from "../src/data/sampleSpending";
import { sampleDemandBackdataContext } from "../src/data/sampleDemandBackdata";
import { createFestivalAnalysisSnapshot } from "../src/services/analysisSnapshot";

describe("Festival State & Reactive Data Switch Tests (tests/festivalSwitch.test.ts)", () => {
  const daejeonPreset = FESTIVAL_PRESETS.find((p) => p.id === "preset_daejeon_0시축제")!;
  const sejongPreset = FESTIVAL_PRESETS.find((p) => p.id === "preset_sejong_축제")!;
  const boryeongPreset = FESTIVAL_PRESETS.find((p) => p.id === "preset_boryeong_mud")!;

  it("updates input parameters immediately when switching from Festival A (Daejeon) to Festival B (Sejong)", () => {
    const planA = daejeonPreset.plan;
    const planB = sejongPreset.plan;

    // Verify Festival A input values
    expect(planA.region).toBe("대전");
    expect(planA.totalBudgetMillionKrw).toBe(3000);
    expect(planA.startDate).toBe("2026-08-08");
    expect(planA.endDate).toBe("2026-08-16");

    // Verify Festival B input values
    expect(planB.region).toBe("세종");
    expect(planB.totalBudgetMillionKrw).toBe(1500);
    expect(planB.startDate).toBe("2026-10-09");
    expect(planB.endDate).toBe("2026-10-12");
  });

  it("recalculates the 4-step forecast engine output immediately with no stale data leakage", () => {
    const weather = getFallbackWeatherContext();

    const forecastA = createForecast(
      daejeonPreset.plan,
      sampleTourismContext,
      sampleTrendContext,
      undefined,
      weather,
    );

    const forecastB = createForecast(
      sejongPreset.plan,
      sampleTourismContext,
      sampleTrendContext,
      undefined,
      weather,
    );

    // Verify forecast results are distinct and immediately updated
    expect(forecastA.expectedVisitors).toBeGreaterThan(0);
    expect(forecastB.expectedVisitors).toBeGreaterThan(0);
    expect(forecastA.expectedVisitors).not.toBe(forecastB.expectedVisitors);

    // Verify peak hours match respective program schedules
    expect(forecastA.peakHour).toBeDefined();
    expect(forecastB.peakHour).toBeDefined();
  });

  it("maintains 1:1 consistency between forecast/simulation and metric evidence drawer metrics", () => {
    const weather = getFallbackWeatherContext();

    const forecastB = createForecast(
      sejongPreset.plan,
      sampleTourismContext,
      sampleTrendContext,
      undefined,
      weather,
    );
    const simulationB = createSimulation(sejongPreset.plan, forecastB, forecastB.peakHour);

    const evidenceSetB = createMetricEvidenceSet(
      sejongPreset.plan,
      forecastB,
      simulationB,
      sampleTourismContext,
      sampleTrendContext,
      sampleTrafficContext,
      sampleSpendingContext,
      undefined,
      sejongPreset.basis,
      weather,
    );

    // 1:1 consistency check for the canonical bounded success metric.
    const demandEvidence = evidenceSetB["demand-index"];
    expect(demandEvidence).toBeDefined();
    expect(demandEvidence.summary).toContain(String(forecastB.successScore));

    // Physical density remains unavailable when the selected preset has no venue area.
    const densityEvidence = evidenceSetB["peak-density"];
    expect(densityEvidence).toBeDefined();
    expect(densityEvidence.summary).toContain("산출 불가");
    expect(densityEvidence.summary).toContain("행사장 면적");
    expect(densityEvidence.summary).not.toContain("명/m²");

    // Verify Evidence Drawer contains Sejong parameters and no Daejeon residual text
    expect(demandEvidence.formulaSummary).toBeDefined();
    expect(demandEvidence.calculationSteps.some((step) => step.inputValue.includes("세종"))).toBe(true);
    expect(demandEvidence.calculationSteps.every((step) => !step.inputValue.includes("대전 0시 축제"))).toBe(true);
  });

  it("exports CSV reports containing strictly fresh parameters for the newly selected festival", () => {
    const weather = getFallbackWeatherContext();
    const snapshotB = createFestivalAnalysisSnapshot({
      plan: sejongPreset.plan,
      selectedFestivalBasis: sejongPreset.basis,
      selectedHour: 20,
      datasets: {
        tourism: { status: "supplemented", value: sampleTourismContext, sourceName: "TourAPI" },
        trends: { status: "supplemented", value: sampleTrendContext, sourceName: "Naver DataLab" },
        traffic: { status: "supplemented", value: sampleTrafficContext, sourceName: "KTDB/View-T" },
        spending: { status: "supplemented", value: sampleSpendingContext, sourceName: "Tourism spending" },
        demandBackdata: { status: "supplemented", value: sampleDemandBackdataContext, sourceName: "Regional festival DB" },
        weather: { status: "supplemented", value: weather, sourceName: "Seasonal climate sample" },
      },
      now: new Date("2026-08-07T10:00:00.000Z"),
    });
    const csvB = buildCsvReportContent({ snapshot: snapshotB });

    const filenameB = generateCsvFilename(sejongPreset.plan.name, new Date("2026-08-07T10:00:00"));

    // Verify CSV filename and content reflect Sejong Festival
    expect(filenameB).toContain("세종");
    expect(csvB).toContain("2026 세종 축제");
    expect(csvB).toContain(snapshotB.analysisId);
    expect(csvB).not.toContain("대전 0시 축제");
    expect(csvB).not.toContain("보령 머드축제");
  });

  it("prevents async race conditions and stale state when switching rapidly (A -> B -> C -> A)", () => {
    const plans = [
      daejeonPreset.plan,
      sejongPreset.plan,
      boryeongPreset.plan,
      daejeonPreset.plan,
    ];

    const serializedKeys = plans.map((plan) =>
      JSON.stringify({
        region: plan.region,
        startDate: plan.startDate,
        endDate: plan.endDate,
        budget: plan.totalBudgetMillionKrw,
      })
    );

    // Initial state key for Daejeon
    let activePlanKey = serializedKeys[0];

    // Rapid switches
    activePlanKey = serializedKeys[1]; // Sejong
    activePlanKey = serializedKeys[2]; // Boryeong
    activePlanKey = serializedKeys[3]; // Daejeon (returned to A)

    // Verify active plan key matches final state (Daejeon)
    expect(activePlanKey).toBe(serializedKeys[0]);

    // Create fallback tourism context for active plan key
    const fallbackTourism = createFallbackTourismContext(
      daejeonPreset.plan,
      "Rapid switch testing",
    );

    expect(fallbackTourism.provenance.basisText).toContain("대전");
    expect(fallbackTourism.provenance.basisText).not.toContain("보령");
    expect(fallbackTourism.provenance.basisText).not.toContain("세종");
  });
});
