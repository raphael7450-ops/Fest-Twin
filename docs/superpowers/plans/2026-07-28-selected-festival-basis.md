# Selected Festival Basis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make TourAPI festival selection drive the real-data basis shown in the dashboard, report, and metric evidence.

**Architecture:** Introduce a small domain-level selected festival basis and a focused service that maps TourAPI candidates into that basis while applying candidate metadata to the planning form. Pass the basis through App into evidence components and metric evidence generation.

**Tech Stack:** React, TypeScript, Vite, Vitest, React Testing Library.

## Global Constraints

- Keep the existing B2G dashboard tone and layout.
- Do not expose API secrets in browser code, reports, or evidence.
- Keep changes scoped to selected festival basis propagation.
- Use tests before implementation.
- Commit and push after verified changes.

---

### Task 1: Selected Festival Basis Mapping

**Files:**
- Modify: `src/domain/types.ts`
- Create: `src/services/festivalSelection.ts`
- Create: `src/services/festivalSelection.test.ts`

**Interfaces:**
- Produces: `SelectedFestivalBasis`
- Produces: `createSelectedFestivalBasis(candidate: FestivalCandidate): SelectedFestivalBasis`
- Produces: `applyFestivalCandidateToPlan(currentPlan: FestivalPlan, candidate: FestivalCandidate): FestivalPlan`

- [ ] **Step 1: Write failing tests**

Add tests that assert:
- A TourAPI candidate becomes a selected basis with `contentId`, title, address, period, coordinates, and source name.
- Applying the candidate updates only name/address/dates/keywords while preserving budgets, facilities, capacity, and layout.

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `npm run test -- src/services/festivalSelection.test.ts`

- [ ] **Step 3: Implement domain type and mapping helper**

Add the selected basis type to `src/domain/types.ts` and implement the helper in `src/services/festivalSelection.ts`.

- [ ] **Step 4: Run the focused test and confirm pass**

Run: `npm run test -- src/services/festivalSelection.test.ts`

### Task 2: Evidence Propagation

**Files:**
- Modify: `src/services/metricEvidence.ts`
- Modify: `src/services/metricEvidence.test.ts`
- Modify: `src/components/DataBasisPanel.tsx`
- Modify: `src/components/DataBasisPanel.test.tsx`
- Modify: `src/components/ReportView.tsx`
- Modify: `src/components/ReportView.test.tsx`

**Interfaces:**
- Consumes: `SelectedFestivalBasis`
- Updates: `createMetricEvidenceSet(..., selectedFestivalBasis?: SelectedFestivalBasis)`

- [ ] **Step 1: Write failing tests**

Add tests that assert:
- Metric evidence includes a `tourapi-selected-festival-basis` source detail when a basis is supplied.
- Data basis panel renders selected title and content ID.
- Report OpenAPI section renders selected title and content ID.

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `npm run test -- src/services/metricEvidence.test.ts src/components/DataBasisPanel.test.tsx src/components/ReportView.test.tsx`

- [ ] **Step 3: Implement evidence propagation and rendering**

Pass optional selected basis into metric evidence and components. Render compact rows for selected festival basis.

- [ ] **Step 4: Run focused tests and confirm pass**

Run: `npm run test -- src/services/metricEvidence.test.ts src/components/DataBasisPanel.test.tsx src/components/ReportView.test.tsx`

### Task 3: App Integration

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `createSelectedFestivalBasis`
- Consumes: `applyFestivalCandidateToPlan`

- [ ] **Step 1: Write failing app test**

Add a test that selects a TourAPI candidate and confirms the selected `contentId` is visible in the evidence view.

- [ ] **Step 2: Run focused app test and confirm failure**

Run: `npm run test -- src/App.test.tsx`

- [ ] **Step 3: Wire selected basis through App**

Derive `selectedFestivalBasis` from the selected candidate, include it in real-data keys, pass it to metric evidence, DataBasisPanel, and ReportView, and clear it when the user changes festival identity fields manually.

- [ ] **Step 4: Run focused app test and confirm pass**

Run: `npm run test -- src/App.test.tsx`

### Task 4: Verify, Commit, Push, Deploy

**Files:**
- All changed files from Tasks 1-3

- [ ] **Step 1: Run focused tests**

Run: `npm run test -- src/services/festivalSelection.test.ts src/services/metricEvidence.test.ts src/components/DataBasisPanel.test.tsx src/components/ReportView.test.tsx src/App.test.tsx`

- [ ] **Step 2: Run build**

Run: `npm run build`

- [ ] **Step 3: Commit only relevant files**

Commit message: `feat: refresh evidence from selected festival`

- [ ] **Step 4: Push to GitHub**

Push `main` to `origin`.

- [ ] **Step 5: Deploy remote Docker demo**

Build and restart the `fest-twin-demo` container on the user's Tailscale server, then verify `https://cwserver.tail97dbc3.ts.net/`.
