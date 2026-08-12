# Evidence Source Detail Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Goal: Add a `사용 데이터 상세` evidence layer so reviewers can inspect the exact safe source records, query conditions, user inputs, and derived calculation inputs used for each dashboard metric.

Architecture: Extend domain types with a normalized evidence-source detail model, then have TourAPI adapter functions attach safe query and record metadata to festival candidates and tourism contexts. The metric evidence service will compose TourAPI, user-input, derived, and fallback/sample details into each `MetricEvidence`, and the drawer will render them in a compact audit-friendly section.

Tech Stack: React, TypeScript, Vite, Vitest, Testing Library, Express TourAPI proxy, Docker/Nginx deployment.

## Global Constraints

- Do not expose `serviceKey`, `clientSecret`, `Authorization`, cookies, server environment values, or raw secret-bearing URLs.
- Show only calculation-relevant public fields, not full raw TourAPI JSON dumps.
- Keep the existing public-sector dashboard tone and current Blue/Slate visual style.
- Preserve the region-first festival lookup flow and current TourAPI candidate selection behavior.
- Keep fallback states explicit: live, partial fallback, sample fallback, user input, and derived values must be distinguishable.
- End with `npm run test`, `npm run build`, GitHub push, and remote Docker deployment verification.

---

## File Structure

- Modify `src/domain/types.ts`
  - Add `EvidenceSourceType`, `MetricEvidenceSourceDetail`, `EvidenceField`, and optional `sourceDetails` fields.
  - Add optional `sourceDetails` to `TourismContext`.

- Modify `src/services/tourApiAdapter.ts`
  - Add helper functions that create safe source-detail objects from TourAPI operations.
  - Add optional `sourceDetails` to `FestivalCandidate`.
  - Return source details from candidate lookup, tourism context lookup, and fallback context creation.

- Modify `src/data/sampleTourApi.ts`
  - Add sample source details for offline/sample states.

- Modify `src/services/metricEvidence.ts`
  - Add helpers that build user-input and derived-value source details.
  - Add source details to every metric evidence object.

- Modify `src/components/MetricEvidenceDrawer.tsx`
  - Render `사용 데이터 상세` between `사용 데이터` and `산출 방식`.

- Modify `src/styles.css`
  - Add compact styling for evidence source cards, query rows, record fields, and status tags.

- Modify tests:
  - `src/services/metricEvidence.test.ts`
  - `src/services/dataAdapters.test.ts`
  - `src/App.test.tsx`
  - Optional: `src/components/ReportView.test.tsx` only if report summary shape changes.

- Modify docs:
  - `docs/data-methodology.md`
  - Optional: `README.md` only if the current working copy is intentionally included later. Check existing unrelated edits before staging.

---

### Task 1: Domain Types And Sample Evidence

Files:
- Modify: `src/domain/types.ts`
- Modify: `src/data/sampleTourApi.ts`
- Test: `src/services/metricEvidence.test.ts`

Interfaces:
- Produces: `MetricEvidenceSourceDetail`, used by TourAPI adapter, metric evidence service, and drawer.
- Produces: `TourismContext.sourceDetails?: MetricEvidenceSourceDetail[]`.
- Produces: `MetricEvidence.sourceDetails: MetricEvidenceSourceDetail[]`.

- [ ] Step 1: Write the failing metric evidence type behavior test

Add this test to `src/services/metricEvidence.test.ts`:

```ts
it("includes safe source details for public-data, user-input, and derived values", () => {
  const evidence = createMetricEvidenceSet(
    sampleFestivalPlan,
    sampleForecastResult,
    sampleSimulationResult,
    sampleTourismContext,
    sampleTrendContext,
  );

  const demandEvidence = evidence["demand-index"];

  expect(demandEvidence.sourceDetails.map((item) => item.sourceType)).toContain(
    "tourapi",
  );
  expect(demandEvidence.sourceDetails.map((item) => item.sourceType)).toContain(
    "user-input",
  );
  expect(demandEvidence.sourceDetails.map((item) => item.sourceType)).toContain(
    "derived",
  );

  const serialized = JSON.stringify(demandEvidence.sourceDetails);

  expect(serialized).toContain("contentid");
  expect(serialized).toContain("eventStartDate");
  expect(serialized).not.toMatch(/serviceKey|clientSecret|Authorization|Cookie/i);
});
```

