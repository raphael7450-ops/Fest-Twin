# City Park Area Reference Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retrieve National City Park Information Standard Data as a venue-area reference and use it in crowd-density calculations only after an operator explicitly applies it.

**Architecture:** Add a server-only public-data proxy that normalizes city park records and protects the service key. A focused client adapter validates and ranks candidates, while a dedicated planning-form component owns asynchronous lookup and explicit application. `FestivalPlan` keeps the calculation area and a separate optional provenance object so storage, evidence, CSV, and print output can accurately label the value.

**Tech Stack:** Express 5, React 18, TypeScript 5.7, Vitest, Testing Library, native `fetch`, existing Fest-Twin analysis and reporting services.

## Global Constraints

- Read the service key only from the server environment variable `CITY_PARK_API_KEY`.
- Never expose the key through `VITE_*`, browser requests, built assets, source control, logs, snapshots, or error responses.
- A city park candidate is a reference only; it must not change `venueAreaSquareMeters` until the operator selects `행사장 면적으로 적용`.
- API errors and empty results must preserve an existing valid venue area and leave manual input usable.
- Park total area must be labelled as a reference that requires operating-boundary verification.
- Existing saved scenarios without area provenance must remain loadable as manual input.
- Do not add a new dependency.

---

## File Structure

- Create `server/cityParkProxy.js`: validate proxy queries, call data.go.kr, normalize upstream response variants, and return bounded safe fields.
- Create `server/cityParkProxy.test.ts`: verify key isolation, validation, normalization, and upstream error mapping.
- Modify `server/index.js`: rate-limit and mount `/api/city-parks` with injectable test configuration.
- Create `src/services/cityParkAdapter.ts`: validate proxy payloads, derive a park search term, rank candidates, and expose lookup types.
- Create `src/services/cityParkAdapter.test.ts`: verify parsing, matching, deduplication, and failures.
- Modify `src/domain/types.ts`: add `VenueAreaProvenance` and `FestivalPlan.venueAreaProvenance`.
- Modify `src/services/scenarioStorage.ts` and its test: normalize provenance while preserving old scenarios.
- Modify `src/services/festivalSelection.ts` and its test: clear stale venue area when a different venue is selected.
- Create `src/services/venueAreaEvidence.ts` and test: produce one shared provenance-aware label and note.
- Create `src/components/VenueAreaReference.tsx` and test: own lookup state, stale-response protection, manual entry, candidate selection, and explicit application.
- Modify `src/components/PlanForm.tsx` and its test: render the area component and clear stale area when the address is manually changed.
- Modify `src/utils/csvExport.ts`, `src/components/B2gPrintReport.tsx`, `src/services/metricEvidence.ts`, and focused tests: render accurate provenance.
- Modify `src/styles.css`: add restrained B2G styles for the reference area control and responsive candidate list.
- Modify `.env.example`: document only the placeholder `CITY_PARK_API_KEY`.

---

### Task 1: Server-Side City Park Proxy

**Files:**
- Create: `server/cityParkProxy.js`
- Create: `server/cityParkProxy.test.ts`
- Modify: `server/index.js`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `CITY_PARK_API_KEY`, `GET /api/city-parks?query=<park-name>&pageNo=1&numOfRows=100`.
- Produces: `createCityParkProxyRouter(options)` and JSON `{ items: CityParkProxyItem[], totalCount: number, retrievedAt: string }`.

- [ ] **Step 1: Write failing proxy tests**

Add tests that start an isolated Express router and assert:

```ts
expect(new URL(String(fetchMock.mock.calls[0][0])).searchParams.get("serviceKey"))
  .toBe("server-key+/=");
expect(JSON.stringify(body)).not.toContain("server-key+/=");
expect(body.items[0]).toEqual({
  id: "PARK-001",
  name: "여의도공원",
  type: "근린공원",
  roadAddress: "서울특별시 영등포구 여의공원로 68",
  lotAddress: "서울특별시 영등포구 여의도동 2",
  latitude: 37.5268,
  longitude: 126.922,
  areaSquareMeters: 229539,
  managementOrganization: "서울특별시",
  referenceDate: "2026-01-01",
});
```

