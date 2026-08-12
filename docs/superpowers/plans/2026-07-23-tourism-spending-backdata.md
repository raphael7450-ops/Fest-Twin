# Tourism Spending Backdata Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Goal: Replace the fixed `62,000원` ROI spending assumption with a source-backed tourism spending context that can later be connected to data.go.kr regional tourism demand APIs.

Architecture: Add a focused `SpendingContext` domain model and a sample public-data fallback dataset that represents 한국관광공사 지역별 관광 수요 강도/관광 다양성 outputs. Pass the spending context into economic impact metrics, ROI UI, and metric evidence so the same average spend value and source basis are visible everywhere. Keep this first implementation client-side and deterministic; server-side data.go.kr proxy work is a later task.

Tech Stack: React 18, TypeScript, Vite, Vitest, Testing Library.

## Global Constraints

- Do not expose data.go.kr service keys in the browser.
- Do not use `AVERAGE_SPEND_PER_VISITOR_KRW = 62000` as the final ROI basis.
- Display the spending value with its data source, basis, confidence, and fallback status.
- Treat regional visitor counts as `방문자 수`, not guaranteed `관광객 수`.
- Keep existing user-facing Korean copy style.
- Commit only files related to this feature; leave existing unrelated dirty files untouched.

---

## File Structure

- Modify: `src/domain/types.ts`
  - Add `SpendingContext`, `SpendingBasis`, and `SpendingConfidence` interfaces.
- Create: `src/data/sampleSpending.ts`
  - Provide source-backed sample/fallback spending data for the current Seoul/Gangnam demo.
- Modify: `src/services/impactMetrics.ts`
  - Remove the hard-coded average spend constant and accept optional `SpendingContext`.
- Modify: `src/services/metricEvidence.ts`
  - Pass the spending context into ROI metrics and expose the spending source details in the evidence drawer.
- Modify: `src/components/RoiEconomicImpact.tsx`
  - Accept optional `spending` prop and show the spending basis in the ROI panel.
- Modify: `src/components/ReportView.tsx`
  - Accept optional `spending` prop and pass it to `RoiEconomicImpact`.
- Modify: `src/App.tsx`
  - Import the sample spending context and pass it to evidence/report calculation.
- Modify tests:
  - `src/services/impactMetrics.test.ts`
  - `src/services/metricEvidence.test.ts`
  - `src/App.test.tsx`

---

### Task 1: Add Spending Context Model and Sample Backdata

Files:
- Modify: `src/domain/types.ts`
- Create: `src/data/sampleSpending.ts`
- Test: `src/services/impactMetrics.test.ts`

Interfaces:
- Produces:
  - `SpendingBasis = "tourism-demand-intensity" | "tourism-diversity" | "similar-region" | "fallback"`
  - `SpendingConfidence = "high" | "medium" | "low"`
  - `SpendingContext`
  - `sampleSpendingContext`
- Consumes:
  - Existing `MetricEvidenceSourceDetail`

- [ ] Step 1: Write the failing test

Add or extend `src/services/impactMetrics.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import { sampleForecastResult } from "../data/sampleForecast";
import { sampleSpendingContext } from "../data/sampleSpending";
import { createEconomicImpactMetrics } from "./impactMetrics";

describe("createEconomicImpactMetrics", () => {
  it("uses tourism spending backdata instead of a fixed average spend constant", () => {
    const metrics = createEconomicImpactMetrics(
      sampleFestivalPlan,
      sampleForecastResult,
      sampleSpendingContext,
    );

    expect(metrics.averageSpendPerVisitorKrw).toBe(
      sampleSpendingContext.averageSpendPerVisitorKrw,
    );
    expect(metrics.spendingBasisLabel).toBe("지역 관광 소비 강도 기반");
    expect(metrics.spendingSourceName).toContain("한국관광공사");
    expect(metrics.expectedLocalSpendingKrw).toBe(
      sampleForecastResult.expectedVisitors *
        sampleSpendingContext.averageSpendPerVisitorKrw,
    );
  });
});
```

- [ ] Step 2: Run the test to verify it fails

Run:

```powershell
npm run test -- src/services/impactMetrics.test.ts
```

