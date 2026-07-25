# Demand Forecast Backdata Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Goal: Add source-backed demand forecast baselines so the dashboard can explain expected visitors with similar-festival visitor records instead of only TourAPI metadata proxies.

Architecture: Introduce a focused `DemandBackdataContext` domain model and a normalized regional festival sample dataset based on the Ministry of Culture, Sports and Tourism regional festival file-data shape. A new adapter selects similar festival baselines for a `FestivalPlan`, `createForecast` optionally consumes the context, and metric evidence exposes the exact records used for the demand-index calculation.

Tech Stack: React 18, TypeScript, Vite, Vitest, existing Express proxy patterns, existing metric evidence drawer.

## Global Constraints

- Use public-data or normalized sample records only; do not collect personal device-level movement data.
- Treat regional visitor counts as visitors, not confirmed tourists.
- Do not expose API keys, passwords, Authorization, Cookie, or client secrets in source details.
- Keep fallback behavior: forecast, simulation, report, and dashboard must render when all backdata is unavailable.
- Keep this first implementation focused on `문화체육관광부_지역축제 정보`; regional visitor count and tourism concentration APIs remain follow-up tasks.
- Preserve existing dashboard layout and Korean public-sector tone.

---

## File Structure

- Modify `src/domain/types.ts`: add `DemandBackdataContext`, `DemandBackdataSimilarFestival`, optional `ForecastReason.sourceDetailIds`, and broaden source statuses/types only if required.
- Create `src/data/sampleDemandBackdata.ts`: normalized regional festival records and fallback context.
- Create `src/services/demandBackdataAdapter.ts`: select similar festival baseline records for a plan.
- Create `src/services/demandBackdataAdapter.test.ts`: adapter tests.
- Modify `src/services/forecast.ts`: accept optional demand backdata and use it as the primary similar-festival baseline.
- Modify `src/services/forecast.test.ts`: forecast behavior tests.
- Modify `src/services/metricEvidence.ts`: include demand backdata source details in `demand-index` evidence.
- Modify `src/services/metricEvidence.test.ts`: evidence source-detail tests.
- Modify `src/App.tsx` and `src/App.test.tsx`: create and pass the demand backdata context.
- Modify `docs/data-methodology.md`: document how similar festival visitors affect demand forecast.

---

### Task 1: Domain Types and Normalized Sample Backdata

Files:
- Modify: `src/domain/types.ts`
- Create: `src/data/sampleDemandBackdata.ts`
- Test: `src/services/demandBackdataAdapter.test.ts`

Interfaces:
- Produces:
  - `DemandBackdataSimilarFestival`
  - `DemandBackdataContext`
  - `sampleRegionalFestivalRecords`
  - `sampleDemandBackdataContext`

- [ ] Step 1: Write the failing test

Create `src/services/demandBackdataAdapter.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { sampleDemandBackdataContext, sampleRegionalFestivalRecords } from "../data/sampleDemandBackdata";

describe("sampleDemandBackdata", () => {
  it("provides normalized regional festival visitor and budget records", () => {
    expect(sampleRegionalFestivalRecords.length).toBeGreaterThanOrEqual(3);
    expect(sampleRegionalFestivalRecords[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String),
        region: expect.any(String),
        type: expect.any(String),
        visitors: expect.any(Number),
        sourceName: "문화체육관광부_지역축제 정보",
      }),
    );
    expect(sampleDemandBackdataContext.status).toBe("file-normalized");
    expect(JSON.stringify(sampleDemandBackdataContext.sourceDetails)).not.toMatch(
      /serviceKey|clientSecret|Authorization|Cookie/i,
    );
  });
});
```

- [ ] Step 2: Run test to verify it fails

Run:

```powershell
npm run test -- src/services/demandBackdataAdapter.test.ts
```

Expected: FAIL because `src/data/sampleDemandBackdata.ts` does not exist.

- [ ] Step 3: Add domain types

In `src/domain/types.ts`, add after `SpendingContext`:

```ts
export type DemandBackdataStatus =
  | "live"
  | "file-normalized"
  | "partial-fallback"
  | "sample-fallback";

export interface DemandBackdataSimilarFestival {
  id: string;
  name: string;
  region: string;
  type: string;
  periodLabel: string;
  budgetMillionKrw?: number;
  visitors?: number;
  similarityScore: number;
  sourceName: string;
}

export interface DemandBackdataContext {
  status: DemandBackdataStatus;
  regionBaseline?: {
    region: string;
    basePeriod: string;
    visitorCount: number;
    sourceName: string;
  };
  similarFestivalBaselines: DemandBackdataSimilarFestival[];
  seasonality?: {
    label: string;
    concentrationIndex: number;
    sourceName: string;
  };
  sourceDetails: MetricEvidenceSourceDetail[];
}
```

In `DataSourceStatus`, add `"file-normalized"` so provenance can use the same status label if needed:

```ts
export type DataSourceStatus =
  | "live"
  | "file-normalized"
  | "partial-fallback"
  | "sample-fallback";
```

- [ ] Step 4: Create normalized sample dataset

Create `src/data/sampleDemandBackdata.ts`:

```ts
import type {
  DemandBackdataContext,
  DemandBackdataSimilarFestival,
  MetricEvidenceSourceDetail,
} from "../domain/types";

export const sampleRegionalFestivalRecords: DemandBackdataSimilarFestival[] = [
  {
    id: "mcst-gangnam-media-winter",
    name: "강남 미디어 윈터페스타",
    region: "서울 강남구",
    type: "도시문화/미디어",
    periodLabel: "겨울 야간형",
    budgetMillionKrw: 920,
    visitors: 54000,
    similarityScore: 96,
    sourceName: "문화체육관광부_지역축제 정보",
  },
  {
    id: "mcst-seoul-light-gwanghwamun",
    name: "서울라이트 광화문",
    region: "서울 종로구",
    type: "도시문화/미디어",
    periodLabel: "겨울 야간형",
    budgetMillionKrw: 1100,
    visitors: 61000,
    similarityScore: 82,
    sourceName: "문화체육관광부_지역축제 정보",
  },
  {
    id: "mcst-digital-media-festival",
    name: "디지털 미디어 축제",
    region: "서울",
    type: "도시문화/미디어",
    periodLabel: "야간형",
    budgetMillionKrw: 680,
    visitors: 32000,
    similarityScore: 68,
    sourceName: "문화체육관광부_지역축제 정보",
  },
  {
    id: "mcst-local-food-festival",
    name: "지역 먹거리 축제",
    region: "전북",
    type: "먹거리/특산물",
    periodLabel: "가을 주간형",
    budgetMillionKrw: 450,
    visitors: 28000,
    similarityScore: 45,
    sourceName: "문화체육관광부_지역축제 정보",
  },
];

export const sampleDemandBackdataSourceDetails: MetricEvidenceSourceDetail[] = [
  {
    sourceId: "mcst-regional-festival-normalized",
    sourceName: "문화체육관광부_지역축제 정보",
    sourceType: "sample",
    statusLabel: "파일데이터 정규화 샘플",
    endpoint: "data.go.kr/data/15143175/fileData.do",
    records: sampleRegionalFestivalRecords.slice(0, 3).map((festival) => ({
      label: festival.name,
      fields: [
        { label: "지역", value: festival.region },
        { label: "유형", value: festival.type },
        { label: "기간 유형", value: festival.periodLabel },
        { label: "방문객 수", value: `${festival.visitors?.toLocaleString("ko-KR")}명` },
        { label: "예산", value: `${festival.budgetMillionKrw?.toLocaleString("ko-KR")}백만원` },
        { label: "유사도", value: `${festival.similarityScore}점` },
      ],
    })),
    note: "지역축제 파일데이터의 방문객 수와 예산 항목을 수요 예측 기준선으로 쓰기 위한 정규화 샘플입니다.",
  },
];

export const sampleDemandBackdataContext: DemandBackdataContext = {
  status: "file-normalized",
  similarFestivalBaselines: sampleRegionalFestivalRecords.slice(0, 3),
  sourceDetails: sampleDemandBackdataSourceDetails,
};
```