Cover nested `response.body.items.item`, top-level array payloads, scalar items, empty items, missing key, `serviceKey` injection, blank/over-80-character query, `numOfRows > 100`, upstream non-2xx, timeout/throw, malformed JSON, and non-positive/non-numeric `parkAr` removal.

- [ ] **Step 2: Run the proxy test and confirm failure**

Run: `npm test -- server/cityParkProxy.test.ts`

Expected: FAIL because `createCityParkProxyRouter` does not exist.

- [ ] **Step 3: Implement the minimal proxy**

Export `normalizeCityParkPayload(payload)` for deterministic unit testing and
`createCityParkProxyRouter(options = {})` for mounting in Express. The normalizer
must return `{ items, totalCount }`; the router adds `retrievedAt` after a successful
upstream request.

Build the upstream URL from:

```js
const CITY_PARK_API_URL =
  "https://api.data.go.kr/openapi/tn_pubr_public_cty_park_info_api";
url.searchParams.set("serviceKey", apiKey);
url.searchParams.set("type", "json");
url.searchParams.set("parkNm", query.trim());
url.searchParams.set("pageNo", boundedPageNo);
url.searchParams.set("numOfRows", boundedRows);
```

Map source fields `manageNo`, `parkNm`, `parkSe`, `rdnmadr`, `lnmadr`, `latitude`, `longitude`, `parkAr`, `institutionNm`, and `referenceDate`. Return stable errors `CITY_PARK_API_KEY_MISSING`, `INVALID_QUERY`, `CITY_PARK_UPSTREAM_ERROR`, and `CITY_PARK_INVALID_RESPONSE` without including the upstream URL.

Mount the router in `createApp`:

```js
app.use("/api/city-parks", openApiRateLimiter);
app.use(
  "/api/city-parks",
  createCityParkProxyRouter({
    fetchImpl: options.fetchImpl,
    apiKey: options.cityParkApiKey,
    logger: log,
  }),
);
```

Add `CITY_PARK_API_KEY=replace-with-your-city-park-service-key` to `.env.example` only.

- [ ] **Step 4: Run server tests**

Run: `npm test -- server/cityParkProxy.test.ts server/index.test.ts`

Expected: PASS with no key text in response snapshots or logs.

- [ ] **Step 5: Commit the server proxy**

```bash
git add server/cityParkProxy.js server/cityParkProxy.test.ts server/index.js .env.example
git commit -m "feat: add city park public data proxy"
```

---

### Task 2: Client Candidate Adapter And Ranking

**Files:**
- Create: `src/services/cityParkAdapter.ts`
- Create: `src/services/cityParkAdapter.test.ts`

**Interfaces:**
- Consumes: normalized `/api/city-parks` response and venue identity fields.
- Produces: `CityParkCandidate`, `deriveCityParkQuery`, `rankCityParkCandidates`, and `lookupCityParkCandidates`.

- [ ] **Step 1: Write failing adapter tests**

Define tests around the public interface:

```ts
const result = rankCityParkCandidates(items, {
  venueName: "서울세계불꽃축제",
  venueAddress: "서울특별시 영등포구 여의도 한강공원 일대",
  region: "서울",
  coordinates: { latitude: 37.528, longitude: 126.934 },
});

expect(result[0].name).toBe("여의도한강공원");
expect(deriveCityParkQuery("여의도 한강공원 및 이촌 한강공원 일대"))
  .toBe("여의도 한강공원");
```

Also cover exact normalized names, abbreviated Korean regions, road/lot address overlap, Haversine distance, duplicate identity collapse, invalid coordinates, invalid areas, malformed payload rejection, `AbortSignal` forwarding, and a non-park address returning an empty query.

- [ ] **Step 2: Run the adapter test and confirm failure**

Run: `npm test -- src/services/cityParkAdapter.test.ts`

Expected: FAIL because the adapter module does not exist.

- [ ] **Step 3: Implement validation and deterministic ranking**

Use these exact types:

```ts
export interface CityParkCandidate {
  id: string;
  name: string;
  type?: string;
  roadAddress?: string;
  lotAddress?: string;
  latitude?: number;
  longitude?: number;
  areaSquareMeters: number;
  managementOrganization?: string;
  referenceDate?: string;
  matchScore: number;
}

export interface CityParkLookupInput {
  venueName: string;
  venueAddress: string;
  region: string;
  coordinates?: { latitude: number; longitude: number };
}

export async function lookupCityParkCandidates(
  input: CityParkLookupInput,
  options: { signal?: AbortSignal; fetchImpl?: typeof fetch } = {},
): Promise<CityParkCandidate[]>;
```

