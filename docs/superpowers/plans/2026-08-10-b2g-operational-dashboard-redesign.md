# B2G Operational Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a B2G operations analysis header and refresh the dashboard surface styling without changing existing calculations or workflows.

**Architecture:** Create one focused React component for the new operational score header. App wires existing `plan`, `forecast`, `report`, `metricEvidence`, and `selectedFestivalBasis` into the header. CSS updates restyle the screen dashboard while preserving mobile and print behavior.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Testing Library, existing CSS.

## Global Constraints

- No new runtime dependencies.
- Preserve current app navigation and report behavior.
- Use existing domain types and derived data.
- Do not copy Figma assets or exact pixel layout.
- Keep cards compact and B2G operations-focused.

---

### Task 1: Operational Score Header Component

**Files:**
- Create: `src/components/OperationalScoreHeader.tsx`
- Create: `src/components/OperationalScoreHeader.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `FestivalPlan`, `ForecastResult`, `PlanningReport`, `MetricEvidenceId`, `MetricEvidence`, `SelectedFestivalBasis`.
- Produces: `OperationalScoreHeader(props)` React component.

- [ ] **Step 1: Write the failing test**

```tsx
render(
  <OperationalScoreHeader
    plan={sampleFestivalPlan}
    forecast={forecast}
    report={report}
    evidenceSet={evidenceSet}
    selectedFestivalBasis={selectedBasis}
  />,
);
expect(screen.getByText("운영 종합 점수")).toBeInTheDocument();
expect(screen.getByText("88점")).toBeInTheDocument();
expect(screen.getByText("선택 축제 기준")).toBeInTheDocument();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --config vitest.config.ts src/components/OperationalScoreHeader.test.tsx`

Expected: FAIL because `OperationalScoreHeader` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `OperationalScoreHeader.tsx` with four compact metric tiles and a context rail. Use only existing props and pure rendering logic.

- [ ] **Step 4: Wire component into App**

Import and render `OperationalScoreHeader` immediately after `GovernmentHeader`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run --config vitest.config.ts src/components/OperationalScoreHeader.test.tsx`

Expected: PASS.

### Task 2: Dashboard Surface Styling

**Files:**
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: existing class names plus `.operational-score-header`, `.ops-score-card`, `.ops-context-card`.
- Produces: B2G console visual treatment for dashboard shell, rail, panels, KPI cards, and new header.

- [ ] **Step 1: Add class-based CSS**

Add CSS for the new header and adjust root variables, body background, dashboard shell, rail, panels, and metric cards.

- [ ] **Step 2: Preserve mobile and print behavior**

Keep existing mobile breakpoints and avoid changing `@media print` rules except where inherited screen styles need no print effect.

- [ ] **Step 3: Run focused UI tests**

Run: `npx vitest run --config vitest.config.ts src/components/OperationalScoreHeader.test.tsx src/App.test.tsx`

Expected: PASS.

### Task 3: Verification

**Files:**
- No production files.

**Interfaces:**
- Consumes: completed implementation.
- Produces: validation evidence.

- [ ] **Step 1: Run full test suite**

Run: `npm test`

Expected: all test files pass.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: build exits 0. Existing environment warnings may remain.
