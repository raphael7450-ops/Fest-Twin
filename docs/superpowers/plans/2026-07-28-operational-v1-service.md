# Operational v1 Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Fest-Twin from a strong demo into a submission-ready operational v1 service by making the evidence, synchronization, report, reliability, and submission package work end-to-end.

**Architecture:** Keep the existing React + TypeScript + Express architecture. Implement v1 as a sequence of small, testable slices that strengthen existing components and services instead of adding large new subsystems.

**Tech Stack:** React 18, TypeScript, Vite 6, Express 5, Vitest, React Testing Library, Docker.

## Global Constraints

- Target date: 2026-09-21.
- v1 is an operational public-review service, not a full commercial SaaS.
- TourAPI is the required primary OpenAPI.
- Naver DataLab, KTDB/View-T, and spending data are supporting evidence sources.
- No secrets in Git, browser bundles, reports, screenshots, or docs.
- Every runtime behavior change must include focused tests.
- Push to GitHub after each finished slice.
- Deploy to the remote Docker server after runtime behavior changes.

---

### Task 1: KPI Evidence Matrix

**Files:**
- Modify: `src/services/metricEvidence.ts`
- Modify: `src/services/metricEvidence.test.ts`
- Modify: `src/components/DataBasisPanel.tsx`
- Modify: `src/components/DataBasisPanel.test.tsx`
- Create: `docs/specs/kpi-evidence-matrix.md`

**Interfaces:**
- Consumes: existing `MetricEvidence`, `MetricEvidenceSourceDetail`, `TourismContext`, `TrendContext`, `TrafficContext`, `SpendingContext`, `DemandBackdataContext`
- Produces: clearer source labels and evidence matrix documentation

- [ ] **Step 1: Write failing tests**

Add tests asserting that each top-level KPI includes at least one `sourceDetails` item and that demand-index contains selected TourAPI basis, tourism context, trend context, and user input details when available.

- [ ] **Step 2: Run test to verify failure**

Run: `npm run test -- src/services/metricEvidence.test.ts`

- [ ] **Step 3: Implement evidence label cleanup**

Update `metricEvidence.ts` so each KPI has consistent Korean source labels:

- 선택 TourAPI 축제 기준
- 주변 관광지 맥락
- 검색 관심도 보정
- 지역 수요 백데이터
- 사용자 입력값
- 시뮬레이션 산출값
- KTDB/View-T 교통 근거
- 관광소비 객단가

- [ ] **Step 4: Update DataBasisPanel summary**

Add compact data-status rows showing live, partial fallback, file-normalized, or sample-fallback state for TourAPI, trends, traffic, spending, and backdata when available.

- [ ] **Step 5: Run focused tests**

Run: `npm run test -- src/services/metricEvidence.test.ts src/components/DataBasisPanel.test.tsx`

- [ ] **Step 6: Document matrix**

Create `docs/specs/kpi-evidence-matrix.md` with a table mapping each KPI to data sources, fallback behavior, and limitations.

- [ ] **Step 7: Build and commit**

Run: `npm run build`

Commit: `feat: clarify kpi evidence matrix`

### Task 2: Candidate-Driven Context Refresh

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.selectedBasis.test.tsx`
- Modify: `src/services/trendAdapter.ts`
- Modify: `src/services/trendAdapter.test.ts`
- Modify: `src/services/trafficAdapter.ts`
- Modify: `src/services/trafficAdapter.test.ts`
- Modify: `src/services/spendingAdapter.ts`
- Modify: `src/services/spendingAdapter.test.ts`
- Modify: `docs/specs/selected-festival-data-flow.md`

**Interfaces:**
- Consumes: `FestivalPlan`, `FestivalCandidate`, `SelectedFestivalBasis`
- Produces: refresh keys that include candidate identity where it affects context

- [ ] **Step 1: Write failing App test**

Extend `src/App.selectedBasis.test.tsx` to select two different candidates and assert that trend, traffic, and spending loaders receive updated festival title, region, date, and candidate basis where relevant.

- [ ] **Step 2: Run test to verify failure**

Run: `npm run test -- src/App.selectedBasis.test.tsx`

- [ ] **Step 3: Implement refresh-key cleanup**

Ensure App refresh keys include candidate title/contentId where the downstream context should change, and clear selected basis when manual identity edits occur.

- [ ] **Step 4: Add adapter-level tests**

Add tests confirming trend keywords put selected festival title first, traffic context uses updated address/date/hour, and spending context uses updated region/date.

- [ ] **Step 5: Run focused tests**

Run: `npm run test -- src/App.selectedBasis.test.tsx src/services/trendAdapter.test.ts src/services/trafficAdapter.test.ts src/services/spendingAdapter.test.ts`

- [ ] **Step 6: Update selected-festival data-flow doc**

Add the refresh coverage table for TourAPI, trend, traffic, spending, map, report, and metric evidence.

- [ ] **Step 7: Build, commit, push, deploy**

Run: `npm run build`

Commit: `feat: synchronize contexts from selected festival`

Deploy remote Docker and verify public URL bundle.

### Task 3: Public-Review Report Structure

**Files:**
- Modify: `src/components/ReportView.tsx`
- Modify: `src/components/ReportView.test.tsx`
- Modify: `src/components/ReportView.selectedBasis.test.tsx`
- Modify: `src/styles.css`
- Modify: `docs/contest/feature-description.md`

**Interfaces:**
- Consumes: `PlanningReport`, `FestivalPlan`, `ForecastResult`, `SpendingContext`, `MetricEvidence`
- Produces: report sections suitable for public review and print/PDF

- [ ] **Step 1: Write failing report tests**

Add tests asserting that ReportView renders sections named:

- 예측 결과
- 혼잡·안전 진단
- 예산·경제 효과
- 사용 데이터와 한계
- 개선 권고

- [ ] **Step 2: Run test to verify failure**

Run: `npm run test -- src/components/ReportView.test.tsx src/components/ReportView.selectedBasis.test.tsx`

- [ ] **Step 3: Implement report sections**

Restructure ReportView without changing data formulas. Keep selected TourAPI basis visible near the data-source section.

- [ ] **Step 4: Polish print styles**

Add print-safe CSS for section spacing, no clipped cards, and readable evidence labels.

- [ ] **Step 5: Run focused tests and build**

Run:

- `npm run test -- src/components/ReportView.test.tsx src/components/ReportView.selectedBasis.test.tsx`
- `npm run build`

- [ ] **Step 6: Update feature description**

Describe the report as a public-review artifact, not just a dashboard export.

- [ ] **Step 7: Commit, push, deploy**

Commit: `feat: structure public review report`

Deploy remote Docker and verify public URL.

### Task 4: Scenario Share Preservation

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/services/scenarioStorage.ts`
- Modify: `src/services/scenarioStorage.test.ts`
- Modify: `server/scenarioRouter.js`
- Modify: `server/scenarioRouter.test.ts`
- Modify: `docs/guides/demo-and-operations.md`