Normalize whitespace and punctuation but preserve Korean text for display. Score exact park-name containment first, then region tokens, address overlap, and distance. Sort by descending score, then ascending distance, then Korean name. Reject candidates with `areaSquareMeters <= 0` and return at most 10.

- [ ] **Step 4: Run adapter tests**

Run: `npm test -- src/services/cityParkAdapter.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the adapter**

```bash
git add src/services/cityParkAdapter.ts src/services/cityParkAdapter.test.ts
git commit -m "feat: rank city park area candidates"
```

---

### Task 3: Venue Area Provenance And Persistence

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/services/scenarioStorage.ts`
- Modify: `src/services/scenarioStorage.test.ts`
- Modify: `src/services/festivalSelection.ts`
- Modify: `src/services/festivalSelection.test.ts`
- Create: `src/services/venueAreaEvidence.ts`
- Create: `src/services/venueAreaEvidence.test.ts`

**Interfaces:**
- Consumes: applied candidate fields and manual area edits.
- Produces: `VenueAreaProvenance`, normalized saved plans, stale-area clearing, `describeVenueArea(plan)`.

- [ ] **Step 1: Write failing provenance and persistence tests**

Use this model in assertions:

```ts
const provenance: VenueAreaProvenance = {
  origin: "public-data",
  sourceDataset: "전국도시공원정보표준데이터",
  sourceRecordId: "PARK-001",
  sourceParkName: "여의도공원",
  referenceAreaSquareMeters: 229539,
  managementOrganization: "서울특별시",
  referenceDate: "2026-01-01",
  appliedAt: "2026-08-13T12:00:00.000Z",
};
```

Assert that valid provenance survives normalization, malformed provenance is discarded, an old scenario with only `venueAreaSquareMeters` loads successfully, and selecting a different festival venue clears both area and provenance. Verify `describeVenueArea` returns the labels `사용자 입력`, `전국도시공원정보표준데이터 참고값 적용`, and `공공데이터 참고 후 사용자 조정`.

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `npm test -- src/services/scenarioStorage.test.ts src/services/festivalSelection.test.ts src/services/venueAreaEvidence.test.ts`

Expected: FAIL because provenance and the formatter do not exist.

- [ ] **Step 3: Add the domain type and normalizer**

Add:

```ts
export interface VenueAreaProvenance {
  origin: "user-input" | "public-data" | "user-adjusted";
  sourceDataset?: "전국도시공원정보표준데이터";
  sourceRecordId?: string;
  sourceParkName?: string;
  referenceAreaSquareMeters?: number;
  managementOrganization?: string;
  referenceDate?: string;
  appliedAt?: string;
}
```

Add `venueAreaProvenance?: VenueAreaProvenance` to `FestivalPlan`. Normalize only known origins, positive reference areas, bounded strings, and valid ISO timestamps. Treat missing provenance as manual input only when presenting evidence; do not mutate old saved JSON.

- [ ] **Step 4: Clear area when venue identity changes and centralize labels**

In festival candidate application, clear `venueAreaSquareMeters` and `venueAreaProvenance` when the candidate address differs from the current address. Presets continue replacing the whole plan and may retain their defined area.

Implement:

```ts
export function describeVenueArea(plan: FestivalPlan): {
  label: string;
  note: string;
  sourceParkName?: string;
  referenceDate?: string;
};
```

The note must always clarify that park total area requires field or drawing verification of the actual operating boundary.

- [ ] **Step 5: Run focused tests**