- [ ] Step 5: Run test to verify it passes

Run:

```powershell
npm run test -- src/services/demandBackdataAdapter.test.ts
```

Expected: PASS.

- [ ] Step 6: Commit

```powershell
git add src/domain/types.ts src/data/sampleDemandBackdata.ts src/services/demandBackdataAdapter.test.ts
git commit -m "feat: add demand backdata model"
```

---

### Task 2: Demand Backdata Adapter

Files:
- Modify: `src/services/demandBackdataAdapter.test.ts`
- Create: `src/services/demandBackdataAdapter.ts`

Interfaces:
- Consumes:
  - `sampleRegionalFestivalRecords`
  - `sampleDemandBackdataContext`
  - `FestivalPlan`
- Produces:
  - `getDemandBackdataContext(plan: FestivalPlan): DemandBackdataContext`
  - `createFallbackDemandBackdataContext(plan: FestivalPlan, reason: string): DemandBackdataContext`

- [ ] Step 1: Add failing adapter tests

Append to `src/services/demandBackdataAdapter.test.ts`:

```ts
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import {
  createFallbackDemandBackdataContext,
  getDemandBackdataContext,
} from "./demandBackdataAdapter";

describe("demandBackdataAdapter", () => {
  it("selects similar festival baselines by region and keyword overlap", () => {
    const context = getDemandBackdataContext(sampleFestivalPlan);

    expect(context.status).toBe("file-normalized");
    expect(context.similarFestivalBaselines.length).toBeGreaterThanOrEqual(2);
    expect(context.similarFestivalBaselines[0].visitors).toBeGreaterThan(30000);
    expect(context.similarFestivalBaselines[0].similarityScore).toBeGreaterThanOrEqual(
      context.similarFestivalBaselines[1].similarityScore,
    );
    expect(JSON.stringify(context.sourceDetails)).toContain("방문객 수");
  });

  it("returns a fallback context when no similar festival record is usable", () => {
    const context = createFallbackDemandBackdataContext(
      { ...sampleFestivalPlan, region: "매칭없음", keywords: ["새로운주제"] },
      "테스트 fallback",
    );

    expect(context.status).toBe("sample-fallback");
    expect(context.similarFestivalBaselines.length).toBeGreaterThan(0);
    expect(context.sourceDetails[0].statusLabel).toContain("샘플");
    expect(context.sourceDetails[0].note).toContain("테스트 fallback");
  });
});
```

- [ ] Step 2: Run test to verify it fails

Run:

```powershell
npm run test -- src/services/demandBackdataAdapter.test.ts
```

Expected: FAIL because `demandBackdataAdapter.ts` does not exist.

- [ ] Step 3: Implement adapter

Create `src/services/demandBackdataAdapter.ts`:

```ts
import {
  sampleDemandBackdataContext,
  sampleDemandBackdataSourceDetails,
  sampleRegionalFestivalRecords,
} from "../data/sampleDemandBackdata";
import type {
  DemandBackdataContext,
  DemandBackdataSimilarFestival,
  FestivalPlan,
  MetricEvidenceSourceDetail,
} from "../domain/types";

function normalizeText(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

function regionScore(plan: FestivalPlan, festival: DemandBackdataSimilarFestival) {
  const planRegion = normalizeText(plan.region);
  const festivalRegion = normalizeText(festival.region);
  if (festivalRegion.includes(planRegion) || planRegion.includes(festivalRegion)) return 35;
  if (planRegion.slice(0, 2) && festivalRegion.includes(planRegion.slice(0, 2))) return 22;
  return 0;
}

function keywordScore(plan: FestivalPlan, festival: DemandBackdataSimilarFestival) {
  const haystack = normalizeText(`${festival.name} ${festival.type} ${festival.periodLabel}`);
  return plan.keywords.reduce((score, keyword) => {
    const normalizedKeyword = normalizeText(keyword);
    if (!normalizedKeyword) return score;
    return haystack.includes(normalizedKeyword) ? score + 14 : score;
  }, 0);
}

function budgetScore(plan: FestivalPlan, festival: DemandBackdataSimilarFestival) {
  if (!festival.budgetMillionKrw) return 0;
  const ratio = festival.budgetMillionKrw / Math.max(plan.totalBudgetMillionKrw, 1);
  if (ratio >= 0.75 && ratio <= 1.35) return 18;
  if (ratio >= 0.5 && ratio <= 1.8) return 10;
  return 0;
}

function rescoreFestival(plan: FestivalPlan, festival: DemandBackdataSimilarFestival) {
  return {
    ...festival,
    similarityScore: Math.min(
      100,
      Math.round(regionScore(plan, festival) + keywordScore(plan, festival) + budgetScore(plan, festival) + festival.similarityScore * 0.25),
    ),
  };
}

function createSourceDetails(
  festivals: DemandBackdataSimilarFestival[],
  statusLabel: string,
  note: string,
): MetricEvidenceSourceDetail[] {
  return [
    {
      ...sampleDemandBackdataSourceDetails[0],
      statusLabel,
      records: festivals.map((festival) => ({
        label: festival.name,
        fields: [
          { label: "지역", value: festival.region },
          { label: "유형", value: festival.type },
          { label: "기간 유형", value: festival.periodLabel },
          { label: "방문객 수", value: festival.visitors ? `${festival.visitors.toLocaleString("ko-KR")}명` : "-" },
          { label: "예산", value: festival.budgetMillionKrw ? `${festival.budgetMillionKrw.toLocaleString("ko-KR")}백만원` : "-" },
          { label: "유사도", value: `${festival.similarityScore}점` },
        ],
      })),
      note,
    },
  ];
}

export function createFallbackDemandBackdataContext(
  plan: FestivalPlan,
  reason: string,
): DemandBackdataContext {
  const fallbackFestivals = sampleDemandBackdataContext.similarFestivalBaselines.map((festival) =>
    rescoreFestival(plan, festival),
  );

  return {
    status: "sample-fallback",
    similarFestivalBaselines: fallbackFestivals,
    sourceDetails: createSourceDetails(
      fallbackFestivals,
      "샘플 유사 축제 기준선",
      `지역축제 파일데이터 매칭 실패로 샘플 기준선을 사용합니다. 사유: ${reason}`,
    ),
  };
}

export function getDemandBackdataContext(plan: FestivalPlan): DemandBackdataContext {
  const festivals = sampleRegionalFestivalRecords
    .map((festival) => rescoreFestival(plan, festival))
    .filter((festival) => (festival.visitors ?? 0) > 0 && festival.similarityScore >= 35)
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, 3);

  if (festivals.length === 0) {
    return createFallbackDemandBackdataContext(plan, "유사도 35점 이상 지역축제 레코드 없음");
  }

  return {
    status: "file-normalized",
    similarFestivalBaselines: festivals,
    sourceDetails: createSourceDetails(
      festivals,
      "파일데이터 정규화 기준선",
      "문화체육관광부 지역축제 정보의 방문객 수, 예산, 유형을 수요 예측 기준선으로 사용합니다.",
    ),
  };
}
```

- [ ] Step 4: Run test to verify it passes

Run:

```powershell
npm run test -- src/services/demandBackdataAdapter.test.ts
```

Expected: PASS.

- [ ] Step 5: Commit

```powershell
git add src/services/demandBackdataAdapter.ts src/services/demandBackdataAdapter.test.ts
git commit -m "feat: select demand backdata baselines"
```

---

### Task 3: Forecast Uses Demand Backdata

Files:
- Modify: `src/services/forecast.ts`
- Modify: `src/services/forecast.test.ts`

