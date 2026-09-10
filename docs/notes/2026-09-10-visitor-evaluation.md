# Visitor Forecast Validation

## Scope

An offline, read-only evaluation layer has been added. It does not change the live forecast, coefficients, regional database, API responses, or dashboard. Run it locally or inside the application container:

```sh
npm run validate:visitors
npm run validate:visitors -- data/visitor_evaluation.json reports/visitor_evaluation.json
```

Exit 0 means at least one comparable pair exists, not that the model is accurate. Exit 2 means insufficient evidence. Exit 1 indicates an invalid document or execution failure. Reports are written with a temporary file and rename; malformed inputs do not replace an existing report.

## Initial Finding

The regional database describes its source as normalized 2022-2026 festival **planning** spreadsheets. A visitor count in this file is not automatically an observed result. In particular, record `mcst-52c6a1326087bc` has 2,008,240 visitors for the 2025 Daejeon Zero Festival and cites `2025년 지역축제 개최계획 현황(0321).xlsx`.

[Daejeon City's post-event announcement](https://tv.daejeon.go.kr/mobile/vodView.do?ccode=001000000000&ocode=20250821050743689), published August 21, 2025, reports approximately 2.16 million visitors. [The city schedule](https://www.daejeon.go.kr/drh/board/boardNormalView.do?boardId=normal_0189&menuSeq=1632&ntatcSeq=1487728646&pageIndex=18) specifies August 8-16, 2025. The announcement does not establish the counting method or deduplication basis, so the new evidence ledger retains `measure: unknown` and `method: unknown`. It cannot enter error statistics yet. Publication time is unavailable; the ledger explicitly records an end-of-publication-day bound.

No archived pre-event model prediction with matching scope and verified input vintage has been established in this work. The difference between a planning spreadsheet value and the city announcement is **not** a measured model error. The initial report therefore correctly contains no accepted pairs and no accuracy percentage. Test fixtures are synthetic and never inserted into the real evidence ledger.

## Evidence Contract

Input JSON contains three arrays: `actuals`, `predictions`, and `inputs`. Each record has a unique nonempty `id` within its array.

Actuals require `festivalId`, `year`, ISO `startDate`/`endDate`, finite nonnegative `value`, `unit: people`, `measure: cumulative_entries` or `unique_visitors`, `scope: event_total` or `day_total`, and an explicit `geography` identifier. `day_total` must cover exactly one date. Source metadata requires an HTTP(S) `url`, `publisher`, `kind: official_result`, documented `method`, and timezone-qualified `publishedAt` and `reviewedAt`. Unknown methods, plans, invalid dates, unfinished events and unreviewed results are excluded. Unmatched actuals and their evidence defects remain visible in the report.

Predictions repeat exactly the same identity, period, unit, measure, scope and geography. They also require `actualId`, `modelVersion`, `generatedAt`, `inputCutoff`, nonempty `inputIds`, and `mode: replay` or `pre_event`. Pre-event records additionally require a `recordedAt` before the event and an `archiveReference`. These metadata fields do not authenticate an archive; a human must verify the immutable source independently. A run made today for a past event must be marked replay, and cannot be described as prospective accuracy.

Input provenance records contain `id`, integer `year`, `availableAt`, and `sourceUrl`. The conservative first evaluation supports annual holdouts: every referenced input must have a year strictly earlier than the target event year and be available before `inputCutoff`. The cutoff must precede the event and not follow prediction generation. The target actual's own ID is forbidden as an input. The caller must include **all** relevant model/calibration inputs, not just a selected subset. Undeclared leakage and falsified metadata cannot be detected automatically.

There is no automatic conversion of daily forecasts, peak concurrent occupants or cumulative event entries. In particular, `ForecastResult.expectedVisitors` is used to allocate hourly arrivals in the existing model; it must not be blindly relabeled as an entire multi-day event total.

## Statistics

For every accepted pair, signed error is predicted minus actual. MAE is mean absolute error; positive bias indicates overestimation. WAPE is 100 times the sum of absolute errors divided by the sum of actuals, not a mean of percentages. Actual zero yields null percentage error; an all-zero group yields null WAPE. Over-, under- and exact-prediction counts are reported.

Statistics are separated by mode, model version, event year, measurement and period scope. Duplicate comparisons within a model/mode are excluded rather than silently weighting one festival more heavily. Small samples are not promoted to a confidence score, and no automatic model adjustment occurs.

## Remaining Evidence Work

1. Obtain the counting methodology and venue boundary for reported actuals.
2. Register authentic archived forecasts, or reconstruct explicitly labeled historical runs with complete pre-cutoff inputs.
3. Add further festivals and years with compatible definitions; inspect both error and directional bias.
4. Only after an untouched holdout evaluation should forecast calibration be proposed.

## Automatic Archive Follow-up

Committed browser snapshots now submit plan, forecast and dataset inputs to `/api/forecast-archive`. Capture runs separately from the analysis; a failed capture does not invalidate the forecast. One bounded retry is attempted. Selecting a different analysis invalidates old UI responses. The server ignores browser timestamps and uses Korea midnight at the event start to distinguish pre-event receipt from after-start receipt.

The server sanitizes credentials, caps snapshots at 128 KiB and stores up to 1,000 distinct payloads. SHA-256 IDs deduplicate identical sanitized payloads; create-if-absent hard links prevent replacement. A receipt includes server release, server timestamp and HMAC authentication. File and directory fsync protect committed writes on Linux. Tampering is checked when reading receipts; the public summary can be cached for up to 60 seconds. Existing files are never purged automatically. Operators must archive/expand storage when the quota fills.

These are **client-reported, unverified** predictions, not server-recomputed forecasts. Exact Origin allowlisting and request limits reduce browser abuse but do not authenticate a caller. Server HMAC detects content changes without the secret; it is not an external timestamp, WORM backup, anti-deletion mechanism or proof against a privileged server administrator. Two independently deployed writers are not supported for quota accounting. The page does not poll in the background: it captures when an analysis snapshot changes and refreshes status afterward.

`scripts/deploy-forecast-archive.sh REVISION EXPECTED_IMAGE` keeps receipts under `/home/cwuser/fest-twin-state/forecast-archive`, outside releases, and mounts an existing persistent signing key read-only. It preserves the original runtime environment file. The key must be backed up privately with the receipt store; replacing it makes old signatures unverifiable. The deployment script creates a key only when none exists. Old deployment scripts that lack these mounts must not be used for subsequent releases.

The dashboard now shows capture status, whole-server archived and pre-event counts, comparable pairs, evidence defects, and grouped errors from the trusted local evidence ledger. Archive counts never become accuracy percentages. The outcome ledger is not editable through a public endpoint.

## Additional Outcome Review

[Gunsan City's 2025 evaluation report](https://www.gunsan.go.kr/_cms/board/eFileDownload/359/9828373/73f49bc164b896c7a4c2c1bd8b393c49) was downloaded and page 113 (PDF page 115) was visually checked. Four entry points were measured on October 10-11 between 11:00 and 20:00. Its 134,597 total extrapolates one weekday count and three weekend-equivalent counts across the October 9-12 event. This is not an audited count of unique people. The ledger records the method, location reference, original document SHA-256 and extrapolation caveat. Exact publication time and compatibility with model geography are still unresolved, so it remains excluded. No valid historical model prediction has been invented to force a comparison.

Remaining work requires evidence, not a code bypass: verify release-specific browser inputs/model outputs, confirm comparable visit definitions and publication dates, match completed events to preserved forecasts, and evaluate an untouched holdout before calibration. The new archive starts collecting now; it cannot create authentic records from before deployment.