Expected: FAIL because `sampleSpendingContext` and the new `createEconomicImpactMetrics` signature/properties do not exist.

- [ ] Step 3: Add types

In `src/domain/types.ts`, add after `TrendContext`:

```ts
export type SpendingBasis =
  | "tourism-demand-intensity"
  | "tourism-diversity"
  | "similar-region"
  | "fallback";

export type SpendingConfidence = "high" | "medium" | "low";

export interface SpendingContext {
  averageSpendPerVisitorKrw: number;
  basis: SpendingBasis;
  basisLabel: string;
  confidence: SpendingConfidence;
  sourceName: string;
  sourceStatus: DataSourceStatus;
  region: string;
  retrievedAt: string;
  note: string;
  sourceDetails: MetricEvidenceSourceDetail[];
}
```

- [ ] Step 4: Create sample spending data

Create `src/data/sampleSpending.ts`:

```ts
import type { SpendingContext } from "../domain/types";

export const sampleSpendingContext: SpendingContext = {
  averageSpendPerVisitorKrw: 58400,
  basis: "tourism-demand-intensity",
  basisLabel: "지역 관광 소비 강도 기반",
  confidence: "medium",
  sourceName: "한국관광공사 지역별 관광 수요 강도",
  sourceStatus: "partial-fallback",
  region: "서울",
  retrievedAt: "공공데이터 연동 설계 기준",
  note:
    "data.go.kr 지역별 관광 수요 강도의 방문량 대비 소비액 계열 지표를 우선 사용하는 구조의 데모 기준값입니다. 실제 API 연결 후 지역·기간별 값으로 교체합니다.",
  sourceDetails: [
    {
      sourceId: "sample-tourism-demand-intensity-spending",
      sourceName: "한국관광공사 지역별 관광 수요 강도",
      sourceType: "sample",
      statusLabel: "공공데이터 구조 기반 샘플",
      endpoint: "data.go.kr/data/15151868/openapi.do",
      query: [
        { label: "region", value: "서울" },
        { label: "indicator", value: "방문량 대비 소비액" },
      ],
      records: [
        {
          label: "지역 관광 소비 강도",
          fields: [
            { label: "평균 소비 단가", value: "58,400원" },
            { label: "산출 방식", value: "방문량 대비 소비액 계열 지표" },
            { label: "신뢰도", value: "보통" },
          ],
        },
      ],
      note:
        "현재 값은 API 연결 전 제출 데모용 보정값이며, 고정 상수 대신 공공데이터 소비 지표의 출처와 산출 방식을 표시합니다.",
    },
  ],
};
```

- [ ] Step 5: Run the test again

Run:

```powershell
npm run test -- src/services/impactMetrics.test.ts
```

Expected: still FAIL because `createEconomicImpactMetrics` has not been updated.

---

### Task 2: Replace Fixed ROI Spending Constant

Files:
- Modify: `src/services/impactMetrics.ts`
- Test: `src/services/impactMetrics.test.ts`

Interfaces:
- Consumes: `SpendingContext`
- Produces:
  - `EconomicImpactMetrics.spendingBasisLabel`
  - `EconomicImpactMetrics.spendingSourceName`
  - `EconomicImpactMetrics.spendingConfidence`

- [ ] Step 1: Update economic metric types

In `src/services/impactMetrics.ts`, import `SpendingContext` and update `EconomicImpactMetrics`:

```ts
export interface EconomicImpactMetrics {
  totalBudgetKrw: number;
  expectedLocalSpendingKrw: number;
  averageSpendPerVisitorKrw: number;
  roiMultiplier: number;
  spendingBasisLabel: string;
  spendingSourceName: string;
  spendingConfidence: "high" | "medium" | "low";
}
```

- [ ] Step 2: Remove the fixed constant

Delete:

```ts
const AVERAGE_SPEND_PER_VISITOR_KRW = 62000;
```

- [ ] Step 3: Update `createEconomicImpactMetrics`

Replace the function with:

```ts
const FALLBACK_SPEND_PER_VISITOR_KRW = 58400;

export function createEconomicImpactMetrics(
  plan: FestivalPlan,
  forecast: ForecastResult,
  spending?: SpendingContext,
): EconomicImpactMetrics {
  const totalBudgetKrw = plan.totalBudgetMillionKrw * 1_000_000;
  const averageSpendPerVisitorKrw =
    spending?.averageSpendPerVisitorKrw ?? FALLBACK_SPEND_PER_VISITOR_KRW;
  const expectedLocalSpendingKrw =
    forecast.expectedVisitors * averageSpendPerVisitorKrw;

  return {
    totalBudgetKrw,
    expectedLocalSpendingKrw,
    averageSpendPerVisitorKrw,
    roiMultiplier:
      Math.round((expectedLocalSpendingKrw / Math.max(totalBudgetKrw, 1)) * 10) /
      10,
    spendingBasisLabel: spending?.basisLabel ?? "공공데이터 구조 기반 샘플",
    spendingSourceName: spending?.sourceName ?? "한국관광공사 관광 소비 백데이터 샘플",
    spendingConfidence: spending?.confidence ?? "low",
  };
}
```

- [ ] Step 4: Run tests

Run:

```powershell
npm run test -- src/services/impactMetrics.test.ts
```

Expected: PASS.

- [ ] Step 5: Commit

```powershell
git add src/domain/types.ts src/data/sampleSpending.ts src/services/impactMetrics.ts src/services/impactMetrics.test.ts
git commit -m "feat: add tourism spending context"
```

---

### Task 3: Surface Spending Source in ROI UI and Evidence

Files:
- Modify: `src/components/RoiEconomicImpact.tsx`
- Modify: `src/components/ReportView.tsx`
- Modify: `src/services/metricEvidence.ts`
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx`
- Test: `src/services/metricEvidence.test.ts`

Interfaces:
- Consumes: `SpendingContext`, `sampleSpendingContext`
- Produces: ROI panel copy and evidence details that include the spending source.

- [ ] Step 1: Write failing UI test

In `src/App.test.tsx`, extend the dashboard render test:

```ts
expect(screen.getByText(/지역 관광 소비 강도 기반/)).toBeInTheDocument();
expect(screen.getByText(/58,400원/)).toBeInTheDocument();
```

- [ ] Step 2: Write failing evidence test

In `src/services/metricEvidence.test.ts`, add:

```ts
expect(JSON.stringify(evidence["economic-roi"].sourceDetails)).toContain(
  "한국관광공사 지역별 관광 수요 강도",
);
expect(JSON.stringify(evidence["economic-roi"].assumptions)).not.toContain(
  "62,000",
);
```

- [ ] Step 3: Run tests to verify they fail

Run:

```powershell
npm run test -- src/App.test.tsx src/services/metricEvidence.test.ts
```

Expected: FAIL because spending context is not yet passed into UI/evidence.

- [ ] Step 4: Update `RoiEconomicImpact` props

In `src/components/RoiEconomicImpact.tsx`, import `SpendingContext`, add `spending?: SpendingContext`, call `createEconomicImpactMetrics(plan, forecast, spending)`, and replace the paragraph with:

```tsx
<p>
  방문객 1인당 평균 소비 단가{" "}
  {metrics.averageSpendPerVisitorKrw.toLocaleString("ko-KR")}원 기준 ·{" "}
  {metrics.spendingBasisLabel}
</p>
```

- [ ] Step 5: Pass spending through report

In `src/components/ReportView.tsx`, add `spending?: SpendingContext` to props and pass it to:

```tsx
<RoiEconomicImpact
  plan={plan}
  forecast={forecast}
  spending={spending}
  onOpenEvidence={onOpenEvidence}
/>
```

- [ ] Step 6: Pass spending from App

In `src/App.tsx`, import:

```ts
import { sampleSpendingContext } from "./data/sampleSpending";
```

Pass `sampleSpendingContext` into:

```ts
createMetricEvidenceSet(plan, forecast, simulation, tourism, sampleTrendContext, traffic, sampleSpendingContext)
```

and:

```tsx
<ReportView
  report={report}
  plan={plan}
  forecast={forecast}
  evidenceSet={evidenceSet}
  onOpenEvidence={setSelectedEvidenceId}
  spending={sampleSpendingContext}