- [ ] Step 2: Run the focused failing test

Run:

```bash
npm run test -- src/services/metricEvidence.test.ts
```

Expected: FAIL because `sourceDetails` does not exist on `MetricEvidence`.

- [ ] Step 3: Add domain types

In `src/domain/types.ts`, add these interfaces near the existing metric evidence types:

```ts
export type EvidenceSourceType = "tourapi" | "user-input" | "derived" | "sample";

export interface EvidenceField {
  label: string;
  value: string;
}

export interface MetricEvidenceSourceRecord {
  label: string;
  fields: EvidenceField[];
}

export interface MetricEvidenceSourceDetail {
  sourceId: string;
  sourceName: string;
  sourceType: EvidenceSourceType;
  statusLabel: string;
  retrievedAt?: string;
  endpoint?: string;
  query?: EvidenceField[];
  records?: MetricEvidenceSourceRecord[];
  calculationInputs?: EvidenceField[];
  note?: string;
}
```

Then update `TourismContext`:

```ts
export interface TourismContext {
  nearbySpots: TourismSpot[];
  similarFestivals: SimilarFestival[];
  provenance: DataProvenance;
  sourceDetails?: MetricEvidenceSourceDetail[];
}
```

Then update `MetricEvidence`:

```ts
export interface MetricEvidence {
  metricId: MetricEvidenceId;
  title: string;
  summary: string;
  dataSources: string[];
  sourceDetails: MetricEvidenceSourceDetail[];
  formulaSummary: string;
  assumptions: string[];
  confidence: MetricEvidenceConfidence;
  confidenceLabel: "높음" | "보통" | "낮음";
  limitations: string[];
  contributors: MetricEvidenceContributor[];
}
```

- [ ] Step 4: Add sample TourAPI source details

In `src/data/sampleTourApi.ts`, add `sourceDetails` to `sampleTourismContext`:

```ts
sourceDetails: [
  {
    sourceId: "sample-festival-detail",
    sourceName: "TourAPI 축제 상세 샘플",
    sourceType: "tourapi",
    statusLabel: "샘플 데이터 사용",
    retrievedAt: "샘플 기준",
    endpoint: "/api/tour/detail",
    query: [{ label: "contentid", value: "sample-festival" }],
    records: [
      {
        label: "샘플 축제",
        fields: [
          { label: "contentid", value: "sample-festival" },
          { label: "title", value: "서울빛초롱축제 예시" },
          { label: "addr1", value: "서울특별시 종로구 세종대로 일대" },
          { label: "eventstartdate", value: "2026-12-01" },
          { label: "eventenddate", value: "2026-12-31" },
          { label: "mapx/mapy", value: "126.9769, 37.5759" },
        ],
      },
    ],
    note: "TourAPI 연결이 불가능한 환경에서도 데모 흐름을 확인하기 위한 샘플 근거입니다.",
  },
],
```

- [ ] Step 5: Run the focused test again

Run:

```bash
npm run test -- src/services/metricEvidence.test.ts
```

Expected: still FAIL until Task 3 adds metric evidence composition.

- [ ] Step 6: Commit

Stage only task files:

```bash
git add src/domain/types.ts src/data/sampleTourApi.ts src/services/metricEvidence.test.ts
git commit -m "feat: add evidence source detail types"
```

---

### Task 2: TourAPI Source Detail Metadata

Files:
- Modify: `src/services/tourApiAdapter.ts`
- Test: `src/services/dataAdapters.test.ts`

Interfaces:
- Consumes: `MetricEvidenceSourceDetail` from `src/domain/types.ts`.
- Produces: `FestivalCandidate.sourceDetails?: MetricEvidenceSourceDetail[]`.
- Produces: live/fallback `TourismContext.sourceDetails`.

- [ ] Step 1: Write candidate source detail test

Add this test to `src/services/dataAdapters.test.ts` near candidate lookup tests:

```ts
it("attaches safe source details to festival candidates", async () => {
  const fetchImpl = vi.fn(async () =>
    new Response(
      JSON.stringify({
        response: {
          header: { resultCode: "0000", resultMsg: "OK" },
          body: {
            items: {
              item: [
                {
                  contentid: "3439947",
                  title: "강남 미디어 윈터페스타",
                  addr1: "서울특별시 강남구",
                  eventstartdate: "20261201",
                  eventenddate: "20261231",
                  mapx: "127.0276",
                  mapy: "37.4979",
                },
              ],
            },
          },
        },
      }),
    ),
  );

  const candidates = await getFestivalCandidates(sampleFestivalPlan, {
    fetchImpl,
  });

  expect(candidates[0].sourceDetails?.[0]).toMatchObject({
    sourceName: "TourAPI 축제 후보 조회",
    sourceType: "tourapi",
    endpoint: "/api/tour/festivals",
  });
  expect(JSON.stringify(candidates[0].sourceDetails)).toContain("3439947");
  expect(JSON.stringify(candidates[0].sourceDetails)).toContain("eventStartDate");
  expect(JSON.stringify(candidates[0].sourceDetails)).not.toMatch(/serviceKey/i);
});
```

- [ ] Step 2: Write tourism context source detail test

Add this test to `src/services/dataAdapters.test.ts`:

```ts
it("keeps source details on live tourism context lookup", async () => {
  const responses = [
    tourApiPayload([{ code: "1", name: "서울" }]),
    tourApiPayload([
      {
        contentid: "3439947",
        title: "강남 미디어 윈터페스타",
        addr1: "서울특별시 강남구",
        eventstartdate: "20261201",
        eventenddate: "20261231",
      },
    ]),
    tourApiPayload([
      {
        contentid: "3439947",
        title: "강남 미디어 윈터페스타",
        addr1: "서울특별시 강남구",
        eventstartdate: "20261201",
        eventenddate: "20261231",
        mapx: "127.0276",
        mapy: "37.4979",
      },
    ]),
    tourApiPayload([
      {
        contentid: "200",
        title: "코엑스",
        contenttypeid: "12",
        addr1: "서울특별시 강남구 영동대로",
        dist: "750",
        mapx: "127.0588",
        mapy: "37.5126",
      },
    ]),
  ];
  const fetchImpl = vi.fn(async () => jsonResponse(responses.shift()));

  const tourism = await getTourismContext(sampleFestivalPlan, {
    fetchImpl: fetchImpl as unknown as typeof fetch,
  });

  const serialized = JSON.stringify(tourism.sourceDetails);

  expect(serialized).toContain("/api/tour/festivals");
  expect(serialized).toContain("/api/tour/location");
  expect(serialized).toContain("contentid");
  expect(serialized).not.toMatch(/serviceKey|clientSecret|Authorization/i);
});
```

- [ ] Step 3: Run the failing adapter tests

Run:

```bash
npm run test -- src/services/dataAdapters.test.ts
```

Expected: FAIL because candidates and tourism context do not include `sourceDetails`.

- [ ] Step 4: Implement safe source detail helpers

In `src/services/tourApiAdapter.ts`, import `MetricEvidenceSourceDetail` and add helpers near the mapping helpers:

```ts
const SENSITIVE_QUERY_KEYS = new Set([
  "serviceKey",
  "clientSecret",
  "authorization",
  "cookie",
]);

function safeQueryFields(params: Record<string, string | number | undefined>) {
  return Object.entries(params)
    .filter(([key, value]) => value !== undefined && !SENSITIVE_QUERY_KEYS.has(key))
    .map(([label, value]) => ({ label, value: String(value) }));
}

function formatTourApiDate(value?: string) {
  if (!value || value.length !== 8) return value ?? "-";
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function createTourApiSourceDetail({
  sourceId,
  sourceName,
  endpoint,
  query,
  records,
  statusLabel = "실시간 조회 성공",
  note,
}: {
  sourceId: string;
  sourceName: string;
  endpoint: string;
  query: Record<string, string | number | undefined>;
  records: MetricEvidenceSourceDetail["records"];
  statusLabel?: string;
  note?: string;
}): MetricEvidenceSourceDetail {
  return {
    sourceId,
    sourceName,
    sourceType: "tourapi",
    statusLabel,
    retrievedAt: new Date().toISOString(),
    endpoint,
    query: safeQueryFields(query),
    records,
    note,
  };
}
```

- [ ] Step 5: Add TourAPI item record mappers

Add focused record mappers in `src/services/tourApiAdapter.ts`:

```ts
function festivalRecordFields(item: TourApiItem) {
  return [
    { label: "contentid", value: item.contentid ?? "-" },
    { label: "title", value: item.title ?? "-" },
    { label: "addr1", value: item.addr1 ?? "-" },
    { label: "eventstartdate", value: formatTourApiDate(item.eventstartdate) },
    { label: "eventenddate", value: formatTourApiDate(item.eventenddate) },
    { label: "mapx/mapy", value: `${item.mapx ?? "-"}, ${item.mapy ?? "-"}` },
  ];
}

function nearbySpotRecordFields(item: TourApiItem) {
  return [
    { label: "contentid", value: item.contentid ?? "-" },
    { label: "title", value: item.title ?? "-" },
    { label: "addr1", value: item.addr1 ?? "-" },
    { label: "dist", value: item.dist ? `${item.dist}m` : "-" },
    { label: "mapx/mapy", value: `${item.mapx ?? "-"}, ${item.mapy ?? "-"}` },
  ];
}
```

- [ ] Step 6: Attach source details to candidates and tourism contexts

Update `FestivalCandidate` with:

```ts
sourceDetails?: MetricEvidenceSourceDetail[];
```

When mapping candidates, pass the candidate lookup detail into each candidate:

```ts
const sourceDetail = createTourApiSourceDetail({
  sourceId: "tourapi-festival-candidates",
  sourceName: "TourAPI 축제 후보 조회",
  endpoint: "/api/tour/festivals",
  query: festivalQueryParams,
  records: items.slice(0, 5).map((item) => ({
    label: item.title ?? item.contentid ?? "축제 후보",
    fields: festivalRecordFields(item),
  })),
});
```

Then set `candidate.sourceDetails = [sourceDetail]` or pass the detail through `mapFestivalCandidate`.

In `getTourismContext`, attach details for:

```ts
sourceDetails: [
  festivalDetailSource,
  nearbyLocationSource,
]
```

When fallback is used, call `createFallbackTourismContext(plan, reason)` and ensure it contains a sample/fallback detail.

- [ ] Step 7: Run adapter tests

Run:

```bash
npm run test -- src/services/dataAdapters.test.ts
```

Expected: PASS.

- [ ] Step 8: Commit

```bash
git add src/services/tourApiAdapter.ts src/services/dataAdapters.test.ts
git commit -m "feat: add TourAPI source details"
```

---

### Task 3: Metric Evidence Composition

Files:
- Modify: `src/services/metricEvidence.ts`
- Test: `src/services/metricEvidence.test.ts`

Interfaces:
- Consumes: `TourismContext.sourceDetails`.
- Produces: `MetricEvidence.sourceDetails` for every metric.

- [ ] Step 1: Add focused tests for metric-level distribution

Add this test to `src/services/metricEvidence.test.ts`:

```ts
it("separates user input and derived calculation evidence for budget and ROI metrics", () => {
  const evidence = createMetricEvidenceSet(
    sampleFestivalPlan,
    sampleForecastResult,
    sampleSimulationResult,
    sampleTourismContext,
    sampleTrendContext,
  );

  const budgetDetails = evidence["budget-efficiency"].sourceDetails;
  const roiDetails = evidence["economic-roi"].sourceDetails;

  expect(budgetDetails.some((item) => item.sourceType === "user-input")).toBe(true);
  expect(budgetDetails.some((item) => item.sourceType === "derived")).toBe(true);
  expect(roiDetails.some((item) => item.sourceName.includes("ROI"))).toBe(true);
  expect(JSON.stringify(roiDetails)).toContain("방문객 1인당 평균 소비");
});
```

- [ ] Step 2: Run failing metric tests

Run:

```bash
npm run test -- src/services/metricEvidence.test.ts
```

Expected: FAIL because `sourceDetails` is not composed yet.

- [ ] Step 3: Add reusable source detail helpers

In `src/services/metricEvidence.ts`, add helpers before `createMetricEvidenceSet`:

```ts
function planInputDetails(plan: FestivalPlan): MetricEvidence["sourceDetails"] {
  return [
    {
      sourceId: "user-plan-inputs",
      sourceName: "축제 기획안 입력값",
      sourceType: "user-input",
      statusLabel: "사용자 입력 기준",
      calculationInputs: [
        { label: "축제명", value: plan.name },
        { label: "지역", value: plan.region },
        { label: "행사장", value: plan.venueAddress },
        { label: "기간", value: `${plan.startDate} ~ ${plan.endDate}` },
        {
          label: "총 예산",
          value: `${plan.totalBudgetMillionKrw.toLocaleString("ko-KR")}백만원`,
        },
        {
          label: "수용 인원",
          value: `${plan.expectedCapacity.toLocaleString("ko-KR")}명`,
        },
      ],
    },
  ];
}

function derivedForecastDetails(
  forecast: ForecastResult,
  simulation: SimulationResult,
): MetricEvidence["sourceDetails"] {
  const peakVisitors = Math.max(
    ...forecast.visitorsByHour.map((item) => item.visitors),
    0,
  );

  return [
    {
      sourceId: "derived-forecast-simulation",
      sourceName: "예측 및 시뮬레이션 산출값",
      sourceType: "derived",
      statusLabel: "시스템 산출값",
      calculationInputs: [
        {
          label: "예상 방문객",
          value: `${forecast.expectedVisitors.toLocaleString("ko-KR")}명`,
        },
        { label: "피크 시간", value: `${forecast.peakHour}:00` },
        {
          label: "피크 시간대 방문객",
          value: `${peakVisitors.toLocaleString("ko-KR")}명`,
        },
        {
          label: "혼잡도 기준 시간",
          value: `${simulation.hour}:00`,
        },
        {
          label: "병목 후보",
          value: `${simulation.bottlenecks.length.toLocaleString("ko-KR")}곳`,
        },
      ],
    },
  ];
}
```

- [ ] Step 4: Add ROI source detail helper

Add:

```ts
function economicDerivedDetails(
  economy: ReturnType<typeof createEconomicImpactMetrics>,
): MetricEvidence["sourceDetails"] {
  return [
    {
      sourceId: "derived-economic-roi",
      sourceName: "ROI 경제효과 산출값",
      sourceType: "derived",
      statusLabel: "시스템 산출값",
      calculationInputs: [
        {
          label: "총 투입 예산",
          value: `${economy.totalBudgetKrw.toLocaleString("ko-KR")}원`,
        },
        {
          label: "예상 지역 소비 창출액",
          value: `${economy.expectedLocalSpendingKrw.toLocaleString("ko-KR")}원`,
        },
        {
          label: "방문객 1인당 평균 소비",
          value: `${economy.averageSpendPerVisitorKrw.toLocaleString("ko-KR")}원`,
        },
        {
          label: "ROI",
          value: `${economy.roiMultiplier.toFixed(1)}배`,
        },
      ],
      note: "평균 소비 단가는 현재 데모의 공공데이터 기반 예시 가정값이며, 실제 지자체 소비 데이터가 연결되면 교체할 수 있습니다.",
    },
  ];
}
```

- [ ] Step 5: Add source details to every evidence object

Inside `createMetricEvidenceSet`, define:

```ts
const tourApiDetails = tourism.sourceDetails ?? [];
const userInputDetails = planInputDetails(plan);
const forecastDerivedDetails = derivedForecastDetails(forecast, simulation);
const roiDetails = economicDerivedDetails(economy);
const commonSourceDetails = [
  ...tourApiDetails,
  ...userInputDetails,
  ...forecastDerivedDetails,
];
```

Then add `sourceDetails` to every metric. Use:

```ts
sourceDetails: commonSourceDetails,
```

For budget efficiency:

```ts
sourceDetails: [...userInputDetails, ...forecastDerivedDetails],
```

For economic ROI:

```ts
sourceDetails: [...userInputDetails, ...forecastDerivedDetails, ...roiDetails],
```

For commercial spillover:

```ts
sourceDetails: [...tourApiDetails, ...userInputDetails],
```

- [ ] Step 6: Run metric evidence tests

Run:

```bash
npm run test -- src/services/metricEvidence.test.ts
```

Expected: PASS.

- [ ] Step 7: Commit

```bash
git add src/services/metricEvidence.ts src/services/metricEvidence.test.ts
git commit -m "feat: compose metric source details"
```

---

### Task 4: Evidence Drawer UI

Files:
- Modify: `src/components/MetricEvidenceDrawer.tsx`
- Modify: `src/styles.css`
- Test: `src/App.test.tsx`

Interfaces:
- Consumes: `MetricEvidence.sourceDetails`.
- Produces: visible `사용 데이터 상세` section in the drawer.