**Interfaces:**
- Consumes: current scenario `parameters.plan`, `selectedHour`
- Produces: persisted optional `selectedFestivalBasis` or safe backward-compatible restore behavior

- [ ] **Step 1: Write failing restore tests**

Add tests that save a scenario with selected festival basis and restore it from local and server scenario paths.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test -- src/services/scenarioStorage.test.ts server/scenarioRouter.test.ts src/App.test.tsx`

- [ ] **Step 3: Implement optional selected basis persistence**

Store selected basis in scenario parameters when present. Existing scenarios without the field must continue to restore.

- [ ] **Step 4: Restore selected basis in App**

When loading a scenario, restore selected basis if present; otherwise keep current fallback behavior.

- [ ] **Step 5: Run focused tests and build**

Run:

- `npm run test -- src/services/scenarioStorage.test.ts server/scenarioRouter.test.ts src/App.test.tsx`
- `npm run build`

- [ ] **Step 6: Update operations guide**

Add share-link verification for selected festival basis.

- [ ] **Step 7: Commit, push, deploy**

Commit: `feat: preserve selected festival in scenarios`

Deploy remote Docker.

### Task 5: Operational Verification Gates

**Files:**
- Modify: `scripts/deploy-check.js`
- Modify: `scripts/load-test.js`
- Modify: `docs/contest/submission-checklist.md`
- Modify: `docs/guides/deployment-and-cicd.md`

**Interfaces:**
- Consumes: current scripts `deploy:check`, `test:load`
- Produces: explicit final verification output for public URL, API endpoints, selected festival flow, and fallback state

- [ ] **Step 1: Inspect current script output**

Run:

- `npm run deploy:check`
- `npm run test:load`

Record current gaps.

- [ ] **Step 2: Add deploy-check assertions**

Extend deploy check to verify:

- public root returns HTTP 200
- `/api/tour/area-code` returns valid proxy response or explicit fallback-compatible error
- scenario endpoints respond
- static bundle is current

- [ ] **Step 3: Add script tests if available**

If script tests are absent, add a small test harness or keep changes minimal and verify via command output.

- [ ] **Step 4: Run verification commands**

Run:

- `npm run deploy:check`
- `npm run test:load`
- `npm run build`

- [ ] **Step 5: Update docs**

Update checklist and deployment guide with final v1 verification gates.

- [ ] **Step 6: Commit and push**

Commit: `chore: tighten operational verification`

Deploy remote Docker only if runtime files changed.

### Task 6: Submission Package Refresh

**Files:**
- Modify: `docs/contest/submission-package.md`
- Modify: `docs/contest/submission-checklist.md`
- Modify: `docs/contest/openapi-usage-evidence.md`
- Modify: `docs/contest/selected-festival-evidence.md`
- Modify: `docs/contest/presentation-deck.md`
- Modify: `docs/contest/september-service-roadmap.md`
- Run: `npm run build:zip`

**Interfaces:**
- Consumes: final v1 behavior and screenshots
- Produces: updated submission package zip and contest docs

- [ ] **Step 1: Review final implemented behavior**

Check current docs against implemented features and remove claims that are not implemented in v1.

- [ ] **Step 2: Refresh submission copy**

Update feature description, API evidence, selected festival evidence, and final checklist.

- [ ] **Step 3: Capture or update screenshots**

Refresh screenshots for:

- dashboard full view
- TourAPI candidate panel
- selected festival basis
- evidence drawer
- map and heatmap
- report

- [ ] **Step 4: Build submission zip**

Run: `npm run build:zip`

- [ ] **Step 5: Run final gates**

Run:

- `npm test`
- `npm run build`
- `npm run deploy:check`
- `npm run test:load`

- [ ] **Step 6: Commit and push**

Commit: `docs: refresh operational v1 submission package`

Push to GitHub.