/>
```

- [ ] Step 7: Update `metricEvidence` signature and ROI details

In `src/services/metricEvidence.ts`, import `SpendingContext`, update `createMetricEvidenceSet(..., spending?: SpendingContext)`, and call:

```ts
const economy = createEconomicImpactMetrics(plan, forecast, spending);
```

Append spending details to ROI source details:

```ts
const spendingDetails = spending?.sourceDetails ?? [];

const roiSourceDetails = [
  ...budgetUserInputs,
  ...expectedVisitorsDetails,
  ...spendingDetails,
  ...roiDetails,
];

sourceDetails: roiSourceDetails,
```

Update ROI `dataSources` and assumptions:

```ts
dataSources: [
  "예상 방문객",
  "사용자 입력 총 예산",
  economy.spendingSourceName,
],
assumptions: [
  `방문객 1인당 평균 소비 단가는 ${economy.averageSpendPerVisitorKrw.toLocaleString("ko-KR")}원이며, ${economy.spendingBasisLabel}으로 적용합니다.`,
],
```

- [ ] Step 8: Run tests

Run:

```powershell
npm run test -- src/App.test.tsx src/services/metricEvidence.test.ts src/services/impactMetrics.test.ts
```

Expected: PASS.

- [ ] Step 9: Build

Run:

```powershell
npm run build
```

Expected: PASS.

- [ ] Step 10: Commit

```powershell
git add src/App.tsx src/components/RoiEconomicImpact.tsx src/components/ReportView.tsx src/services/metricEvidence.ts src/App.test.tsx src/services/metricEvidence.test.ts
git commit -m "feat: show tourism spending source in ROI"
```

---

### Task 4: Update Documentation and Deploy

Files:
- Modify: `docs/data-methodology.md`

Interfaces:
- Consumes: implemented spending context and ROI behavior.
- Produces: updated methodology copy for submission review.

- [ ] Step 1: Update methodology

Append a concise Korean section to `docs/data-methodology.md`:

```md
## 관광 소비 단가 근거

Fest-Twin은 ROI 산출 시 고정 소비 단가를 1차 근거로 사용하지 않는다. 기본 구조는 한국관광공사 지역별 관광 수요 강도의 방문량 대비 소비액 계열 지표와 지역별 관광 다양성의 연령별 소비액 지표를 우선 사용한다. API 연동 전 데모에서는 동일 구조를 따르는 샘플 소비 컨텍스트를 표시하며, 근거 패널에 출처, 조회 지역, 사용 지표, 신뢰도, fallback 여부를 함께 제공한다.
```

- [ ] Step 2: Run final verification

Run:

```powershell
npm run test -- src/services/impactMetrics.test.ts src/services/metricEvidence.test.ts src/App.test.tsx
npm run build
```

Expected: all PASS.

- [ ] Step 3: Commit docs

```powershell
git add docs/data-methodology.md
git commit -m "docs: explain tourism spending basis"
```

- [ ] Step 4: Push

```powershell
git push origin main
```

- [ ] Step 5: Deploy remote Docker

Run the existing remote Docker deployment command with a fresh tag and preserve:

```text
--env-file /home/cwuser/fest-twin-demo.env
--build-arg VWORLD_API_KEY=your_vworld_api_key
```

- [ ] Step 6: Verify public deployment

Check:

```powershell
Invoke-WebRequest -UseBasicParsing "https://cwserver.tail97dbc3.ts.net/"
```

Expected: status 200 and new asset hashes in `index.html`.

---

## Self-Review

- Spec coverage: The plan covers regional spending backdata, removal of the fixed 62,000원 ROI basis, source display, evidence drawer, docs, tests, push, and remote deploy.
- Scope decision: This plan intentionally does not implement live data.go.kr proxy calls. It creates the typed spending context and source-backed sample layer first, matching the project’s existing TourAPI/View-T fallback pattern.
- Placeholder scan: No `TBD`, `TODO`, or open-ended implementation instructions remain.
- Type consistency: `SpendingContext` is defined once in `src/domain/types.ts` and consumed by metrics, UI, evidence, and App.
