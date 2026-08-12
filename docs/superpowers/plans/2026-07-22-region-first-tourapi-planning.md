# Region-First TourAPI Planning Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Goal: Build a region-first planning flow where users choose region and period, open a right-side TourAPI candidate panel, select a real festival, and update the dashboard from that selection.

Architecture: Keep the existing React/Vite/Express structure. Add small TourAPI candidate helpers in `src/services/tourApiAdapter.ts`, manage candidate state in `src/App.tsx`, render region/date controls in `PlanForm`, and show multiple candidates in a new `FestivalCandidatePanel` slide-over.

Tech Stack: React 18, TypeScript, Vite, Vitest, Express TourAPI proxy, Docker remote deployment.

## Global Constraints

- TourAPI key remains server-only as `TOUR_API_KEY`.
- Naver map client id remains a public Docker build argument, not a secret.
- Do not commit SSH passwords, TourAPI keys, or local `.env*` values.
- Preserve the government-style blue/slate dashboard tone.
- Push completed work to GitHub and redeploy the `fest-twin-demo` Docker container.

---

### Task 1: Candidate Service Contract

Files:
- Modify: `src/services/tourApiAdapter.ts`
- Test: `src/services/dataAdapters.test.ts`

Interfaces:
- Produces: `TourApiAreaCode`, `FestivalCandidate`, `getTourApiAreaCodes(options?)`, `getFestivalCandidates(plan, options?)`
- Consumes: existing `/api/tour/area-code`, `/api/tour/festivals`, `/api/tour/detail` proxy endpoints.

- [ ] Step 1: Add failing tests

Add tests that mock `area-code`, `festivals`, and `detail` proxy responses. Verify `getTourApiAreaCodes()` returns `{ code, name }[]`, and `getFestivalCandidates(plan)` returns candidates with `id`, `title`, `address`, `startDate`, `endDate`, `mapX`, and `mapY`.

- [ ] Step 2: Implement service helpers

Add exported types and functions in `tourApiAdapter.ts`. Reuse existing response normalization helpers and date formatting. Fall back from exact-period festival search to annual-region search when exact search returns no items.

- [ ] Step 3: Run focused tests

Run `npm run test -- src/services/dataAdapters.test.ts`.

### Task 2: App State And Plan Form

Files:
- Modify: `src/App.tsx`
- Modify: `src/components/PlanForm.tsx`
- Test: `src/App.test.tsx`

Interfaces:
- Consumes: `getTourApiAreaCodes`, `getFestivalCandidates`, `FestivalCandidate`
- Produces: selected region/date controls, candidate panel open state, candidate selection handler.

- [ ] Step 1: Add App expectations

Assert the dashboard shows `개최 지역`, `시작일`, `종료일`, and `TourAPI 후보 보기`.

- [ ] Step 2: Extend `PlanForm` props

Add props for area code options, loading state, candidate count, selected candidate label, and `onOpenCandidates`.

- [ ] Step 3: Wire `App` state

Load area codes once. Refetch candidates when region/start/end changes. Do not refetch when budget or capacity changes. Selecting a candidate updates plan name, region, venue address, start date, end date, and keywords when useful.

- [ ] Step 4: Run focused App tests

Run `npm run test -- src/App.test.tsx`.

### Task 3: Slide Candidate Panel

Files:
- Create: `src/components/FestivalCandidatePanel.tsx`
- Modify: `src/styles.css`
- Test: `src/App.test.tsx`

Interfaces:
- Consumes: `FestivalCandidate[]`, loading/error/empty state, selected candidate id, `onSelectCandidate`, `onClose`.
- Produces: accessible right-side slide-over panel.

- [ ] Step 1: Render panel states

Create a panel with title `TourAPI 축제 후보`, candidate cards, close button, empty state, and loading state.

- [ ] Step 2: Style panel

Use restrained government SaaS styling. Desktop opens from the right; mobile becomes full-width with safe spacing. Avoid nested cards beyond candidate cards.

- [ ] Step 3: Verify interactions

Clicking `TourAPI 후보 보기` opens the panel. Clicking a candidate applies it and closes the panel.

### Task 4: Verification And Deployment

Files:
- No product file changes unless test failures reveal a defect.

Interfaces:
- Consumes: committed source.
- Produces: GitHub push and remote Docker deployment.

- [ ] Step 1: Full verification

Run `npm run test` and `npm run build`.

- [ ] Step 2: Commit and push

Commit source and docs. Push to `origin/main`.

- [ ] Step 3: Remote Docker deploy

Create `git archive HEAD`, upload it to `cwserver`, build Docker with `--build-arg VWORLD_API_KEY=your_vworld_api_key`, replace `fest-twin-demo`, and verify `https://cwserver.tail97dbc3.ts.net/` returns `200 OK`.

- [ ] Step 4: Verify deployed bundle

Confirm deployed JS contains the new region-first candidate UI labels and the container is running.
