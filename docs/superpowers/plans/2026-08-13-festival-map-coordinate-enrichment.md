# Festival Map Coordinate Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the venue map visible after selecting a coordinate-less regional-database festival by resolving trustworthy TourAPI coordinates on demand.

**Architecture:** Extend the existing TourAPI proxy with a validated keyword-search operation. Resolve and rank coordinate candidates in `tourApiAdapter`, then enrich only the selected modal preset before applying it.

**Tech Stack:** React 18, TypeScript, Express 5, TourAPI 4.0, Vitest, Testing Library, OpenLayers

## Global Constraints

- Do not load images while listing or resolving festival choices.
- Never retain coordinates from the previously selected festival.
- Never substitute a region centroid when an exact location cannot be verified.
- Apply the original coordinate-less preset when lookup fails so the map shows `행사장 좌표 확인 필요`.

---

### Task 1: TourAPI Keyword Proxy

**Files:**
- Modify: `server/tourProxy.js`
- Test: `server/tourProxy.test.ts`

**Interfaces:**
- Consumes: `GET /api/tour/keyword?keyword=<title>&contentTypeId=15&numOfRows=10&pageNo=1&arrange=A`
- Produces: Existing TourAPI JSON response contract from `searchKeyword2`

- [ ] **Step 1: Write the failing proxy test**

Add a test that requests the keyword route and asserts the upstream pathname is `/searchKeyword2`, the Korean keyword is preserved, `contentTypeId` is `15`, and the server key is absent from the response.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- server/tourProxy.test.ts`

Expected: FAIL because `keyword` is not a supported proxy endpoint.

- [ ] **Step 3: Implement the minimal proxy operation**

Add `keyword` to `endpointConfig` with operation `searchKeyword2` and allowed parameters `numOfRows`, `pageNo`, `arrange`, `keyword`, and `contentTypeId`. Reject a missing or whitespace-only keyword before calling upstream.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- server/tourProxy.test.ts`

Expected: PASS.

### Task 2: Coordinate Resolver

**Files:**
- Modify: `src/services/tourApiAdapter.ts`
- Test: `src/services/tourApiAdapter.test.ts`

**Interfaces:**
- Produces: `resolveFestivalCoordinatesByKeyword({ title, region }, options): Promise<FestivalCoordinateMatch | null>`
- `FestivalCoordinateMatch`: `{ contentId: string; title: string; address: string; mapX: string; mapY: string }`

- [ ] **Step 1: Write failing resolver tests**

Use a complete TourAPI payload containing an unrelated result and a normalized exact-title result. Assert that the exact title in the requested region is returned with literal coordinates. Add a malformed-coordinate case that returns `null`.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm test -- src/services/tourApiAdapter.test.ts`

Expected: FAIL because the resolver is not exported.

- [ ] **Step 3: Implement the minimal resolver**

Call `fetchTourApiItems("keyword", { numOfRows: 10, pageNo: 1, arrange: "A", keyword: title, contentTypeId: 15 }, ...)`. Normalize year, edition, whitespace, and punctuation for ranking. Accept only finite longitude in `124..132` and latitude in `33..39`, prefer exact normalized title, then matching region, and return `null` when no candidate is trustworthy.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `npm test -- src/services/tourApiAdapter.test.ts`

Expected: PASS.

### Task 3: On-Demand Modal Enrichment

**Files:**
- Modify: `src/components/FestivalSearchModal.tsx`
- Test: `src/components/FestivalSearchModal.test.tsx`

**Interfaces:**
- Consumes: `resolveFestivalCoordinatesByKeyword`
- Produces: `onSelectPreset(enrichedPreset)` with matching `plan.venueCoordinates` and `basis.mapX/mapY`

- [ ] **Step 1: Write the failing interaction test**

Return one coordinate-less regional DB record from the first fetch and a complete TourAPI keyword response from the second. Click that record's apply button and assert the callback receives longitude `126.9767821434`, latitude `37.5716786179`, source `tourapi`, and no image elements were rendered.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- src/components/FestivalSearchModal.test.tsx`

Expected: FAIL because the callback currently receives a coordinate-less preset immediately.

- [ ] **Step 3: Implement selection enrichment and cancellation**

For presets without coordinates, resolve by title and region, disable apply buttons during the request, and label the active button `위치 확인 중`. Enrich immutable copies of `plan` and `basis` on success. Abort the request when the modal closes or unmounts; on non-abort failure apply the original preset.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm test -- src/components/FestivalSearchModal.test.tsx src/services/tourApiAdapter.test.ts server/tourProxy.test.ts`

Expected: PASS.

### Task 4: Integrated Verification

**Files:**
- No production files expected

**Interfaces:**
- Verifies the complete user path from regional DB selection to OpenLayers map rendering.

- [ ] **Step 1: Run all automated checks**

Run: `npm test`

Run: `npm run build`

Expected: both commands exit `0`.

- [ ] **Step 2: Verify in the local browser**

Open the planning section, select `2026 서울라이트 광화문` from the full festival search, and assert that the map section contains `좌표 기준: 126.9767821434, 37.5716786179`, exposes zoom controls, and does not contain `행사장 좌표 확인 필요`.

- [ ] **Step 3: Review the final diff**

Run: `git diff --check`

Run: `git status --short`

Expected: no whitespace errors and only the planned source, test, and documentation files changed.