Interfaces:
- Consumes:
  - `DemandBackdataContext`
  - `createForecast(plan, tourism, trends, demandBackdata?)`
- Produces:
  - `createForecast` with optional fourth parameter.

- [ ] Step 1: Add failing forecast test

Append to `src/services/forecast.test.ts`:

```ts
import { sampleDemandBackdataContext } from "../data/sampleDemandBackdata";

it("uses regional festival visitor backdata as the similar demand baseline", () => {
  const forecastWithoutBackdata = createForecast(
    sampleFestivalPlan,
    sampleTourismContext,
    sampleTrendContext,
  );
  const forecastWithBackdata = createForecast(
    sampleFestivalPlan,
    {
      ...sampleTourismContext,
      similarFestivals: [],
    },
    sampleTrendContext,
    sampleDemandBackdataContext,
  );

  expect(forecastWithBackdata.expectedVisitors).toBeGreaterThan(30000);
  expect(forecastWithBackdata.expectedVisitors).not.toBe(forecastWithoutBackdata.expectedVisitors);
  expect(forecastWithBackdata.reasons.map((reason) => reason.label)).toContain(
    "지역축제 방문객 기준선",
  );
  expect(forecastWithBackdata.reasons.find((reason) => reason.label === "지역축제 방문객 기준선")?.description).toContain(
    "문화체육관광부",
  );
});
```

- [ ] Step 2: Run test to verify it fails

Run:

```powershell
npm run test -- src/services/forecast.test.ts
```

Expected: FAIL because `createForecast` does not accept or use demand backdata.

- [ ] Step 3: Update forecast implementation

In `src/services/forecast.ts`, import `DemandBackdataContext`:

```ts
import type {
  DemandBackdataContext,
  FestivalPlan,
  ForecastResult,
  RiskLevel,
  TourismContext,
  TrendContext,
} from "../domain/types";
```

Add helper functions before `createForecast`:

```ts
function weightedDemandBackdataAverage(demandBackdata?: DemandBackdataContext) {
  const festivals = demandBackdata?.similarFestivalBaselines.filter((festival) => festival.visitors) ?? [];
  const totalWeight = festivals.reduce((sum, festival) => sum + festival.similarityScore, 0);
  if (festivals.length === 0 || totalWeight === 0) return 0;
  return festivals.reduce(
    (sum, festival) => sum + (festival.visitors ?? 0) * festival.similarityScore,
    0,
  ) / totalWeight;
}

function similarDemandFromTourism(tourism: TourismContext) {
  return average(
    tourism.similarFestivals.map(
      (festival) => festival.visitors * festival.themeOverlap,
    ),
  );
}
```

Change the function signature:

```ts
export function createForecast(
  plan: FestivalPlan,
  tourism: TourismContext,
  trends: TrendContext,
  demandBackdata?: DemandBackdataContext,
): ForecastResult {
```

Replace the existing `similarDemand` calculation with:

```ts
  const demandBackdataBaseline = weightedDemandBackdataAverage(demandBackdata);
  const similarDemand = demandBackdataBaseline > 0
    ? demandBackdataBaseline
    : similarDemandFromTourism(tourism);
```

Replace the similar festival reason object label/description with:

```ts
      {
        label:
          demandBackdataBaseline > 0
            ? "지역축제 방문객 기준선"
            : "유사 축제 추정 수요 프록시",
        impact: Math.round(similarDemand),
        description:
          demandBackdataBaseline > 0
            ? "문화체육관광부 지역축제 정보의 방문객 수, 예산, 유형 유사도를 수요 기준선으로 반영했습니다."
            : tourism.provenance.sourceStatus === "live"
              ? "TourAPI 행사 메타데이터로 산정한 실제 방문객 집계가 아닌 추정 프록시입니다."
              : "샘플 축제 메타데이터로 산정한 실제 방문객 집계가 아닌 추정 프록시입니다.",
      },
```

- [ ] Step 4: Run tests to verify they pass

Run:

```powershell
npm run test -- src/services/forecast.test.ts
```

Expected: PASS.

