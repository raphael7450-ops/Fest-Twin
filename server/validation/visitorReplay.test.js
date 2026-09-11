// @vitest-environment node
import { createHash } from "node:crypto";
import { describe, it, expect, vi } from "vitest";
import { buildVisitorReplay } from "./visitorReplay.js";

function fixture() {
  const payload = { plan: { name: "fixture", keywords: [], startDate: "2025-08-01", endDate: "2025-08-03",
    expectedCapacity: 100, totalBudgetMillionKrw: 1, operatingHours: [10, 11], programs: [], facilities: [] },
    tourism: { nearbySpots: [], similarFestivals: [] }, trends: { signals: [] } };
  const source = { reviewStatus: "approved", sourceUrl: "https://example.org/fixture", year: 2024, availableAt: "2024-12-01T00:00:00Z" };
  return {
    actuals: [{ id: "a", festivalId: "f", year: 2025, startDate: "2025-08-01", endDate: "2025-08-03", value: 999999,
      unit: "people", measure: "cumulative_entries", scope: "event_total", geography: "g" }],
    predictions: [],
    inputs: [{ ...source, id: "snapshot", payload, sha256: createHash("sha256").update(JSON.stringify(payload)).digest("hex") },
      { ...source, id: "prior", festivalId: "f", value: 300, unit: "people", measure: "cumulative_entries", scope: "event_total", geography: "g" }],
    replayCases: [{ id: "c", actualId: "a", snapshotInputId: "snapshot", baselineInputId: "prior", inputCutoff: "2025-07-01T00:00:00Z",
      comparisonReview: "approved", evaluationRole: "holdout" }],
  };
}
const now = "2026-09-12T00:00:00Z";
const forecast = () => ({ expectedVisitors: 100, dayTypeProfiles: { weekday: { expectedDailyVisitors: 80 }, weekend: { expectedDailyVisitors: 120 } } });

describe("offline visitor replay", () => {
  it("executes frozen inputs without target outcomes and aggregates modeled days", () => {
    const fn = vi.fn(forecast), doc = fixture();
    const result = buildVisitorReplay(doc, fn, { now, modelVersion: "fixture-model" });
    expect(result.excludedCases).toEqual([]);
    expect(result.document.predictions.map(p => p.value)).toEqual([320, 300]);
    expect(fn.mock.calls[0][0]).toEqual(doc.inputs[0].payload.plan);
    expect(JSON.stringify(fn.mock.calls)).not.toContain("999999");
    expect(result.document.predictions.every(p => p.mode === "replay" && p.generatedAt === now)).toBe(true);
    expect(doc.predictions).toEqual([]);
  });
  it.each(["hash", "future", "review", "geography", "unique", "role"])("rejects %s rather than fabricating a replay", (fault) => {
    const doc = fixture();
    if (fault === "hash") doc.inputs[0].payload.plan.endDate = "2025-08-04";
    if (fault === "future") doc.inputs[0].availableAt = "2025-08-02T00:00:00Z";
    if (fault === "review") doc.replayCases[0].comparisonReview = "pending";
    if (fault === "geography") doc.inputs[1].geography = "other";
    if (fault === "unique") doc.actuals[0].measure = "unique_visitors";
    if (fault === "role") doc.replayCases[0].evaluationRole = "unknown";
    const fn = vi.fn(forecast), result = buildVisitorReplay(doc, fn, { now, modelVersion: "fixture" });
    expect(result.document.predictions).toEqual([]);
    expect(result.excludedCases).toHaveLength(1);
    expect(fn).not.toHaveBeenCalled();
  });
  it("reports missing cases without creating predictions from outcome totals", () => {
    const doc = fixture(); doc.replayCases = [];
    expect(buildVisitorReplay(doc, forecast, { now, modelVersion: "fixture" }).document.predictions).toEqual([]);
  });
  it("rejects a reviewed but incomplete snapshot rather than using model defaults", () => {
    const doc = fixture(); delete doc.inputs[0].payload.plan.expectedCapacity;
    doc.inputs[0].sha256 = createHash("sha256").update(JSON.stringify(doc.inputs[0].payload)).digest("hex");
    const fn = vi.fn(forecast);
    expect(buildVisitorReplay(doc, fn, { now, modelVersion: "fixture" }).excludedCases[0]?.reason).toBe("INCOMPLETE_SNAPSHOT");
    expect(fn).not.toHaveBeenCalled();
  });
});
