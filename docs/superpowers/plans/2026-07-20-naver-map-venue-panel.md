# Naver Map Venue Panel Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Goal: Add a NAVER Maps based venue panel that shows the real event location for the default `강남 미디어 윈터페스타` demo while falling back cleanly when no map key is configured.

Architecture: Add one focused React component that owns NAVER Maps script loading, map initialization, marker rendering, and fallback display. Render the component between the forecast chart and congestion heatmap without changing forecast or TourAPI logic.

Tech Stack: React 18, TypeScript, Vite, Vitest, Testing Library, NAVER Maps JavaScript API v3.

## Global Constraints

- Do not commit NAVER Maps keys or TourAPI keys.
- Read the NAVER Maps public client key from `VITE_VWORLD_API_KEY`.
- Use NAVER Maps JS API v3 with the `ncpKeyId` query parameter.
- Keep the app usable when the key is missing or the SDK fails to load.
- Push every completed task to GitHub `main` so the work can continue from home.

---

### Task 1: Venue Map Fallback Shell

Files:
- Create: `src/components/VenueMapPanel.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/styles.css`

Interfaces:
- Consumes: no new domain data; uses fixed venue metadata for `강남 미디어 윈터페스타`.
- Produces: `<VenueMapPanel />` React component.

- [ ] Step 1: Write the failing test

Add to `src/App.test.tsx` in the existing dashboard render test:

```tsx
expect(screen.getByText("실제 행사장 지도")).toBeInTheDocument();
expect(screen.getByText("네이버 지도 API 키 미설정")).toBeInTheDocument();
expect(screen.getByText("서울특별시 강남구 영동대로 511 (삼성동)")).toBeInTheDocument();
```

- [ ] Step 2: Run test to verify it fails

Run: `npm run test -- src/App.test.tsx`

Expected: FAIL because `실제 행사장 지도` is not rendered.

- [ ] Step 3: Add minimal fallback component

Create `src/components/VenueMapPanel.tsx` with a panel that renders the title, fallback status, venue address, coordinates, and marker list when no key exists.

- [ ] Step 4: Render component

Import `VenueMapPanel` in `src/App.tsx` and render it between `ForecastChart` and `Heatmap`.

- [ ] Step 5: Style fallback panel

Add scoped classes in `src/styles.css`: `.venue-map-shell`, `.venue-map-fallback`, `.venue-map-meta`, `.venue-map-points`.

- [ ] Step 6: Run test to verify it passes

Run: `npm run test -- src/App.test.tsx`

Expected: PASS.

### Task 2: NAVER Maps SDK Loader

Files:
- Modify: `src/components/VenueMapPanel.tsx`
- Modify: `src/vite-env.d.ts`
- Test: `src/App.test.tsx`

Interfaces:
- Consumes: `VITE_VWORLD_API_KEY`.
- Produces: SDK loader behavior inside `<VenueMapPanel />`.

- [ ] Step 1: Write the failing test

Add an assertion that the fallback source text remains visible:

```tsx
expect(screen.getByText("좌표는 TourAPI 조회값 기준")).toBeInTheDocument();
```

- [ ] Step 2: Run test to verify it fails

Run: `npm run test -- src/App.test.tsx`

Expected: FAIL if the source text is not present.

- [ ] Step 3: Add SDK loader and types

Define `ImportMetaEnv.VITE_VWORLD_API_KEY?: string` and `window.naver` types in `src/vite-env.d.ts`. In `VenueMapPanel`, load `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${key}` only when a key exists.

- [ ] Step 4: Keep fallback safe

If no key exists, do not create a script tag. If loading fails, render the same fallback panel with `네이버 지도 로드 실패`.

- [ ] Step 5: Run test to verify it passes

Run: `npm run test -- src/App.test.tsx`

Expected: PASS.

### Task 3: Documentation and Full Verification

Files:
- Modify: `README.md`
- Modify: `docs/demo-verification.md`
- Create: `docs/naver-map-api-setup.md`

Interfaces:
- Consumes: implemented environment variable and fallback behavior.
- Produces: home-continuation setup notes.

- [ ] Step 1: Document local setup

Create `docs/naver-map-api-setup.md` explaining `VITE_VWORLD_API_KEY`, no-secret Git policy, fallback behavior, and official NAVER Maps JS API reference.

- [ ] Step 2: Link docs

Add the new doc to `README.md` and add a verification checkbox to `docs/demo-verification.md`.

- [ ] Step 3: Run full verification

Run:

```powershell
npm run test
npm run build
```

Expected: all tests pass and production build succeeds.

- [ ] Step 4: Commit and push

Run:

```powershell
git add .
git commit -m "feat: add naver map venue panel"
git push origin main
```
