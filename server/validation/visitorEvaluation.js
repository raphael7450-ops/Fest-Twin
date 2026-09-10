const text = value => typeof value === "string" && value.trim().length > 0;
const count = value => typeof value === "number" && Number.isFinite(value) && value >= 0;
const measures = new Set(["cumulative_entries", "unique_visitors"]);
const scopes = new Set(["event_total", "day_total"]);

function date(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value ? parsed : NaN;
}

function timestamp(value) {
  return typeof value === "string" && /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? Date.parse(value) : NaN;
}

function httpUrl(value) {
  try { return ["https:", "http:"].includes(new URL(value).protocol); } catch { return false; }
}

function index(records, name) {
  if (!Array.isArray(records)) throw new TypeError(`${name} must be an array`);
  const result = new Map();
  for (const row of records) {
    if (!row || !text(row.id)) throw new TypeError(`${name}: record ID required`);
    if (result.has(row.id)) throw new TypeError(`${name}: duplicate ID ${row.id}`);
    result.set(row.id, row);
  }
  return result;
}

function validBasis(row) {
  const start = date(row.startDate), end = date(row.endDate);
  return text(row.festivalId) && Number.isInteger(row.year) && row.year === Number(row.startDate?.slice(0, 4))
    && Number.isFinite(start) && Number.isFinite(end) && end >= start
    && (row.scope !== "day_total" || start === end)
    && count(row.value) && row.unit === "people" && measures.has(row.measure)
    && scopes.has(row.scope) && text(row.geography);
}

const basisFields = ["festivalId", "year", "startDate", "endDate", "unit", "measure", "scope", "geography"];
const comparisonKey = row => JSON.stringify([...basisFields.map(key => row[key]), row.mode, row.modelVersion]);

function actualReasons(actual, nowMs) {
  const reasons = [], source = actual.source ?? {};
  if (source.reviewStatus !== undefined && source.reviewStatus !== "approved") reasons.push("PENDING_ACTUAL_REVIEW");
  const published = timestamp(source.publishedAt), reviewed = timestamp(source.reviewedAt);
  if (!validBasis(actual)) reasons.push("INVALID_ACTUAL");
  if (!(date(actual.endDate) + 86400000 <= nowMs)) reasons.push("EVENT_NOT_FINISHED");
  if (source.kind !== "official_result" || !httpUrl(source.url) || !text(source.publisher)
    || !text(source.method) || source.method === "unknown" || !Number.isFinite(published)
    || !(published >= date(actual.endDate) + 86400000 && published <= reviewed && reviewed <= nowMs)) reasons.push("UNVERIFIED_ACTUAL");
  return reasons;
}

