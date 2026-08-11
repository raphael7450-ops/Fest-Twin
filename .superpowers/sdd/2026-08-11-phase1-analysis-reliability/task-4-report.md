# Task 4 Report: Separate Success Potential From Capacity Pressure

## Changed files

- `src/services/impactMetrics.ts`: introduced bounded `successPotential` and uncapped `capacityPressure` contracts, including deterministic thresholds.
- `src/services/summaryKpiMetrics.test.ts`: added success, overload, clamp, selected-capacity, zero-capacity, and threshold tests.
- `src/components/SummaryKpiCards.tsx` and `src/components/SummaryKpiCards.test.tsx`: show the exact success-potential label, bounded point score, separate capacity-pressure detail, and status badge.
- `src/components/OperationalScoreHeader.tsx` and `src/components/OperationalScoreHeader.test.tsx`: use the bounded score and exact approved title.
- `src/services/report.ts` and `src/services/report.test.ts`: use canonical success potential and report capacity pressure as a separate finding.
- `src/domain/types.ts`, `src/services/metricEvidence.ts`, and `src/services/metricEvidence.test.ts`: added the dedicated `capacity-pressure` evidence record and separated formulas/labels.
- `src/components/ReportView.tsx`, `src/components/ReportView.test.tsx`, `src/components/SummaryCards.tsx`, `src/components/B2gPrintReport.tsx`, and `src/utils/csvExport.ts`: routed success-score displays and export through the bounded canonical metric.

## Red/green evidence

- RED: before implementation, 9 new semantic checks failed across summary metrics, summary/header UI, report, and evidence; 21 existing checks passed.
- GREEN: the required Task 4 suite passed: 6 files, 30 tests.
- Direct callers passed: `impactMetrics.test.ts` and `B2gPrintReport.test.tsx`, 2 files, 3 tests.
- Task 3 safety-confidence and unavailable-value coverage remains in the passing `metricEvidence.test.ts` suite.

## Verification

- `npx vitest run src/services/summaryKpiMetrics.test.ts src/components/SummaryKpiCards.test.tsx src/components/OperationalScoreHeader.test.tsx src/services/report.test.ts src/services/metricEvidence.test.ts src/components/ReportView.test.tsx`: pass (30 tests).
- `npx vitest run src/services/impactMetrics.test.ts src/components/B2gPrintReport.test.tsx`: pass (3 tests).
- `npx tsc -b --pretty false`: pass.
- `git diff --check`: pass.
- Production greps: no `운영 종합 점수` remains; no component or CSV export reads `forecast.successScore` directly; success potential is created independently of capacity pressure; capacity-pressure wording/formula is present separately.

## Commit

- `fix: separate success and capacity metrics`

## Concerns

- None. The repository reports its pre-existing LF-to-CRLF conversion warnings during diff checks; no whitespace errors were reported.

## Fix Round 1

- Corrected `successPotential.score` to preserve the exact clamped forecast value without rounding; grade thresholds now evaluate that exact value.
- Corrected the B2G print artifact to render `흥행 가능성 점수` separately from `예측 신뢰도`.
- RED: focused tests failed because `84.6` became `85`/`상` and the print artifact lacked the separate score label.
- GREEN: focused `summaryKpiMetrics` and `B2gPrintReport` tests passed, 2 files and 8 tests.
- Verification: Task 4 required suite, direct callers, type check, production greps, and `git diff --check` were rerun before commit.
- Commit: `fix: preserve success score semantics`.
