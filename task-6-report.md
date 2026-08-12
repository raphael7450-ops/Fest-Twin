# Task 6 Report

## Result

- Dashboard status, report, print, and CSV now read the committed `FestivalAnalysisSnapshot` identity and canonical outputs.
- `ReportView`, `B2gPrintReport`, and `CsvExportButton` accept a snapshot data prop; report/print no longer create an independent simulation.
- Analysis status covers loading, refreshing, ready, and error states while preserving the prior snapshot identity.
- CSV keeps the UTF-8 BOM and includes analysis/model/time/festival metadata plus every dataset status.
- README indexes, storage claims, and physical density/evacuation semantics now match the implementation.

## TDD Evidence

- Red: new banner and docs-checker suites initially failed because the modules/behaviors were absent; behavior stubs then produced 6 expected assertion failures.
- Red: snapshot output consistency initially failed because report/print still consumed fragmented props.
- Red: real docs check found 30 stale local README links.
- Green: focused Task 6 suite passed 6 files / 22 tests.
- Regression red/green: first full run exposed 3 legacy caller/selector failures; after adapting those callers, the full run passed 63 files / 292 tests.

## Verification

- `npx vitest run tests/analysisOutputConsistency.test.tsx tests/csvExport.test.ts src/components/B2gPrintReport.test.tsx src/components/ReportView.test.tsx src/components/AnalysisStatusBanner.test.tsx scripts/docs-link-check.test.js`: 6 files, 22 tests passed.
- `npx vitest run`: 63 files, 292 tests passed.
- `npm run test:docs`: passed with no broken links.
- `npx tsc -b --pretty false`: passed.
- `npm run build`: passed; 1,632 modules transformed.
- `git diff --check`: passed; Git reported only expected LF-to-CRLF working-copy notices.

## Audit

`npm audit --omit=dev --audit-level=high` exited 1 with existing findings; dependencies were not changed:

- High: `nanoid <3.3.17`, GHSA-2v37-7h3g-55p8.
- Moderate: `postcss <=8.5.22`, GHSA-fxqj-rqcc-2cmp.

## Changed Files

- Snapshot output/UI: `src/App.tsx`, `src/components/AnalysisStatusBanner.tsx`, `ReportView.tsx`, `B2gPrintReport.tsx`, `CsvExportButton.tsx`, `RoiEconomicImpact.tsx`, `OperationalScoreHeader.tsx`, and `src/styles.css`.
- CSV/docs tooling: `src/utils/csvExport.ts`, `scripts/docs-link-check.js`, and `package.json`.
- Tests: focused component/output/CSV/docs tests, shared snapshot fixture, and adapted festival-switch callers.
- Documentation: `README.md`, `docs/README.md`, and `docs/DATA_RELIABILITY_REPORT.md`.

## Concerns

- Production build succeeds but warns that `%VITE_VWORLD_API_KEY%` is not defined in the current environment.
- Browser visual verification was intentionally not performed; the controller will perform it after code review.

Commit: `test: enforce analysis output consistency`