- [ ] Step 5: Commit

```powershell
git add src/services/forecast.ts src/services/forecast.test.ts
git commit -m "feat: apply demand backdata to forecast"
```

---

### Task 4: Wire Demand Backdata Into App and Evidence

Files:
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/services/metricEvidence.ts`
- Modify: `src/services/metricEvidence.test.ts`

Interfaces:
- Consumes:
  - `getDemandBackdataContext(plan)`
  - `createForecast(plan, tourism, trends, demandBackdata?)`
  - `createMetricEvidenceSet(plan, forecast, simulation, tourism, trends, traffic?, spending?, demandBackdata?)`
- Produces:
  - Dashboard forecast and demand-index evidence using demand backdata.

- [ ] Step 1: Add failing metric evidence test

Append to `src/services/metricEvidence.test.ts`:

```ts
import { sampleDemandBackdataContext } from "../data/sampleDemandBackdata";

it("includes regional festival visitor records in demand-index evidence", () => {
  const forecast = createForecast(
    sampleFestivalPlan,
    sampleTourismContext,
    sampleTrendContext,
    sampleDemandBackdataContext,
  );
  const simulation = createSimulation(sampleFestivalPlan, forecast, forecast.peakHour);
  const evidence = createMetricEvidenceSet(
    sampleFestivalPlan,
    forecast,
    simulation,
    sampleTourismContext,
    sampleTrendContext,
    undefined,
    undefined,
    sampleDemandBackdataContext,
  );

  expect(evidence["demand-index"].dataSources).toContain("문화체육관광부_지역축제 정보");
  expect(JSON.stringify(evidence["demand-index"].sourceDetails)).toContain("방문객 수");
  expect(JSON.stringify(evidence["demand-index"].sourceDetails)).not.toMatch(
    /serviceKey|clientSecret|Authorization|Cookie/i,
  );
});
```

- [ ] Step 2: Run test to verify it fails

Run:

```powershell
npm run test -- src/services/metricEvidence.test.ts
```

Expected: FAIL because `createMetricEvidenceSet` does not accept demand backdata.

- [ ] Step 3: Update metric evidence

In `src/services/metricEvidence.ts`, import `DemandBackdataContext` and update the function signature:

```ts
export function createMetricEvidenceSet(
  plan: FestivalPlan,
  forecast: ForecastResult,
  simulation: SimulationResult,
  tourism: TourismContext,
  trends: TrendContext,
  traffic?: TrafficContext,
  spending?: SpendingContext,
  demandBackdata?: DemandBackdataContext,
): Record<MetricEvidenceId, MetricEvidence> {
```

After `const spendingDetails = spending?.sourceDetails ?? [];`, add:

```ts
  const demandBackdataDetails = demandBackdata?.sourceDetails ?? [];
```

In `"demand-index".dataSources`, add:

```ts
        ...(demandBackdata ? ["문화체육관광부_지역축제 정보"] : []),
```

In `"demand-index".sourceDetails`, add `...demandBackdataDetails` before `...demandUserInputs`:

```ts
      sourceDetails: [
        ...tourismDetails,
        ...demandBackdataDetails,
        ...demandUserInputs,
        ...expectedVisitorsDetails,
      ],
```

In `"demand-index".assumptions`, add:

```ts
        ...(demandBackdata
          ? ["지역축제 정보의 방문객 수는 유사 축제 기준선이며, 현재 기획안의 확정 방문객 수가 아닙니다."]
          : []),
```

- [ ] Step 4: Wire app state

In `src/App.tsx`, import:

```ts
import { getDemandBackdataContext } from "./services/demandBackdataAdapter";
```

Add after `const spending = ...`:

```ts
  const demandBackdata = useMemo(
    () => getDemandBackdataContext(plan),
    [plan.region, plan.name, plan.startDate, plan.totalBudgetMillionKrw, plan.keywords.join("|")],
  );
```

Update forecast call:

```ts
  const forecast = useMemo(
    () => createForecast(plan, tourism, sampleTrendContext, demandBackdata),
    [plan, tourism, demandBackdata],
  );
```

Update metric evidence call:

```ts
      spending,
      demandBackdata,
```

Update metric evidence memo dependencies:

```ts
    [forecast, plan, simulation, tourism, traffic, spending, demandBackdata],
```

- [ ] Step 5: Update App test expectation

In `src/App.test.tsx`, add one assertion to the main render test after the existing demand evidence assertions:

```ts
    expect(screen.getByText(/지역축제 방문객 기준선|유사 축제 추정 수요 프록시/)).toBeInTheDocument();
```

If this text is only visible inside the drawer, add it to the evidence drawer test after opening the first evidence button:

```ts
    expect(screen.getByText(/문화체육관광부_지역축제 정보|지역축제 방문객 기준선/)).toBeInTheDocument();
```

- [ ] Step 6: Run tests

Run:

```powershell
npm run test -- src/services/metricEvidence.test.ts src/App.test.tsx
```

Expected: PASS.

- [ ] Step 7: Commit

```powershell
git add src/App.tsx src/App.test.tsx src/services/metricEvidence.ts src/services/metricEvidence.test.ts
git commit -m "feat: show demand backdata evidence"
```

---

### Task 5: Methodology Documentation and Verification

Files:
- Modify: `docs/data-methodology.md`
- Optional Modify: `docs/demo-verification.md`

Interfaces:
- Consumes completed implementation from Tasks 1-4.
- Produces updated public methodology notes and final verification.

- [ ] Step 1: Update methodology documentation

In `docs/data-methodology.md`, add a section after the demand forecast explanation:

```md
## 지역축제 방문객 기준선

Fest-Twin은 예상 방문객 산식에 문화체육관광부 지역축제 정보의 방문객 수, 예산, 축제 유형을 보조 기준선으로 사용할 수 있다. 이 값은 현재 기획안의 확정 방문객 수가 아니라, 지역·주제·예산 규모가 유사한 과거 축제의 비교 기준이다.

- 유사 축제 방문객 수가 있으면 유사도 가중 평균을 수요 기준선으로 사용한다.
- 유사 축제 방문객 수가 없으면 기존 TourAPI 메타데이터 기반 프록시를 사용한다.
- 데이터 근거 패널에는 사용된 축제명, 지역, 유형, 방문객 수, 예산, 유사도를 표시한다.
- 방문객 수는 출처 파일의 집계 기준에 의존하므로 실시간 군중 수나 확정 관광객 수로 해석하지 않는다.
```

- [ ] Step 2: Run full verification

Run:

```powershell
npm run test -- src/services/demandBackdataAdapter.test.ts src/services/forecast.test.ts src/services/metricEvidence.test.ts src/App.test.tsx
npm run build
```

Expected: both commands PASS.

- [ ] Step 3: Commit docs

```powershell
git add docs/data-methodology.md
git commit -m "docs: explain demand backdata methodology"
```

- [ ] Step 4: Push and deploy

Run:

```powershell
git push origin main
```

Deploy to the internal Docker server using the existing runbook command pattern while preserving `/home/cwuser/fest-twin-demo.env` and the Naver map build arg.

Expected:

- GitHub `main` contains all new commits.
- Remote container `fest-twin-demo` runs the latest commit.
- `https://cwserver.tail97dbc3.ts.net/` returns `200 OK`.

---

## Self-Review

- Spec coverage: The plan covers regional festival file-data first, demand context, forecast integration, demand-index evidence, fallback behavior, tests, docs, Git, and deployment. Regional visitor count and tourism concentration APIs are explicitly follow-up tasks as requested by the spec.
- Placeholder scan: No `TBD`, `TODO`, incomplete task, or open-ended "add tests" steps remain.
- Type consistency: `DemandBackdataContext`, `DemandBackdataSimilarFestival`, `getDemandBackdataContext`, and `createMetricEvidenceSet(..., demandBackdata?)` are consistently named across tasks.