- [ ] Step 1: Add UI behavior test

Add or extend an evidence drawer test in `src/App.test.tsx`:

```ts
it("shows exact source detail records in the evidence drawer", async () => {
  render(<App />);

  await screen.findByText(/축제 기획안 입력/);

  await userEvent.click(screen.getAllByRole("button", { name: /근거 보기/ })[0]);

  expect(await screen.findByText("사용 데이터 상세")).toBeInTheDocument();
  expect(screen.getByText(/TourAPI/)).toBeInTheDocument();
  expect(screen.getByText(/contentid/)).toBeInTheDocument();
  expect(screen.getByText(/사용자 입력 기준/)).toBeInTheDocument();
  expect(screen.getByText(/시스템 산출값/)).toBeInTheDocument();
});
```

If existing button accessible names differ, use the current evidence button query already present in `src/App.test.tsx`.

- [ ] Step 2: Run the failing UI test

Run:

```bash
npm run test -- src/App.test.tsx
```

Expected: FAIL until drawer renders source details.

- [ ] Step 3: Render source details in drawer

In `src/components/MetricEvidenceDrawer.tsx`, add this section after the `사용 데이터` section:

```tsx
{evidence.sourceDetails.length > 0 ? (
  <div className="evidence-section">
    <h3>사용 데이터 상세</h3>
    <div className="source-detail-list">
      {evidence.sourceDetails.map((source) => (
        <article className="source-detail-card" key={source.sourceId}>
          <div className="source-detail-heading">
            <div>
              <strong>{source.sourceName}</strong>
              {source.endpoint ? <span>{source.endpoint}</span> : null}
            </div>
            <em className={`source-type source-type-${source.sourceType}`}>
              {source.statusLabel}
            </em>
          </div>

          {source.retrievedAt ? (
            <p className="source-detail-meta">조회 기준: {source.retrievedAt}</p>
          ) : null}

          {source.query && source.query.length > 0 ? (
            <dl className="source-detail-grid">
              {source.query.map((field) => (
                <div key={`${source.sourceId}-query-${field.label}`}>
                  <dt>{field.label}</dt>
                  <dd>{field.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {source.records?.slice(0, 5).map((record) => (
            <div className="source-record" key={`${source.sourceId}-${record.label}`}>
              <b>{record.label}</b>
              <dl className="source-detail-grid">
                {record.fields.map((field) => (
                  <div key={`${source.sourceId}-${record.label}-${field.label}`}>
                    <dt>{field.label}</dt>
                    <dd>{field.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}

          {source.calculationInputs && source.calculationInputs.length > 0 ? (
            <dl className="source-detail-grid">
              {source.calculationInputs.map((field) => (
                <div key={`${source.sourceId}-input-${field.label}`}>
                  <dt>{field.label}</dt>
                  <dd>{field.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {source.note ? <p className="source-detail-note">{source.note}</p> : null}
        </article>
      ))}
    </div>
  </div>
) : null}
```

- [ ] Step 4: Add drawer styles

In `src/styles.css`, add:

```css
.source-detail-list {
  display: grid;
  gap: 10px;
}

.source-detail-card {
  border: 1px solid #d8e3f2;
  border-radius: 8px;
  background: #f8fbff;
  padding: 12px;
}

.source-detail-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.source-detail-heading strong {
  display: block;
  color: #14365d;
  font-size: 0.9rem;
}

.source-detail-heading span,
.source-detail-meta,
.source-detail-note {
  color: #64748b;
  font-size: 0.78rem;
}

.source-type {
  border-radius: 999px;
  padding: 3px 8px;
  background: #e8f1ff;
  color: #1d4ed8;
  font-size: 0.72rem;
  font-style: normal;
  white-space: nowrap;
}

.source-type-sample {
  background: #fff7ed;
  color: #c2410c;
}

.source-type-user-input {
  background: #ecfdf5;
  color: #047857;
}

.source-type-derived {
  background: #f1f5f9;
  color: #334155;
}

.source-detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
  margin: 10px 0 0;
}

.source-detail-grid div {
  min-width: 0;
}

.source-detail-grid dt {
  color: #64748b;
  font-size: 0.72rem;
}

.source-detail-grid dd {
  margin: 2px 0 0;
  color: #0f172a;
  font-size: 0.8rem;
  overflow-wrap: anywhere;
}

.source-record {
  margin-top: 10px;
  border-top: 1px solid #e2e8f0;
  padding-top: 10px;
}

.source-record b {
  color: #1e293b;
  font-size: 0.82rem;
}
```

