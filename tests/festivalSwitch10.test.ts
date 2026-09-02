import { describe, expect, it } from "vitest";
import { FESTIVAL_PRESETS } from "../src/data/festivalPresets";
import { getFallbackWeatherContext } from "../src/services/weatherAdapter";
import { convertLatLonToGrid } from "../server/weatherProxy.js";
import { createForecast } from "../src/services/forecast";
import { createSimulation } from "../src/services/simulation";
import { createMetricEvidenceSet } from "../src/services/metricEvidence";
import { buildCsvReportContent } from "../src/utils/csvExport";
import { createSummaryKpiMetrics } from "../src/services/impactMetrics";
import { createSafetyDecisionProfiles } from "../src/services/safetyDecisionMetrics";
import { sampleTourismContext } from "../src/data/sampleTourApi";
import { sampleTrendContext } from "../src/data/sampleTrends";
import { sampleTrafficContext } from "../src/data/sampleTraffic";
import { sampleSpendingContext } from "../src/data/sampleSpending";
import { sampleDemandBackdataContext } from "../src/data/sampleDemandBackdata";
import { createFestivalAnalysisSnapshot } from "../src/services/analysisSnapshot";

describe("10 Representative Festivals Switching & Data Integrity Tests (tests/festivalSwitch10.test.ts)", () => {
  it("contains exactly 10 diverse nationwide representative festival presets", () => {
    expect(FESTIVAL_PRESETS.length).toBe(10);
    const regions = new Set(FESTIVAL_PRESETS.map((p) => p.region));
    expect(regions.size).toBeGreaterThanOrEqual(7);
  });

  FESTIVAL_PRESETS.forEach((preset, index) => {
    describe(`Festival [${index + 1}/10]: ${preset.name} (${preset.region})`, () => {
      const plan = preset.plan;
      const basis = preset.basis;
      const weather = getFallbackWeatherContext();

      it("verifies plan parameter integrity and coordinates", () => {
        expect(plan.name).toBeDefined();
        expect(plan.region).toBe(preset.region);
        expect(plan.totalBudgetMillionKrw).toBeGreaterThan(0);
        expect(plan.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(plan.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(plan.venueCoordinates?.latitude).toBeGreaterThan(33.0);
        expect(plan.venueCoordinates?.longitude).toBeGreaterThan(124.0);
      });

      it("converts latitude/longitude to valid KMA weather grid coordinates (nx, ny)", () => {
        const lat = plan.venueCoordinates?.latitude ?? 37.5;
        const lon = plan.venueCoordinates?.longitude ?? 127.0;
        const grid = convertLatLonToGrid(lat, lon);

        expect(Number.isInteger(grid.nx)).toBe(true);
        expect(Number.isInteger(grid.ny)).toBe(true);
        expect(grid.nx).toBeGreaterThan(0);
        expect(grid.ny).toBeGreaterThan(0);
      });

      it("computes 4-step AI forecast and produces non-zero realistic metrics", () => {
        const forecast = createForecast(plan, sampleTourismContext, sampleTrendContext, undefined, weather);

        expect(forecast.expectedVisitors).toBeGreaterThan(0);
        expect(forecast.peakHour).toBeGreaterThanOrEqual(0);
        expect(forecast.peakHour).toBeLessThanOrEqual(24);
        expect(forecast.successScore).toBeGreaterThanOrEqual(0);
        expect(forecast.successScore).toBeLessThanOrEqual(100);
        expect(forecast.visitorsByHour.length).toBeGreaterThan(0);
      });

      it("computes spatial crowd simulation and safe capacity limits", () => {
        const forecast = createForecast(plan, sampleTourismContext, sampleTrendContext, undefined, weather);
        const simulation = createSimulation(plan, forecast, forecast.peakHour);

        expect(simulation.cells.length).toBeGreaterThan(0);
        expect(simulation.congestionScore).toBeGreaterThanOrEqual(0);
        expect(simulation.congestionScore).toBeLessThanOrEqual(100);
      });

      it("computes 4 core KPIs and safety decision metrics", () => {
        const forecast = createForecast(plan, sampleTourismContext, sampleTrendContext, undefined, weather);
        const simulation = createSimulation(plan, forecast, forecast.peakHour);
        const kpi = createSummaryKpiMetrics(plan, forecast, simulation, sampleTourismContext);
        const safetyProfiles = createSafetyDecisionProfiles(plan, forecast, simulation);

        expect(kpi.successPotential.score).toBeGreaterThanOrEqual(0);
        expect(kpi.successPotential.score).toBeLessThanOrEqual(100);
        expect(kpi.capacityPressure.ratio).toBeGreaterThanOrEqual(0);
        expect(safetyProfiles.summary.staffing.recommended).toBeGreaterThan(0);
        expect(safetyProfiles.summary.medicalStaff.value).toBeGreaterThan(0);
      });

      it("generates clean metric evidence and B2G CSV snapshot without cross-festival contamination", () => {
        const forecast = createForecast(plan, sampleTourismContext, sampleTrendContext, undefined, weather);
        const simulation = createSimulation(plan, forecast, forecast.peakHour);
        const evidenceSet = createMetricEvidenceSet(
          plan,
          forecast,
          simulation,
          sampleTourismContext,
          sampleTrendContext,
          sampleTrafficContext,
          sampleSpendingContext,
          undefined,
          basis,
          weather
        );

        const demandEvidence = evidenceSet["demand-index"];
        expect(demandEvidence).toBeDefined();
        expect(demandEvidence.summary).toBeDefined();

        const snapshot = createFestivalAnalysisSnapshot({
          plan,
          selectedFestivalBasis: basis,
          selectedHour: forecast.peakHour,
          datasets: {
            tourism: { status: "supplemented", value: sampleTourismContext, sourceName: "TourAPI" },
            trends: { status: "supplemented", value: sampleTrendContext, sourceName: "Naver DataLab" },
            traffic: { status: "supplemented", value: sampleTrafficContext, sourceName: "KTDB/View-T" },
            spending: { status: "supplemented", value: sampleSpendingContext, sourceName: "Tourism spending" },
            demandBackdata: { status: "supplemented", value: sampleDemandBackdataContext, sourceName: "Regional festival DB" },
            weather: { status: "supplemented", value: weather, sourceName: "Seasonal climate sample" },
          },
          now: new Date(),
        });

        const csv = buildCsvReportContent({ snapshot });
        expect(csv).toContain(plan.name);
        expect(csv).toContain(snapshot.analysisId);
      });
    });
  });
});