Run: `npm test -- src/services/scenarioStorage.test.ts src/services/festivalSelection.test.ts src/services/venueAreaEvidence.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit provenance support**

```bash
git add src/domain/types.ts src/services/scenarioStorage.ts src/services/scenarioStorage.test.ts src/services/festivalSelection.ts src/services/festivalSelection.test.ts src/services/venueAreaEvidence.ts src/services/venueAreaEvidence.test.ts
git commit -m "feat: track venue area provenance"
```

---

### Task 4: Planning Form Area Lookup And Explicit Application

**Files:**
- Create: `src/components/VenueAreaReference.tsx`
- Create: `src/components/VenueAreaReference.test.tsx`
- Modify: `src/components/PlanForm.tsx`
- Modify: `src/components/PlanForm.test.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `FestivalPlan`, `onPlanChange`, and `lookupCityParkCandidates`.
- Produces: a non-blocking area lookup UI that updates plan area only through explicit apply or manual input.

- [ ] **Step 1: Write failing component tests**

Mock `lookupCityParkCandidates` and assert:

```ts
expect(onPlanChange).not.toHaveBeenCalled();
await user.click(screen.getByRole("button", { name: "행사장 면적으로 적용" }));
expect(onPlanChange).toHaveBeenCalledWith(expect.objectContaining({
  venueAreaSquareMeters: 229539,
  venueAreaProvenance: expect.objectContaining({
    origin: "public-data",
    sourceRecordId: "PARK-001",
  }),
}));
```

Cover loading, best candidate, alternative selection, no result, retry, API error, request abortion on venue change, stale promise resolution, preservation of an existing area, manual input, clearing input, and changing an applied value to `user-adjusted` while retaining source metadata.

- [ ] **Step 2: Run component tests and confirm failure**

Run: `npm test -- src/components/VenueAreaReference.test.tsx src/components/PlanForm.test.tsx`

Expected: FAIL because `VenueAreaReference` does not exist.

- [ ] **Step 3: Implement the area component**

Render a stable `venue-area-reference` section containing:

- numeric `행사장 면적 (m²)` input;
- status text for loading, empty, and error states;
- candidate selector only when more than one candidate exists;
- source metadata and `공원 전체면적 참고값`;
- `행사장 면적으로 적용` button;
- retry button with `RefreshCw` icon and tooltip;
- a concise operating-boundary verification warning.

Use an `AbortController` and a monotonically increasing request id in the effect cleanup. Do not clear or write plan values during lookup. Applying a candidate uses `new Date().toISOString()` and the exact provenance fields from Task 3.

- [ ] **Step 4: Integrate with PlanForm and style responsively**

Render:

```tsx
<VenueAreaReference plan={plan} onPlanChange={onPlanChange} />
```

When the address input changes, clear both area fields because the previous operating location is no longer valid:

```tsx
onPlanChange({
  ...plan,
  venueAddress: event.target.value,
  venueAreaSquareMeters: undefined,
  venueAreaProvenance: undefined,
});
```

Use existing neutral borders and teal command color, no gradient, maximum 8px radius, fixed button heights, and a single-column mobile layout. Do not nest a decorative card inside the planning panel.

- [ ] **Step 5: Run component tests**

