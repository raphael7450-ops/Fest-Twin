# Dashboard Visual Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the Fest-Twin dashboard visual design into a polished public-sector SaaS and operations-monitoring hybrid without changing data or prediction behavior.

**Architecture:** Keep the existing React component structure and update only focused presentation components plus the global stylesheet. `GovernmentHeader` owns the top command header copy and metadata; `SummaryCards` owns KPI card labels and severity classes; `styles.css` owns the visual system, responsive layout, panels, controls, and dashboard polish.

**Tech Stack:** React, TypeScript, Vite, Vitest, CSS.

## Global Constraints

- Do not change TourAPI, NAVER Map, forecast, simulation, report, or persistence logic.
- Do not commit API keys, NAVER client secret, or other secrets.
- Keep cards at 8px border radius or less.
- Avoid marketing-style hero layouts, oversized decorative sections, gradient orbs, and one-note palettes.
- Maintain accessible text labels for status and risk, not color-only meaning.
- Keep the existing three-zone workflow: input/data basis, central forecast/map/simulation, decision report.

---

### Task 1: Header and KPI Markup

**Files:**
- Modify: `src/components/GovernmentHeader.tsx`
- Modify: `src/components/SummaryCards.tsx`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: existing `forecast`, `simulation`, and `report` props.
- Produces: unchanged public component names, with new CSS class hooks: `government-header__content`, `government-header__meta`, `metric-card--primary`, `metric-card--success`, `metric-card--warning`, `metric-card--danger`, `metric-trend`.

- [ ] **Step 1: Write failing render assertions**

Add assertions to `src/App.test.tsx` in the existing dashboard render test:

```ts
expect(screen.getByText("공공 검토 대시보드")).toBeInTheDocument();
expect(screen.getByText("실데이터 우선")).toBeInTheDocument();
expect(screen.getByText("데이터 신뢰도")).toBeInTheDocument();
expect(screen.getByText("예산 검토")).toBeInTheDocument();
```

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```powershell
$env:Path='C:\Program Files\nodejs;' + $env:Path; & 'C:\Program Files\nodejs\npm.cmd' run test -- src/App.test.tsx
```

Expected: fail because the new header/KPI text is missing.

- [ ] **Step 3: Update `GovernmentHeader.tsx`**

Replace the component body with:

```tsx
export function GovernmentHeader() {
  return (
    <header className="government-header">
      <div className="government-header__content">
        <p className="eyebrow">정부 지정 과제 기반 B2G SaaS MVP</p>
        <h1>페스트트윈(Fest-Twin)</h1>
        <p>
          지자체가 축제 예산 집행 전에 수요, 혼잡, 안전, 만족도 리스크를
          공공데이터와 시뮬레이션으로 검토하는 사전 진단 플랫폼입니다.
        </p>
      </div>
      <div className="government-header__meta" aria-label="데모 검토 상태">
        <span className="status-pill">공공 검토 대시보드</span>
        <span>실데이터 우선</span>
        <span>인증키 비공개</span>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Update `SummaryCards.tsx`**

Use the existing values but assign class variants and clearer labels:

```tsx
<section className="summary-grid" aria-label="핵심 진단 지표">
  <article className="metric-card metric-card--primary">
    <span>예상 방문객</span>
    <strong>{forecast.expectedVisitors.toLocaleString("ko-KR")}명</strong>
    <small className="metric-trend">{forecast.peakHour}:00 피크 예상</small>
  </article>
  <article className="metric-card metric-card--success">
    <span>흥행 가능성</span>
    <strong>{forecast.successScore}점</strong>
    <small className="metric-trend">TourAPI·트렌드 근거 반영</small>
  </article>
  <article className="metric-card metric-card--danger">
    <span>혼잡 위험도</span>
    <strong>{simulation.congestionScore}점</strong>
    <small className="metric-trend">병목 {simulation.bottlenecks.length}곳</small>
  </article>
  <article className="metric-card metric-card--warning">
    <span>예산 검토</span>
    <strong>{budgetRisk?.score ?? 0}점</strong>
    <small className="metric-trend">{budgetRisk?.reason ?? "예산 진단 대기"}</small>
  </article>
</section>
```

- [ ] **Step 5: Run the focused test and verify pass**

Run the same App test command.

Expected: all `src/App.test.tsx` tests pass.

- [ ] **Step 6: Commit**

```powershell
& 'C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd\git.exe' add src/components/GovernmentHeader.tsx src/components/SummaryCards.tsx src/App.test.tsx
& 'C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd\git.exe' commit -m "feat: refine dashboard header and kpis"
& 'C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd\git.exe' push origin main
```

### Task 2: Visual System and Responsive Layout

**Files:**
- Modify: `src/styles.css`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: class hooks from Task 1 and existing component class names.
- Produces: polished public-sector SaaS visual language, responsive three-column layout, stable panel and control sizing.

- [ ] **Step 1: Add a visual contract test**

Add this assertion to the existing render test in `src/App.test.tsx`:

```ts
expect(screen.getByLabelText("핵심 진단 지표")).toBeInTheDocument();
```

- [ ] **Step 2: Run the focused test**

Run:

```powershell
$env:Path='C:\Program Files\nodejs;' + $env:Path; & 'C:\Program Files\nodejs\npm.cmd' run test -- src/App.test.tsx
```

Expected: pass if Task 1 kept the semantic label.

- [ ] **Step 3: Update stylesheet**

Replace and extend `src/styles.css` so it includes:

- CSS variables for text, border, surface, primary, teal, blue, amber, red, green.
- Compact command-header styling for `.government-header`.
- More distinct `.metric-card` variants.
- Softer panel borders and shadows.
- Dense, work-focused form controls.
- Responsive breakpoints for summary grid and workspace columns.
- Map and heatmap panels that keep stable dimensions.

- [ ] **Step 4: Run focused and full verification**

Run:

```powershell
$env:Path='C:\Program Files\nodejs;' + $env:Path; & 'C:\Program Files\nodejs\npm.cmd' run test -- src/App.test.tsx
$env:Path='C:\Program Files\nodejs;' + $env:Path; & 'C:\Program Files\nodejs\npm.cmd' run test
$env:Path='C:\Program Files\nodejs;' + $env:Path; & 'C:\Program Files\nodejs\npm.cmd' run build
```

Expected: tests and build pass.

- [ ] **Step 5: Browser verification**

Open `http://localhost:5173/` and verify:

- Header reads as a government review dashboard.
- KPI cards are visually distinct.
- Central forecast/map/simulation area is prominent.
- Mobile width does not overlap text or controls.

- [ ] **Step 6: Commit**

```powershell
& 'C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd\git.exe' add src/styles.css src/App.test.tsx docs/superpowers/plans/2026-07-21-dashboard-visual-refresh.md
& 'C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd\git.exe' commit -m "style: polish dashboard visual system"
& 'C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd\git.exe' push origin main
```

## Self-Review

- Spec coverage: tasks cover header, KPI, visual system, responsive layout, testing, build, and Git push.
- Placeholder scan: no TBD/TODO/implement-later language is present.
- Type consistency: component exports and prop interfaces remain unchanged.