- [ ] Step 5: Run UI test

Run:

```bash
npm run test -- src/App.test.tsx
```

Expected: PASS.

- [ ] Step 6: Commit

```bash
git add src/components/MetricEvidenceDrawer.tsx src/styles.css src/App.test.tsx
git commit -m "feat: show source details in evidence drawer"
```

---

### Task 5: Documentation, Full Verification, GitHub Push, Remote Deploy

Files:
- Modify: `docs/data-methodology.md`
- Optional modify: `README.md`

Interfaces:
- Consumes: completed app behavior from Tasks 1-4.
- Produces: verified local build, pushed commit history, deployed Docker service.

- [ ] Step 1: Update methodology document

Add a section to `docs/data-methodology.md`:

```md
## 사용 데이터 상세 근거

Fest-Twin은 주요 지표의 `근거 보기` 패널에서 데이터 출처 요약뿐 아니라 실제 산출에 사용된 데이터의 상세 근거를 함께 표시한다.

- TourAPI 조회 근거: 내부 프록시 경로, 지역/기간/반경 등 안전한 조회 조건, 응답 상태, 사용 레코드의 `contentid`, 제목, 주소, 기간, 좌표
- 사용자 입력 근거: 계획 지역, 행사장, 기간, 총 예산, 수용 인원, 선택 시간대
- 파생 계산 근거: 예상 방문객, 피크 시간대 방문객, 최고 혼잡도, 방문객 1인당 예산, ROI 입력값
- 보완 데이터 근거: 실시간 API가 실패하거나 일부 필드가 비어 있을 때 사용한 샘플/보완값과 그 사유

API 키, 시크릿, 인증 헤더, 쿠키, 내부 환경변수 값은 화면과 문서에 표시하지 않는다. 원본 API 응답 전체가 아니라 심사와 검토에 필요한 최소 필드만 정규화하여 제공한다.
```

- [ ] Step 2: Run full tests

Run:

```bash
npm run test
```

Expected: all test files pass.

- [ ] Step 3: Run production build

Run:

```bash
$env:VITE_VWORLD_API_KEY='your_vworld_api_key'; npm run build
```

Expected: Vite build completes and `dist` is generated.

- [ ] Step 4: Check git status and stage only intended files

Run:

```bash
git status --short
```

Expected: intended feature files plus pre-existing unrelated dirty files. Stage only:

```bash
git add docs/data-methodology.md
```

If `README.md` was intentionally updated in this task, stage it only after confirming unrelated edits are not being mixed.

- [ ] Step 5: Commit docs

Run:

```bash
git commit -m "docs: document source detail evidence"
```

- [ ] Step 6: Push to GitHub

Run:

```bash
git push origin main
```

Expected: `main` pushed to `https://github.com/raphael7450-ops/Fest-Twin`.

- [ ] Step 7: Deploy remote Docker

Use the established server flow. Build a new image archive from the verified local source, copy it to `100.104.94.112`, load it, and restart `fest-twin-demo` with the env file preserved:

```bash
docker run -d --name fest-twin-demo --restart unless-stopped --env-file /home/cwuser/fest-twin-demo.env -p 18080:80 --label com.fest-twin.managed-by=fest-twin-internal-demo fest-twin-demo:<new-tag>
```

The `--env-file /home/cwuser/fest-twin-demo.env` flag is required so TourAPI lookup keeps working.

- [ ] Step 8: Verify public deployment

Verify:

```bash
curl https://cwserver.tail97dbc3.ts.net/api/tour/area-code?numOfRows=17&pageNo=1
curl https://cwserver.tail97dbc3.ts.net/
```

Expected:

- Area-code API returns TourAPI result code `0000`.
- Public page includes the updated bundle.
- In the browser, opening `근거 보기` shows `사용 데이터 상세`, source status, query conditions, and safe record fields.

- [ ] Step 9: Final status

Report:

- local tests passed
- production build passed
- GitHub push completed
- remote Docker deployment completed
- public URL verified
- any remaining unrelated dirty files were left untouched