/** Offline evaluation only. Provenance must be reviewed separately; metadata is not an authenticity signature. */
export function evaluateVisitors(document, { now = new Date().toISOString() } = {}) {
  const nowMs = timestamp(now);
  if (!Number.isFinite(nowMs)) throw new TypeError("A timezone-qualified evaluation timestamp is required");
  const actuals = index(document.actuals, "actuals");
  const predictions = index(document.predictions, "predictions");
  const inputs = index(document.inputs, "inputs");
  const frequencies = new Map();
  for (const p of predictions.values()) frequencies.set(comparisonKey(p), (frequencies.get(comparisonKey(p)) ?? 0) + 1);
  const accepted = [], excluded = [];
  for (const p of predictions.values()) {
    const reasons = [];
    const actual = actuals.get(p.actualId);
    if (!actual) reasons.push("MISSING_ACTUAL");
    if (!validBasis(p)) reasons.push("INVALID_PREDICTION");
    if (frequencies.get(comparisonKey(p)) > 1) reasons.push("DUPLICATE_COMPARISON");
    const start = date(p.startDate);
    const generated = timestamp(p.generatedAt), cutoff = timestamp(p.inputCutoff);
    if (!text(p.modelVersion) || !Number.isFinite(generated) || generated > nowMs
      || !Number.isFinite(cutoff) || cutoff >= start || cutoff > generated) reasons.push("INVALID_PREDICTION_PROVENANCE");
    if (!["replay", "pre_event"].includes(p.mode)) reasons.push("INVALID_MODE");
    if (p.mode === "pre_event") {
      const recorded = timestamp(p.recordedAt);
      if (!(generated < start && recorded >= generated && recorded < start) || !text(p.archiveReference)) reasons.push("NOT_PRE_EVENT");
    }
    if (actual) {
      reasons.push(...actualReasons(actual, nowMs));
      if (basisFields.some(key => actual[key] !== p[key])) reasons.push("INCOMPARABLE_BASIS");
    }
    if (!Array.isArray(p.inputIds) || !p.inputIds.length) reasons.push("MISSING_INPUT_PROVENANCE");
    else for (const id of p.inputIds) {
      if (id === p.actualId) reasons.push("TARGET_LEAKAGE");
      const input = inputs.get(id);
      if (!input || !httpUrl(input.sourceUrl)) { reasons.push("MISSING_INPUT_PROVENANCE"); continue; }
      if (!Number.isInteger(input.year) || input.year >= p.year) reasons.push("YEAR_LEAKAGE");
      if (!Number.isFinite(timestamp(input.availableAt)) || timestamp(input.availableAt) > cutoff) reasons.push("FUTURE_INPUT");
    }
    if (reasons.length) {
      excluded.push({ predictionId: p.id, actualId: p.actualId ?? null, reasons: [...new Set(reasons)] });
      continue;
    }
    const error = p.value - actual.value;
    accepted.push({ predictionId: p.id, actualId: actual.id, festivalId: p.festivalId, year: p.year,
      mode: p.mode, modelVersion: p.modelVersion, measure: p.measure, scope: p.scope,
      predicted: p.value, actual: actual.value, error, absoluteError: Math.abs(error),
      absolutePercentageError: actual.value === 0 ? null : Math.abs(error) / actual.value * 100,
      sourceUrl: actual.source.url });
  }
  // Never pool replay runs, measurement definitions or model versions into an apparent accuracy score.
  const grouped = new Map();
  for (const row of accepted) {
    const key = JSON.stringify([row.mode, row.modelVersion, row.year, row.measure, row.scope]);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }
  const groups = [...grouped.values()].map(rows => {
    const first = rows[0], n = rows.length;
    const totalActual = rows.reduce((sum, row) => sum + row.actual, 0);
    const absoluteError = rows.reduce((sum, row) => sum + row.absoluteError, 0);
    return { mode: first.mode, modelVersion: first.modelVersion, year: first.year, measure: first.measure, scope: first.scope,
      count: n, mae: absoluteError / n, bias: rows.reduce((sum, row) => sum + row.error, 0) / n,
      wapePercent: totalActual === 0 ? null : absoluteError / totalActual * 100,
      overPredictions: rows.filter(row => row.error > 0).length,
      underPredictions: rows.filter(row => row.error < 0).length,
      exactPredictions: rows.filter(row => row.error === 0).length };
  });
  const referenced = new Set([...predictions.values()].map(row => row.actualId));
  return { schemaVersion: 1, evaluatedAt: now, status: accepted.length ? "COMPARISONS_AVAILABLE" : "INSUFFICIENT_EVIDENCE",
    accepted, excluded, groups, unmatchedActualIds: [...actuals.keys()].filter(id => !referenced.has(id)),
    actualIssues: [...actuals.values()].map(actual => ({ actualId: actual.id, reasons: actualReasons(actual, nowMs) })).filter(row => row.reasons.length),
    limitations: ["Comparisons are not a reliability certification.", "Pre-event archive references require independent authenticity review.",
      "Only declared input provenance can be checked; undeclared leakage is not detectable.",
      "Official visitor estimates may differ from audited unique-person counts."] };
}
