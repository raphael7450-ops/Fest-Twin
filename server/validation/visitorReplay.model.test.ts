import { createHash } from "node:crypto";
import { it, expect } from "vitest";
import { sampleFestivalPlan } from "../../src/data/sampleFestivalPlan";
import { sampleTourismContext } from "../../src/data/sampleTourApi";
import { sampleTrendContext } from "../../src/data/sampleTrends";
import { createForecast } from "../../src/services/forecast";
import { buildVisitorReplay } from "./visitorReplay.js";

it("replays the production forecast deterministically with synthetic test inputs, not an accuracy claim", () => {
  const payload = { plan: { ...sampleFestivalPlan, startDate: "2025-08-01", endDate: "2025-08-03" }, tourism: sampleTourismContext, trends: sampleTrendContext };
  const provenance = { reviewStatus: "approved", year: 2024, sourceUrl: "https://example.org/synthetic-test", availableAt: "2024-12-01T00:00:00Z" };
  const actual = { id: "a", festivalId: "fixture", year: 2025, startDate: "2025-08-01", endDate: "2025-08-03", unit: "people", measure: "cumulative_entries", scope: "event_total", geography: "fixture" };
  const doc = { actuals: [actual], inputs: [
    { ...provenance, id: "snapshot", payload, sha256: createHash("sha256").update(JSON.stringify(payload)).digest("hex") },
    { ...actual, ...provenance, id: "prior", value: 100 },
  ], replayCases: [{ id: "case", actualId: "a", snapshotInputId: "snapshot", baselineInputId: "prior", inputCutoff: "2025-07-01T00:00:00Z", comparisonReview: "approved", evaluationRole: "training" }] };
  const options = { now: "2026-09-12T00:00:00Z", modelVersion: "synthetic-test" };
  const first = buildVisitorReplay(doc, createForecast, options);
  const second = buildVisitorReplay(doc, createForecast, options);
  const forecast = createForecast(payload.plan, payload.tourism, payload.trends);
  expect(first).toEqual(second);
  expect(first.excludedCases).toEqual([]);
  expect(first.document.predictions[0].value).toBe(forecast.dayTypeProfiles!.weekday.expectedDailyVisitors + 2 * forecast.dayTypeProfiles!.weekend.expectedDailyVisitors);
});
