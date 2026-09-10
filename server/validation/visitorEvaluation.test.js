// @vitest-environment node
import { describe, expect, it } from "vitest";
import { evaluateVisitors } from "./visitorEvaluation.js";

const now = "2026-09-10T00:00:00Z";
function fixture() {
  return {
    actuals: [{ id: "a", festivalId: "festival", year: 2025, startDate: "2025-08-01", endDate: "2025-08-03", value: 100,
      unit: "people", measure: "cumulative_entries", scope: "event_total", geography: "venue-a",
      source: { url: "https://example.org/result", publisher: "Fixture authority", publishedAt: "2025-09-01T00:00:00Z", reviewedAt: "2026-09-01T00:00:00Z", kind: "official_result", method: "gate entries" } }],
    predictions: [{ id: "p", actualId: "a", festivalId: "festival", year: 2025, startDate: "2025-08-01", endDate: "2025-08-03", value: 120,
      unit: "people", measure: "cumulative_entries", scope: "event_total", geography: "venue-a",
      mode: "replay", generatedAt: "2026-09-01T00:00:00Z", inputCutoff: "2024-12-31T00:00:00Z", modelVersion: "test-model", inputIds: ["prior"] }],
    inputs: [{ id: "prior", year: 2024, availableAt: "2024-12-01T00:00:00Z", sourceUrl: "https://example.org/prior" }],
  };
}
const evaluate = (input) => evaluateVisitors(input, { now });

describe("visitor evaluation contracts", () => {
  it("does not admit an explicitly pending outcome after publication metadata is completed", () => {
    const input = fixture(); input.actuals[0].source.reviewStatus = "pending_basis_match";
    const report = evaluate(input);
    expect(report.accepted).toEqual([]);
    expect(report.actualIssues[0].reasons).toContain("PENDING_ACTUAL_REVIEW");
  });
  it("computes signed error, MAE, WAPE and bias without claiming prospective accuracy", () => {
    const report = evaluate(fixture());
    expect(report.groups[0]).toMatchObject({ mode: "replay", year: 2025, count: 1, mae: 20, wapePercent: 20, bias: 20, overPredictions: 1 });
    expect(report.accepted[0].error).toBe(20);
    expect(report.status).toBe("COMPARISONS_AVAILABLE");
  });
  it.each([
    ["unit", "currency"], ["measure", "unique_visitors"], ["scope", "day_total"],
    ["startDate", "2025-08-02"], ["geography", "another-venue"],
  ])("rejects mismatched %s instead of silently converting it", (field, value) => {
    const input = fixture(); input.predictions[0][field] = value;
    expect(evaluate(input).excluded[0].reasons).toContain("INCOMPARABLE_BASIS");
  });
  it("blocks target-year inputs even if they were published before the festival", () => {
    const input = fixture(); input.inputs[0].year = 2025;
    expect(evaluate(input).excluded[0].reasons).toContain("YEAR_LEAKAGE");
  });
  it("blocks a target actual ID used as an input", () => {
    const input = fixture(); input.predictions[0].inputIds = ["a"];
    expect(evaluate(input).excluded[0].reasons).toContain("TARGET_LEAKAGE");
  });
  it("blocks unavailable or post-cutoff inputs", () => {
    const input = fixture(); input.inputs[0].availableAt = "2025-01-01T00:00:00Z";
    expect(evaluate(input).excluded[0].reasons).toContain("FUTURE_INPUT");
    input.predictions[0].inputIds = ["missing"];
    expect(evaluate(input).excluded[0].reasons).toContain("MISSING_INPUT_PROVENANCE");
  });
  it("does not rebrand an after-event run as a saved pre-event forecast", () => {
    const input = fixture(); input.predictions[0].mode = "pre_event";
    expect(evaluate(input).excluded[0].reasons).toContain("NOT_PRE_EVENT");
  });
  it("keeps replay and pre-event records in separate summaries", () => {
    const input = fixture();
    input.predictions.push({ ...input.predictions[0], id: "q", mode: "pre_event", generatedAt: "2025-07-01T00:00:00Z", recordedAt: "2025-07-01T00:00:00Z", archiveReference: "archive/prediction-q.json", value: 80 });
    expect(evaluate(input).groups).toHaveLength(2);
  });
  it("excludes plans, unknown methods and unreviewed sources", () => {
    const input = fixture(); input.actuals[0].source.kind = "plan";
    input.actuals[0].source.method = ""; input.actuals[0].source.reviewedAt = null;
    expect(evaluate(input).excluded[0].reasons).toContain("UNVERIFIED_ACTUAL");
  });
  it("rejects invalid dates and non-finite or negative counts", () => {
    const input = fixture(); input.actuals[0].startDate = "2025-02-30";
    input.predictions[0].value = -1;
    expect(evaluate(input).accepted).toEqual([]);
  });
  it("reports zero denominators as null and still measures absolute error", () => {
    const input = fixture(); input.actuals[0].value = 0;
    const report = evaluate(input);
    expect(report.groups[0]).toMatchObject({ mae: 120, wapePercent: null });
    expect(report.accepted[0].absolutePercentageError).toBeNull();
  });
  it("excludes duplicate comparison keys rather than weighting a festival twice", () => {
    const input = fixture(); input.predictions.push({ ...input.predictions[0], id: "duplicate" });
    expect(evaluate(input).accepted).toEqual([]);
    expect(evaluate(input).excluded.every(row => row.reasons.includes("DUPLICATE_COMPARISON"))).toBe(true);
  });
  it("reports no comparisons instead of a zero-error success", () => {
    const input = fixture(); input.predictions = [];
    expect(evaluate(input)).toMatchObject({ status: "INSUFFICIENT_EVIDENCE", groups: [], unmatchedActualIds: ["a"] });
  });
  it("surfaces unverified actuals even when there is no matching prediction", () => {
    const input = fixture(); input.predictions = []; input.actuals[0].source.method = "unknown";
    expect(evaluate(input).actualIssues[0]).toMatchObject({ actualId: "a", reasons: ["UNVERIFIED_ACTUAL"] });
  });
  it("rejects malformed top-level input and duplicate provenance IDs", () => {
    expect(() => evaluate({})).toThrow();
    const input = fixture(); input.inputs.push({ ...input.inputs[0] });
    expect(() => evaluate(input)).toThrow(/duplicate/i);
  });
});