Run: `npm test -- src/components/VenueAreaReference.test.tsx src/components/PlanForm.test.tsx src/App.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit the planning UI**

```bash
git add src/components/VenueAreaReference.tsx src/components/VenueAreaReference.test.tsx src/components/PlanForm.tsx src/components/PlanForm.test.tsx src/styles.css
git commit -m "feat: apply public park area references"
```

---

### Task 5: Evidence, CSV, Print, And PDF Provenance

**Files:**
- Modify: `src/services/metricEvidence.ts`
- Modify: `src/services/metricEvidence.test.ts`
- Modify: `src/utils/csvExport.ts`
- Create: `src/utils/csvExport.test.ts`
- Modify: `src/components/B2gPrintReport.tsx`
- Modify: `src/components/B2gPrintReport.test.tsx`

**Interfaces:**
- Consumes: `describeVenueArea(plan)` from Task 3.
- Produces: consistent labels and verification notes in evidence and exported reports.

- [ ] **Step 1: Write failing reporting tests**

Create snapshots/plans for all three origins and assert that public-data output includes:

```ts
expect(output).toContain("전국도시공원정보표준데이터 참고값 적용");
expect(output).toContain("여의도공원");
expect(output).toContain("2026-01-01");
expect(output).toContain("실제 행사 운영구역 검증 필요");
```

Verify that manual plans still display `사용자 입력`, adjusted values display `공공데이터 참고 후 사용자 조정`, and missing area still displays `산출 불가`.

- [ ] **Step 2: Run reporting tests and confirm failure**

Run: `npm test -- src/services/metricEvidence.test.ts src/utils/csvExport.test.ts src/components/B2gPrintReport.test.tsx`

Expected: FAIL because reports still hard-code `사용자 입력` or omit provenance.

- [ ] **Step 3: Replace hard-coded area descriptions**

Call `describeVenueArea(plan)` wherever venue area evidence is rendered. Keep `venueAreaSquareMeters` as the only numeric input to `physicalDensity`; do not substitute `referenceAreaSquareMeters` in any calculation.

CSV and print/PDF output must include the applied numeric area, provenance label, source park/date when available, and verification note. Evidence details should use `sourceType: "public-data"` for unchanged public-data values and `sourceType: "user-input"` for manual or adjusted values while retaining the reference source in details.

- [ ] **Step 4: Run reporting and safety tests**

Run: `npm test -- src/services/metricEvidence.test.ts src/utils/csvExport.test.ts src/components/B2gPrintReport.test.tsx src/services/safetyDecisionMetrics.test.ts`

Expected: PASS and density remains unavailable whenever `venueAreaSquareMeters` is absent.

- [ ] **Step 5: Commit reporting provenance**

```bash
git add src/services/metricEvidence.ts src/services/metricEvidence.test.ts src/utils/csvExport.ts src/utils/csvExport.test.ts src/components/B2gPrintReport.tsx src/components/B2gPrintReport.test.tsx
git commit -m "feat: report venue area provenance"
```

---

### Task 6: Configuration, Full Verification, And Deployment Readiness

**Files:**
- Modify: `.env.local` locally only; never stage or commit it.
- Verify: all files changed in Tasks 1-5.

**Interfaces:**
- Consumes: the provided public-data key and completed feature.
- Produces: verified local integration and a deployable branch.

- [ ] **Step 1: Configure the local server secret**

Set `CITY_PARK_API_KEY` in ignored `.env.local`. Confirm ignore behavior without printing the value:

```powershell
git check-ignore .env.local
git grep -n "CITY_PARK_API_KEY=" -- ':!*.example'
```

Expected: `.env.local` is ignored and no committed file contains a real assignment.

- [ ] **Step 2: Run the focused integration suite**

Run:

```bash
npm test -- server/cityParkProxy.test.ts src/services/cityParkAdapter.test.ts src/services/scenarioStorage.test.ts src/services/festivalSelection.test.ts src/services/venueAreaEvidence.test.ts src/components/VenueAreaReference.test.tsx src/components/PlanForm.test.tsx src/services/metricEvidence.test.ts src/utils/csvExport.test.ts src/components/B2gPrintReport.test.tsx src/services/safetyDecisionMetrics.test.ts src/App.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Run build and repository checks**

Run:

```bash
npm run build
npm run test:docs
npm run deploy:check
git diff --check
git status --short
```

Expected: build and checks pass; only intentional tracked changes are present. If the known baseline safety-contract failures remain in the full suite, record the exact unchanged failures and do not attribute them to this feature.

- [ ] **Step 4: Verify the browser flow**

Start the Express/Vite application with the server key loaded, open the planning view, and verify at desktop and mobile widths:

1. a park festival produces plausible candidates;
2. merely loading a candidate does not change density;
3. applying a candidate updates area and density;
4. editing the applied area changes the label to user-adjusted;
5. changing the venue clears stale area;
6. no text overlaps, buttons remain stable, and no gradient is introduced;
7. browser network requests contain no service key.

- [ ] **Step 5: Perform final secret and diff audit**

Run:

```bash
git diff origin/codex/phase2-operational-v1...HEAD -- . ':!docs/superpowers'
git grep -n "<redacted-provided-key-prefix>" || exit 0
git status --short --branch
```

Expected: no real key prefix appears in tracked files, the worktree is clean after commits, and the branch contains only intended feature and documentation commits.

- [ ] **Step 6: Push and deploy after verification**

Push `codex/phase2-operational-v1`, configure `CITY_PARK_API_KEY` in the remote server environment without committing it, run the repository's `npm run deploy:remote` flow, and verify the deployed health endpoint plus one authenticated city-park proxy request. Do not print the key in deployment output or the final report.
