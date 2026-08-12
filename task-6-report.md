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

## Fix Round 1

### Reviewer Follow-up

- Print and CSV render canonical evacuation values as Korean minutes and seconds from the snapshot's seconds value (for example, `125` becomes `2분 5초`), with focused regression coverage in both output suites.
- `SummaryKpiCards` consumes committed summary metrics and `OperationalScoreHeader` consumes the committed success-potential metric; their tests assert that neither component invokes a metric factory.
- The refreshing banner uses `selectedFestivalBasis.title ?? plan.name`, and its labels/tests use corrected Korean text.
- README now documents the integrated build-and-Express startup path, including build-time `VITE_VWORLD_API_KEY`, runtime `TOUR_API_KEY`, and `PORT`; the documentation index identifies the VWorld 2D map setup.

### Verification

- Focused Task 6 suite: 6 files, 24 tests passed.
- Full suite: 63 files, 294 tests passed.
- `npm run test:docs`: passed.
- `npx tsc -b --pretty false`: passed.
- `npm run build`: passed; 1,633 modules transformed. It warns only that `VITE_VWORLD_API_KEY` was intentionally unset for this build.
- `npm audit --omit=dev --audit-level=high`: exits 1 with the pre-existing `nanoid` high and `postcss` moderate findings; no dependency changes were made.

Commit: `fix: align snapshot outputs and setup guidance`

## Fix Round 2

### Reviewer Follow-up

- `useFestivalAnalysis` now exposes `requestBasis?.title ?? requestPlan.name` while a committed snapshot is refreshing. The regression test uses a selected basis title that differs from the request plan name and verifies the canonical basis title reaches the pending banner state.
- `docs/guides/deployment-and-cicd.md` now documents VWorld 2D setup exclusively: `VITE_VWORLD_API_KEY` is set before the browser build, and the deployment example passes `VWORLD_API_KEY` to Docker's matching build argument. Obsolete Naver map variables and instructions were removed.

### TDD Evidence

- Red: the deferred-refresh hook test expected `Selected Festival B` but received the request plan name, `Festival B`.
- Green: the hook suite passed after the pending title used the selected-basis fallback expression.

### Verification

- Focused hook/banner/docs suite: 3 files, 16 tests passed.
- `npm run test:docs`: passed.
- Full suite: 63 files, 294 tests passed.
- `npx tsc -b --pretty false`: passed.
- `npm run build`: passed; 1,633 modules transformed. It warns only that `VITE_VWORLD_API_KEY` was intentionally unset for this local build.
- The deployment guide contains no `VITE_NAVER_MAP_NCP_KEY_ID`, `NAVER_MAP_CLIENT_ID`, `Naver 지도`, or `네이버 지도` references.

Commit: `fix: align pending title and map deployment docs`
