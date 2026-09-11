import { createHash } from "node:crypto";

const DAY = 86400000;
function fail(condition, reason) { if (!condition) throw new Error(reason); }
function instant(value) {
  return typeof value === "string" && /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? Date.parse(value) : NaN;
}
function day(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value ? parsed : NaN;
}
function reviewedInput(input, cutoff, year) {
  fail(input?.reviewStatus === "approved", "INPUT_NOT_REVIEWED");
  fail(Number.isInteger(input.year) && (input.year < year || (input.year === year && input.kind === "pre_event_snapshot")), "TARGET_YEAR_INPUT");
  fail(Number.isFinite(instant(input.availableAt)) && instant(input.availableAt) <= cutoff, "INPUT_NOT_AVAILABLE");
  let url;
  try { url = new URL(input.sourceUrl); } catch { throw new Error("INPUT_SOURCE_MISSING"); }
  fail(["https:", "http:"].includes(url.protocol), "INPUT_SOURCE_MISSING");
}

/** Offline only: source review is a human contract, not proof supplied by a hash. */
export function buildVisitorReplay(document, forecastModel, { now, modelVersion } = {}) {
  fail(Number.isFinite(instant(now)) && typeof modelVersion === "string" && modelVersion.length > 0, "RUN_PROVENANCE_REQUIRED");
  fail(Array.isArray(document.inputs) && Array.isArray(document.actuals), "INVALID_DOCUMENT");
  const cases = document.replayCases ?? [];
  fail(Array.isArray(cases), "INVALID_CASES");
  const inputs = new Map(document.inputs.map(row => [row.id, row]));
  const actuals = new Map(document.actuals.map(row => [row.id, row]));
  fail(inputs.size === document.inputs.length && actuals.size === document.actuals.length, "DUPLICATE_ID");
  const predictions = [], excludedCases = [], ids = new Set();
  for (const entry of cases) {
    try {
      fail(typeof entry.id === "string" && entry.id.length > 0 && !ids.has(entry.id), "INVALID_CASE_ID");
      ids.add(entry.id);
      fail(entry.comparisonReview === "approved", "COMPARISON_NOT_REVIEWED");
      fail(["training", "holdout"].includes(entry.evaluationRole), "EVALUATION_ROLE_REQUIRED");
      const actual = actuals.get(entry.actualId);
      fail(actual, "MISSING_ACTUAL");
      const start = day(actual.startDate), end = day(actual.endDate), cutoff = instant(entry.inputCutoff);
      // Event dates are Korean civil dates. A cutoff after local midnight is not pre-event.
      fail(Number.isFinite(start) && end >= start && end - start < 366 * DAY, "INVALID_PERIOD");
      fail(Number.isFinite(cutoff) && cutoff < start - 9 * 3600000 && cutoff <= instant(now), "INVALID_CUTOFF");
      fail(actual.measure === "cumulative_entries" && actual.unit === "people", "MODEL_MEASURE_MISMATCH");
      fail(["day_total", "event_total"].includes(actual.scope) && (actual.scope !== "day_total" || start === end), "MODEL_SCOPE_MISMATCH");
      const snapshot = inputs.get(entry.snapshotInputId), prior = inputs.get(entry.baselineInputId);
      reviewedInput(snapshot, cutoff, actual.year);
      reviewedInput(prior, cutoff, actual.year);
      fail(snapshot.id !== actual.id && prior.id !== actual.id, "TARGET_LEAKAGE");
      fail(prior.year === actual.year - 1 && Number.isFinite(prior.value) && prior.value >= 0, "INVALID_PRIOR_YEAR");
      fail(["festivalId", "unit", "measure", "scope", "geography"].every(key => prior[key] === actual[key]), "BASELINE_BASIS_MISMATCH");
      const payload = snapshot.payload;
      fail(payload && createHash("sha256").update(JSON.stringify(payload)).digest("hex") === snapshot.sha256, "SNAPSHOT_HASH_MISMATCH");
      fail(payload.plan && payload.tourism && payload.trends, "MISSING_MODEL_INPUTS");
      const plan = payload.plan;
      fail(typeof plan.name === "string" && Array.isArray(plan.keywords)
        && Number.isFinite(plan.expectedCapacity) && plan.expectedCapacity > 0
        && Number.isFinite(plan.totalBudgetMillionKrw) && plan.totalBudgetMillionKrw >= 0
        && Array.isArray(plan.operatingHours) && plan.operatingHours.length > 0
        && plan.operatingHours.every(hour => Number.isInteger(hour) && hour >= 0 && hour < 24)
        && Array.isArray(plan.programs) && Array.isArray(plan.facilities)
        && Array.isArray(payload.tourism.nearbySpots) && Array.isArray(payload.tourism.similarFestivals)
        && Array.isArray(payload.trends.signals), "INCOMPLETE_SNAPSHOT");
      fail(payload.plan.startDate === actual.startDate && payload.plan.endDate === actual.endDate, "SNAPSHOT_PERIOD_MISMATCH");
      // Only the frozen input bundle is passed into the model; target counts never are.
      const frozen = structuredClone(payload);
      const forecast = forecastModel(frozen.plan, frozen.tourism, frozen.trends, frozen.demandBackdata, frozen.weather);
      let value = 0;
      for (let at = start; at <= end; at += DAY) {
        const weekday = new Date(at).getUTCDay();
        const key = weekday === 0 || weekday === 6 ? "weekend" : "weekday";
        const daily = forecast.dayTypeProfiles?.[key]?.expectedDailyVisitors;
        fail(Number.isFinite(daily) && daily >= 0, "MISSING_DAILY_FORECAST");
        value += daily;
      }
      fail(Number.isFinite(value), "NONFINITE_FORECAST");
      const basis = Object.fromEntries(["festivalId", "year", "startDate", "endDate", "unit", "measure", "scope", "geography"].map(key => [key, actual[key]]));
      const common = { ...basis, actualId: actual.id, mode: "replay", generatedAt: now, inputCutoff: entry.inputCutoff, evaluationRole: entry.evaluationRole };
      predictions.push({ ...common, id: `${entry.id}:candidate`, modelVersion, value: Math.round(value), inputIds: [snapshot.id, prior.id] });
      predictions.push({ ...common, id: `${entry.id}:baseline`, modelVersion: "prior-year-v1", value: prior.value, inputIds: [prior.id] });
    } catch (error) {
      excludedCases.push({ caseId: entry?.id ?? null, reason: error.message });
    }
  }
  return { document: { ...document, predictions }, excludedCases,
    limitations: ["Replay is not a historical pre-event forecast.", "Input and geographic review assertions need independent evidence.",
      "Weekday/weekend aggregation follows the existing model, not a measured attendance census."] };
}
