# Task 6 Completion Fix Report

## Scope

Completed the dwell-aware evidence contract across the screen report and B2G print report, corrected two stale zero-area test fixtures, and preserved the existing visitor-flow summary regression test with a typed fixture.

## Root Cause Verification

- `B2gPrintReport` did not render dwell profile, source, average dwell, peak occupancy, or peak departures.
- `ReportView` already rendered profile label, average dwell, and peak occupancy, but omitted profile source and peak departures.
- `tests/dataSanity.test.ts` inherited `sampleFestivalPlan.venueAreaSquareMeters = 100000`, causing physical density to be available instead of unavailable.
- `tests/festivalSwitch.test.ts` inherited `sejongPreset.plan.venueAreaSquareMeters = 80000`, causing density evidence to be available instead of unavailable.

## TDD Evidence

### RED

Command:

```text
npm test -- --run src/components/B2gPrintReport.test.tsx src/components/ReportView.test.tsx
```

Result: failed as expected.

- B2G test could not find `검증용 체류 프로필`, confirming the print report omitted dwell-aware evidence.
- ReportView test could not find `출처: 검증 체류 데이터`, confirming the screen report omitted profile source; peak departure assertions remained unreachable after that failure.

Fixture-root-cause confirmation command:

```text
npm test -- --run tests/dataSanity.test.ts tests/festivalSwitch.test.ts
```

Result: failed as expected.

- `dataSanity` received `peakDensity.status = available` rather than `unavailable`.
- `festivalSwitch` received `피크 방문객과 사용자 입력 행사장 면적으로 물리 밀도 0.82명/m²를 산출했습니다.` rather than unavailable-density evidence.

### GREEN

Command:

```text
npm test -- --run src/components/B2gPrintReport.test.tsx src/components/ReportView.test.tsx src/services/visitorOccupancy.test.ts tests/dataSanity.test.ts tests/festivalSwitch.test.ts
```

Result: 5 test files passed, 32 tests passed.

## Implementation

- `src/components/B2gPrintReport.tsx`
  - Uses `forecast.dwellProfile ?? selectDwellProfile(plan)` and `summarizeVisitorFlow(forecast)`.
  - Adds compact Step 1 rows for profile label/source, average dwell, peak concurrent occupancy, and peak departures without adding a page.
- `src/components/ReportView.tsx`
  - Adds source name to the existing dwell-profile KPI and a compact peak-departures KPI using the shared flow summary.
- `src/components/B2gPrintReport.test.tsx` and `src/components/ReportView.test.tsx`
  - Add snapshot-contract tests using the same literal profile/source/dwell/peak values.
- `tests/dataSanity.test.ts` and `tests/festivalSwitch.test.ts`
  - Set area and area provenance to `undefined` only for the plan instances testing unavailable density.
- `src/services/visitorOccupancy.test.ts`
  - Retains the existing summary regression test and replaces `as any` with a complete `ForecastResult` fixture.
- `docs/CHANGELOG.md`
  - Documents report/print consistency and fixture correction.

## Verification

```text
npm test -- --run
```

Result: 71 test files passed, 410 tests passed.

```text
npm run build
```

Result: passed. Vite emitted the existing chunk-size advisory for a 750.83 kB JavaScript bundle.

```text
git diff --check
```

Result: passed with no whitespace errors.

## Self-Review

- The implementation uses shared dwell-profile and flow-summary helpers; no formulas or profile defaults were duplicated or changed.
- B2G keeps its two existing page sections and only adds rows inside the Step 1 forecast block.
- Production density behavior is unchanged; only the two stale test fixtures remove inherited venue area values.
- No unrelated files or palette changes were introduced.

## Commit

`fix: complete dwell-aware report evidence` (this report is included in that scoped commit).

## Concerns

- The production build passes but retains Vite's pre-existing advisory that one JavaScript bundle exceeds 500 kB after minification. This task does not change bundle splitting.
