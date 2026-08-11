# Phase 1 Analysis Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure one selected festival produces one internally consistent, source-labelled analysis across the dashboard, map, CSV, and print report.

**Architecture:** Introduce a single immutable analysis snapshot assembled after all data adapters settle, then make every result surface consume that snapshot. Move festival corrections into shared data, persist venue coordinates with the plan, replace duplicate safety calculations with one canonical service, and separate success potential from capacity pressure.

**Tech Stack:** React 18, TypeScript 5.7, Vite 6, Vitest, Testing Library, Express 5, JSON reference data

## Global Constraints

- This plan implements only Phase 1, `신뢰성 복구`, from `docs/superpowers/specs/2026-08-11-municipal-pilot-readiness-design.md`.
- Keep React 18, TypeScript, Express, and the existing adapter boundaries.
- Do not add authentication, PostgreSQL, approval workflow, or offline GIS in this plan.
- A selected festival ID is the top-level identity for map, forecast, safety, evidence, CSV, and print output.
- Do not show sample data as live data in pilot mode.
- Do not display people per square metre or evacuation time when required physical inputs are absent.
- Preserve the current public demo fallback path while labelling it `supplemented`.
- Each task starts with a failing test and ends with a focused commit.

---

## File Structure

### New files

- `data/festival_corrections.json`: verified festival status and date corrections with evidence metadata.
- `src/services/festivalCorrections.ts`: client-side correction lookup and application.
- `src/services/festivalCorrections.test.ts`: correction and inactive-festival tests.
- `server/festivalCorrectionRegistry.js`: server-side reader for the shared correction file.
- `server/festivalCorrectionRegistry.test.ts`: server correction registry tests.
- `src/services/safetyDecisionMetrics.ts`: one canonical safety, staffing, density, medical, and evacuation result service.
- `src/services/safetyDecisionMetrics.test.ts`: canonical safety model tests.
- `src/services/analysisSnapshot.ts`: pure analysis snapshot builder and data-status normalization.
- `src/services/analysisSnapshot.test.ts`: snapshot identity and output consistency tests.
- `src/hooks/useFestivalAnalysis.ts`: atomic asynchronous analysis loader with stale-request protection.
- `src/hooks/useFestivalAnalysis.test.tsx`: loading, stale response, and committed snapshot tests.
- `src/components/AnalysisStatusBanner.tsx`: visible draft/loading/data-quality status.
- `src/components/AnalysisStatusBanner.test.tsx`: status wording and accessibility tests.
- `tests/analysisOutputConsistency.test.tsx`: end-to-end contract checks across screen, CSV, and print output.
- `scripts/docs-link-check.js`: validates local Markdown links used by README and docs index.
- `scripts/docs-link-check.test.js`: link checker fixture tests.

### Modified files

- `src/domain/types.ts`: coordinates, normalized data status, metric estimate, and snapshot types.
- `src/data/sampleFestivalPlan.ts`: remove implicit Gangnam coordinates and keep the default venue explicitly unverified until a candidate supplies coordinates.
- `src/services/festivalSelection.ts`: copy candidate coordinates into the selected plan.
- `src/services/tourApiAdapter.ts`: use the correction registry instead of title-specific conditions.
- `server/db/regionalFestivalDatabase.js`: use the shared correction registry instead of title-specific conditions.
- `src/components/VenueMapPanel.tsx`: remove Gangnam fallback and derive notes from the selected plan.
- `src/services/simulation.ts`: rename grid density to a relative score and stop implying physical density.
- `src/services/impactMetrics.ts`: separate success potential, capacity pressure, and physical-density availability.
- `src/services/capacityAndSafetyForecast.ts`: retain infrastructure calculations only; remove the duplicate safety allocation path.
- `src/services/metricEvidence.ts`: consume canonical snapshot metrics and describe unavailable values honestly.
- `src/services/report.ts`: use the canonical success and safety results.
- `src/App.tsx`: replace independent data states with `useFestivalAnalysis`.
- `src/components/SummaryKpiCards.tsx`: show success potential and capacity pressure with correct labels.
- `src/components/OperationalScoreHeader.tsx`: stop calling success potential an operational composite score.
- `src/components/SafetyLogisticsPanel.tsx`: consume canonical safety metrics.
- `src/components/SafetyGuardAllocationPanel.tsx`: consume the same canonical safety profiles.
- `src/components/Heatmap.tsx`: label cells as relative congestion scores.
- `src/components/ReportView.tsx`: consume one analysis snapshot and stop recalculating simulation results.
- `src/components/B2gPrintReport.tsx`: consume one analysis snapshot and stop recalculating simulation results.
- `src/components/CsvExportButton.tsx`: export the committed snapshot.
- `src/utils/csvExport.ts`: include analysis ID, model version, data status, and canonical values.
- `src/styles.css`: status banner and unavailable-value styles.
- `README.md`, `docs/README.md`, `docs/DATA_RELIABILITY_REPORT.md`: repair links and align claims with implemented storage and metric semantics.
- `package.json`: add the documentation link check command to verification.

---

### Task 1: Replace Festival-Specific Conditions With a Correction Registry

**Files:**
- Create: `data/festival_corrections.json`
- Create: `src/services/festivalCorrections.ts`
- Create: `src/services/festivalCorrections.test.ts`
- Create: `server/festivalCorrectionRegistry.js`
- Create: `server/festivalCorrectionRegistry.test.ts`
- Modify: `src/services/tourApiAdapter.ts:592-596,733-744,1406-1416`
- Modify: `server/db/regionalFestivalDatabase.js:48-53,94-109,205-224`

**Interfaces:**
- Produces: `FestivalCorrection`, `getFestivalCorrection(input)`, `applyFestivalCorrection(candidate)`, `isFestivalAvailableForPlanning(candidate)`.
- Produces: server `createFestivalCorrectionRegistry(filePath?)` with `apply(record)` and `isAvailable(record)`.
- Consumes: festival title, region, source record year, start date, and end date.

- [ ] **Step 1: Write failing client correction tests**

```ts
import { describe, expect, it } from "vitest";
import {
  applyFestivalCorrection,
  isFestivalAvailableForPlanning,
} from "./festivalCorrections";

describe("festivalCorrections", () => {
  it("applies the verified Busan Sea Festival period", () => {
    const corrected = applyFestivalCorrection({
      id: "busan-sea",
      title: "제30회 부산바다축제",
      region: "부산",
      startDate: "2026-08-01",
      endDate: "2026-08-03",
    });

    expect(corrected.startDate).toBe("2026-08-07");
    expect(corrected.endDate).toBe("2026-08-13");
    expect(corrected.correction?.verifiedAt).toBe("2026-08-11");
  });

  it("excludes an inactive festival from planning", () => {
    expect(
      isFestivalAvailableForPlanning({ title: "대전 0시 축제", region: "대전" }),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run the client test and verify it fails**

Run: `npx vitest run src/services/festivalCorrections.test.ts`

Expected: FAIL because `festivalCorrections.ts` does not exist.

- [ ] **Step 3: Add the correction data and client registry**

```json
[
  {
    "canonicalKey": "부산바다축제",
    "regions": ["부산", "부산광역시"],
    "status": "active",
    "officialStartDate": "2026-08-07",
    "officialEndDate": "2026-08-13",
    "verifiedAt": "2026-08-11",
    "sourceName": "부산축제조직위원회 / 대한민국 구석구석",
    "sourceUrl": "https://korean.visitkorea.or.kr/"
  },
  {
    "canonicalKey": "대전0시축제",
    "regions": ["대전", "대전광역시"],
    "status": "inactive",
    "verifiedAt": "2026-08-11",
    "sourceName": "운영 확인 정정 데이터",
    "sourceUrl": "https://www.daejeon.go.kr/"
  }
]
```

```ts
import corrections from "../../data/festival_corrections.json";

export type FestivalOperatingStatus = "active" | "inactive" | "cancelled" | "unconfirmed";

export interface FestivalCorrection {
  canonicalKey: string;
  regions: string[];
  status: FestivalOperatingStatus;
  officialStartDate?: string;
  officialEndDate?: string;
  verifiedAt: string;
  sourceName: string;
  sourceUrl: string;
}

export function canonicalFestivalKey(value: string) {
  return value
    .replace(/20\d{2}년?/g, "")
    .replace(/제\s*\d+\s*회/g, "")
    .replace(/\d+\s*회/g, "")
    .replace(/[()[\]{}·ㆍ.,/\\\-_:]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}
```

Implement `getFestivalCorrection` by matching canonical key and normalized region. `applyFestivalCorrection` must preserve the raw record, apply verified dates, and attach correction metadata. `isFestivalAvailableForPlanning` returns true only for no correction or `status === "active"`.

- [ ] **Step 4: Add and verify the server registry**

```ts
import { describe, expect, it } from "vitest";
import { createFestivalCorrectionRegistry } from "./festivalCorrectionRegistry.js";

describe("festivalCorrectionRegistry", () => {
  it("uses the shared correction file for regional records", () => {
    const registry = createFestivalCorrectionRegistry();
    const corrected = registry.apply({
      name: "부산바다축제",
      region: "부산",
      year: 2026,
      startDate: "2026-08-01",
      endDate: "2026-08-03",
    });
    expect(corrected.endDate).toBe("2026-08-13");
  });
});
```

Run: `npx vitest run server/festivalCorrectionRegistry.test.ts src/services/festivalCorrections.test.ts`

Expected: PASS.

- [ ] **Step 5: Replace client and server hard-coded branches**

In `tourApiAdapter.ts`, apply corrections before date filtering and call `isFestivalAvailableForPlanning`. In `regionalFestivalDatabase.js`, call `registry.apply(record)` and `registry.isAvailable(record)` before deduplication. Remove `isInactivePlanningFestivalItem`, `isInactivePlanningFestival`, and both Busan-specific date functions.

- [ ] **Step 6: Run focused regression tests**

Run: `npx vitest run src/services/tourApiAdapter.regionalDb.test.ts server/regionalFestivalDatabase.test.js src/services/festivalCorrections.test.ts server/festivalCorrectionRegistry.test.ts`

Expected: all tests PASS; 부산바다축제 appears once with the verified period and 대전 0시 축제 is absent from planning results.

- [ ] **Step 7: Commit**

```bash
git add data/festival_corrections.json src/services/festivalCorrections.ts src/services/festivalCorrections.test.ts server/festivalCorrectionRegistry.js server/festivalCorrectionRegistry.test.ts src/services/tourApiAdapter.ts server/db/regionalFestivalDatabase.js
git commit -m "fix: centralize festival planning corrections"
```

---

### Task 2: Make Venue Coordinates and Operational Notes Festival-Specific

**Files:**
- Modify: `src/domain/types.ts:32-50`
- Modify: `src/data/sampleFestivalPlan.ts`
- Modify: `src/services/festivalSelection.ts`
- Modify: `src/services/festivalSelection.test.ts`
- Modify: `src/services/scenarioStorage.ts:22-73`
- Modify: `src/components/VenueMapPanel.tsx:11-17,105-237`
- Modify: `src/components/VenueMapPanel.test.tsx`

**Interfaces:**
- Produces: `VenueCoordinates`, optional `FestivalPlan.venueCoordinates`.
- Produces: `buildVenueOperationalNotes(plan): string[]`.
- Consumes: TourAPI candidate `mapX` and `mapY`, plan facilities, and venue address.

- [ ] **Step 1: Write failing coordinate persistence tests**

```ts
it("copies selected candidate coordinates into the plan", () => {
  const next = applyFestivalCandidateToPlan(sampleFestivalPlan, {
    id: "festival-1",
    title: "선택 축제",
    address: "서울특별시 영등포구",
    startDate: "2026-09-04",
    endDate: "2026-09-05",
    mapX: "126.9348",
    mapY: "37.5284",
    searchScope: "exact-period",
  });

  expect(next.venueCoordinates).toEqual({
    longitude: 126.9348,
    latitude: 37.5284,
    source: "tourapi",
  });
});
```

```tsx
it("does not display an unrelated fallback map when coordinates are absent", () => {
  render(<VenueMapPanel plan={{ ...sampleFestivalPlan, venueCoordinates: undefined }} />);
  expect(screen.getByText("행사장 좌표 확인 필요")).toBeInTheDocument();
  expect(screen.queryByText(/삼성역|COEX/)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npx vitest run src/services/festivalSelection.test.ts src/components/VenueMapPanel.test.tsx`

Expected: FAIL because the plan has no `venueCoordinates` and the map still uses Gangnam fallback data.

- [ ] **Step 3: Add coordinate types and normalization**

```ts
export interface VenueCoordinates {
  latitude: number;
  longitude: number;
  source: "tourapi" | "verified" | "user-input";
}

export interface FestivalPlan {
  // existing fields remain
  venueCoordinates?: VenueCoordinates;
  venueAreaSquareMeters?: number;
  totalExitWidthMeters?: number;
  evacuationDistanceMeters?: number;
}
```

`normalizeFestivalPlan` must retain only finite coordinates within latitude `-90..90` and longitude `-180..180`. Invalid coordinates become `undefined`.

- [ ] **Step 4: Persist candidate coordinates in the selected plan**

```ts
const longitude = Number(candidate.mapX);
const latitude = Number(candidate.mapY);
const venueCoordinates =
  Number.isFinite(longitude) && Number.isFinite(latitude)
    ? { longitude, latitude, source: "tourapi" as const }
    : undefined;
```

Merge `venueCoordinates` into the result of `applyFestivalCandidateToPlan`. Do not retain coordinates from the previously selected festival when the new candidate has none.

- [ ] **Step 5: Remove the map fallback and derive notes**

```ts
export function buildVenueOperationalNotes(plan: FestivalPlan) {
  const entrances = plan.facilities.filter((item) => item.type === "entrance");
  const stages = plan.facilities.filter((item) => item.type === "stage");
  const booths = plan.facilities.filter((item) => item.type === "booth");

  return [
    `행사장 중심 구역: ${plan.name}`,
    entrances.length > 0
      ? `주요 진출입 후보: ${entrances.map((item) => item.name).join(", ")}`
      : "주요 진출입 후보: 기획안 입력 필요",
    stages.length > 0
      ? `관람 집중 후보: ${stages.map((item) => item.name).join(", ")}`
      : "관람 집중 후보: 기획안 입력 필요",
    booths.length > 0
      ? `분산 운영 후보: ${booths.map((item) => item.name).join(", ")}`
      : "분산 운영 후보: 기획안 입력 필요",
  ];
}
```

Render VWorld only when `plan.venueCoordinates` exists. Otherwise show the address and `행사장 좌표 확인 필요`, with no map script request.

- [ ] **Step 6: Run focused tests**

Run: `npx vitest run src/services/festivalSelection.test.ts src/services/scenarioStorage.test.ts src/components/VenueMapPanel.test.tsx tests/festivalSwitch.test.ts`

Expected: all tests PASS; no fixed Gangnam coordinate or COEX wording remains in production components.

- [ ] **Step 7: Commit**

```bash
git add src/domain/types.ts src/data/sampleFestivalPlan.ts src/services/festivalSelection.ts src/services/festivalSelection.test.ts src/services/scenarioStorage.ts src/components/VenueMapPanel.tsx src/components/VenueMapPanel.test.tsx
git commit -m "fix: bind venue context to selected festival"
```

---

### Task 3: Introduce One Canonical Safety Decision Model

**Files:**
- Create: `src/services/safetyDecisionMetrics.ts`
- Create: `src/services/safetyDecisionMetrics.test.ts`
- Modify: `src/domain/types.ts:99-128,244-273`
- Modify: `src/services/simulation.ts`
- Modify: `src/services/simulation.test.ts`
- Modify: `src/services/impactMetrics.ts:114-148,261-317`
- Modify: `src/services/capacityAndSafetyForecast.ts:82-154`
- Modify: `src/services/capacityAndSafetyForecast.test.ts`
- Modify: `src/components/Heatmap.tsx`
- Modify: `src/components/Heatmap.test.tsx`
- Modify: `src/components/SafetyLogisticsPanel.tsx`
- Modify: `src/components/SafetyGuardAllocationPanel.tsx`

**Interfaces:**
- Produces: `MetricEstimate`, `SafetyDecisionMetrics`, `SafetyDecisionProfiles`.
- Produces: `createSafetyDecisionProfiles(plan, forecast, simulation, traffic?)`.
- Consumes: plan physical inputs, forecast day profiles, relative congestion simulation, and traffic context.

- [ ] **Step 1: Write failing canonical safety tests**

```ts
describe("createSafetyDecisionProfiles", () => {
  it("returns one shared summary staffing recommendation", () => {
    const profiles = createSafetyDecisionProfiles(plan, forecast, simulation);
    expect(profiles.summary.staffing.recommended).toBeGreaterThanOrEqual(
      profiles.summary.staffing.min,
    );
    expect(profiles.summary.staffing.recommended).toBeLessThanOrEqual(
      profiles.summary.staffing.max,
    );
    expect(profiles.summary.staffing.unit).toBe("people");
  });

  it("marks physical density and evacuation time unavailable without venue geometry", () => {
    const profiles = createSafetyDecisionProfiles(
      { ...plan, venueAreaSquareMeters: undefined, totalExitWidthMeters: undefined },
      forecast,
      simulation,
    );
    expect(profiles.summary.peakDensity.status).toBe("unavailable");
    expect(profiles.summary.evacuationTime.status).toBe("unavailable");
  });

  it("never treats relative cell score as people per square metre", () => {
    const profiles = createSafetyDecisionProfiles(plan, forecast, simulation);
    expect(profiles.summary.relativeCongestion.unit).toBe("score");
    expect(profiles.summary.relativeCongestion.status).toBe("available");
    if (profiles.summary.relativeCongestion.status === "available") {
      expect(profiles.summary.relativeCongestion.value).toBeLessThanOrEqual(100);
    }
  });
});
```

- [ ] **Step 2: Run the safety tests and verify failure**

Run: `npx vitest run src/services/safetyDecisionMetrics.test.ts`

Expected: FAIL because the canonical service does not exist.

- [ ] **Step 3: Add metric and safety result types**

```ts
export type AnalysisConfidence = "high" | "medium" | "low";

export type MetricEstimate =
  | {
      status: "available";
      value: number;
      unit: "people" | "people_per_square_meter" | "seconds" | "score" | "percent";
      confidence: AnalysisConfidence;
      basis: string;
    }
  | {
      status: "unavailable";
      unit: "people" | "people_per_square_meter" | "seconds" | "score" | "percent";
      confidence: "low";
      reason: string;
    };

export interface StaffingRange {
  min: number;
  recommended: number;
  max: number;
  unit: "people";
  confidence: AnalysisConfidence;
  basis: string;
}

export interface SafetyDecisionMetrics {
  staffing: StaffingRange;
  zoneAllocations: SafetyZoneGuardAllocation[];
  relativeCongestion: MetricEstimate;
  peakDensity: MetricEstimate;
  medicalStaff: MetricEstimate;
  ambulances: MetricEstimate;
  evacuationTime: MetricEstimate;
}

export interface SafetyDecisionProfiles {
  summary: SafetyDecisionMetrics;
  weekday: SafetyDecisionMetrics;
  weekend: SafetyDecisionMetrics;
}
```

Rename `HeatmapCell.density` to `relativeDensityScore`. Keep it clamped to `0..100`, and update accessible labels to `상대 혼잡 점수`.

- [ ] **Step 4: Implement the canonical staffing and safety calculation**

```ts
function staffingRange(peakVisitors: number, bottleneckCount: number, relativeScore: number) {
  const recommended = Math.max(
    8,
    Math.ceil(peakVisitors / 820 + bottleneckCount * 2 + relativeScore / 50),
  );
  return {
    min: Math.max(8, Math.floor(recommended * 0.85)),
    recommended,
    max: Math.ceil(recommended * 1.15),
    unit: "people" as const,
    confidence: "low" as const,
    basis: "피크 방문객, 병목 후보, 상대 혼잡 점수를 사용한 사전 배치 범위",
  };
}
```

When `venueAreaSquareMeters` is absent, return unavailable physical density. When present, calculate `peakVisitors / venueAreaSquareMeters`, clamp only after validating the input, and record the exact basis. When `totalExitWidthMeters` or `evacuationDistanceMeters` is absent, return unavailable evacuation time. Do not retain the dangerous-cell-times-three formula.

When both evacuation inputs exist, calculate a planning estimate using `flowCapacity = totalExitWidthMeters * 1.3` people per second, `queueSeconds = peakVisitors / flowCapacity`, `walkingSeconds = evacuationDistanceMeters / 1.0`, and `evacuationSeconds = queueSeconds + walkingSeconds`. Mark the estimate `low` confidence and describe the assumed flow and walking rates in `basis`.

Allocate the staffing recommendation across stage, entrance, and bottleneck zones using normalized weights whose rounded total is corrected to equal `recommended` exactly.

- [ ] **Step 5: Make both safety panels consume canonical props**

```ts
interface SafetyLogisticsPanelProps {
  metrics: SafetyDecisionMetrics;
  onOpenEvidence: (metricId: MetricEvidenceId) => void;
}

interface SafetyGuardAllocationPanelProps {
  profiles: SafetyDecisionProfiles;
  onOpenEvidence?: (metricId: MetricEvidenceId) => void;
}
```

`SafetyLogisticsPanel` displays `profiles.summary.staffing.recommended`. `SafetyGuardAllocationPanel` defaults to the same summary object and changes only when the labelled weekday or weekend tab is selected. Unavailable density and evacuation values render `산출 불가` with the reason.

- [ ] **Step 6: Remove the duplicate model and update tests**

Remove `calculateSafetyGuardAllocationForecast` from `capacityAndSafetyForecast.ts`; keep `calculateInfrastructureCapacityForecast`. Replace tests that assert a single over-precise evacuation value with unavailable/range assertions.

Run: `npx vitest run src/services/safetyDecisionMetrics.test.ts src/services/simulation.test.ts src/services/capacityAndSafetyForecast.test.ts src/components/Heatmap.test.tsx src/components/ReportView.test.tsx`

Expected: PASS; the summary safety count has exactly one source and relative scores are never labelled `명/m²`.

- [ ] **Step 7: Commit**

```bash
git add src/domain/types.ts src/services/safetyDecisionMetrics.ts src/services/safetyDecisionMetrics.test.ts src/services/simulation.ts src/services/simulation.test.ts src/services/impactMetrics.ts src/services/capacityAndSafetyForecast.ts src/services/capacityAndSafetyForecast.test.ts src/components/Heatmap.tsx src/components/Heatmap.test.tsx src/components/SafetyLogisticsPanel.tsx src/components/SafetyGuardAllocationPanel.tsx
git commit -m "fix: unify safety decision metrics"
```

---

### Task 4: Separate Success Potential From Capacity Pressure

**Files:**
- Modify: `src/services/impactMetrics.ts:19-38,188-259`
- Modify: `src/services/summaryKpiMetrics.test.ts`
- Modify: `src/components/SummaryKpiCards.tsx`
- Modify: `src/components/OperationalScoreHeader.tsx`
- Modify: `src/components/OperationalScoreHeader.test.tsx`
- Modify: `src/services/report.ts:25-112`
- Modify: `src/services/report.test.ts`
- Modify: `src/services/metricEvidence.ts`
- Modify: `src/services/metricEvidence.test.ts`

**Interfaces:**
- Produces: `SuccessPotentialMetric` with a `0..100` score.
- Produces: `CapacityPressureMetric` with an uncapped ratio and bounded display percent.
- Consumes: `forecast.successScore`, `forecast.expectedVisitors`, and `plan.expectedCapacity`.

- [ ] **Step 1: Write failing semantic tests**

```ts
it("keeps success potential bounded while preserving capacity pressure", () => {
  const metrics = createSummaryKpiMetrics(plan, {
    ...forecast,
    expectedVisitors: 240_000,
    successScore: 78,
  }, simulation, tourism, demandBackdata);

  expect(metrics.successPotential.score).toBe(78);
  expect(metrics.successPotential.score).toBeLessThanOrEqual(100);
  expect(metrics.capacityPressure.ratio).toBe(2);
  expect(metrics.capacityPressure.displayPercent).toBe(200);
});
```

```tsx
it("labels the forecast score as success potential", () => {
  render(<OperationalScoreHeader {...props} />);
  expect(screen.getByText("흥행 가능성 점수")).toBeInTheDocument();
  expect(screen.queryByText("운영 종합 점수")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npx vitest run src/services/summaryKpiMetrics.test.ts src/components/OperationalScoreHeader.test.tsx src/services/report.test.ts`

Expected: FAIL because the summary metrics expose `demandIndex` and the header calls it an operational score.

- [ ] **Step 3: Implement explicit metric semantics**

```ts
export interface SuccessPotentialMetric {
  score: number;
  grade: "상" | "중" | "하";
  description: string;
}

export interface CapacityPressureMetric {
  ratio: number;
  displayPercent: number;
  status: "within" | "caution" | "over";
}
```

Set `successPotential.score = clamp(forecast.successScore, 0, 100)`. Set `capacityPressure.ratio = expectedVisitors / max(expectedCapacity, 1)` without blending it with similar-festival attendance. Similar-festival data may explain forecast demand but must not alter the capacity denominator.

- [ ] **Step 4: Update UI, report, and evidence wording**

- Summary card title: `흥행 가능성 점수`, value `78점`.
- Summary card detail: `수용 압박률 145%` with status badge.
- Header hero title: `흥행 가능성 점수`.
- Evidence formula: expected visitors divided by capacity belongs only to capacity pressure.
- Report score: success potential uses `forecast.successScore` and capacity pressure appears in findings, not as a success percentage.

- [ ] **Step 5: Run focused tests**

Run: `npx vitest run src/services/summaryKpiMetrics.test.ts src/components/OperationalScoreHeader.test.tsx src/services/report.test.ts src/services/metricEvidence.test.ts src/components/ReportView.test.tsx`

Expected: PASS; no production component renders a success percentage greater than 100.

- [ ] **Step 6: Commit**

```bash
git add src/services/impactMetrics.ts src/services/summaryKpiMetrics.test.ts src/components/SummaryKpiCards.tsx src/components/OperationalScoreHeader.tsx src/components/OperationalScoreHeader.test.tsx src/services/report.ts src/services/report.test.ts src/services/metricEvidence.ts src/services/metricEvidence.test.ts
git commit -m "fix: separate success and capacity metrics"
```

---

### Task 5: Load and Commit One Atomic Analysis Snapshot

**Files:**
- Create: `src/services/analysisSnapshot.ts`
- Create: `src/services/analysisSnapshot.test.ts`
- Create: `src/hooks/useFestivalAnalysis.ts`
- Create: `src/hooks/useFestivalAnalysis.test.tsx`
- Modify: `src/domain/types.ts`
- Modify: `src/App.tsx:107-234,324-567`
- Modify: `src/App.test.tsx`
- Modify: `src/App.selectedBasis.test.tsx`

**Interfaces:**
- Produces: `AnalysisDataStatus`, `AnalysisDatasetState<T>`, `FestivalAnalysisSnapshot`.
- Produces: `createAnalysisSnapshot(input): FestivalAnalysisSnapshot`.
- Produces: `useFestivalAnalysis(input, dependencies?)` returning `{ snapshot, phase, pendingFestivalTitle, errorMessages }`.
- Consumes: the existing TourAPI, trend, traffic, spending, demand backdata, and weather adapters.

- [ ] **Step 1: Write failing pure snapshot tests**

```ts
it("creates one immutable snapshot identity for every result", () => {
  const snapshot = createAnalysisSnapshot(analysisInput);
  expect(snapshot.festivalId).toBe("festival-seoul-fireworks");
  expect(snapshot.plan.name).toBe("2026 서울세계불꽃축제");
  expect(snapshot.analysisId).toMatch(/^analysis_/);
  expect(snapshot.metrics.summary.successPotential.score).toBe(
    snapshot.forecast.successScore,
  );
});

it("normalizes legacy fallback statuses", () => {
  expect(normalizeAnalysisDataStatus("live")).toBe("live");
  expect(normalizeAnalysisDataStatus("file-normalized")).toBe("cached");
  expect(normalizeAnalysisDataStatus("partial-fallback")).toBe("supplemented");
  expect(normalizeAnalysisDataStatus("sample-fallback")).toBe("supplemented");
});
```

- [ ] **Step 2: Add snapshot types and pure builder**

```ts
export type AnalysisDataStatus = "live" | "cached" | "supplemented" | "unavailable";

export interface AnalysisDatasetState<T> {
  status: AnalysisDataStatus;
  value?: T;
  retrievedAt?: string;
  validUntil?: string;
  sourceName: string;
  message?: string;
}

export interface AnalysisDatasets {
  tourism: AnalysisDatasetState<TourismContext>;
  trends: AnalysisDatasetState<TrendContext>;
  traffic: AnalysisDatasetState<TrafficContext>;
  spending: AnalysisDatasetState<SpendingContext>;
  demandBackdata: AnalysisDatasetState<DemandBackdataContext>;
  weather: AnalysisDatasetState<WeatherContext>;
}

export interface CanonicalAnalysisMetrics {
  summary: SummaryKpiMetrics;
  economic: EconomicImpactMetrics;
}

export interface FestivalAnalysisSnapshot {
  analysisId: string;
  analysisKey: string;
  festivalId: string;
  createdAt: string;
  modelVersion: "phase1-v1";
  plan: FestivalPlan;
  selectedFestivalBasis?: SelectedFestivalBasis;
  selectedHour: number;
  datasets: AnalysisDatasets;
  forecast: ForecastResult;
  simulation: SimulationResult;
  safety: SafetyDecisionProfiles;
  metrics: CanonicalAnalysisMetrics;
  report: PlanningReport;
  evidence: Record<MetricEvidenceId, MetricEvidence>;
}
```

Define these snapshot interfaces in `analysisSnapshot.ts`, importing existing context types from `domain/types.ts`, `WeatherContext` from `weatherAdapter.ts`, and metric result types from `impactMetrics.ts`. Keep only shared primitive metric types in `domain/types.ts` to avoid circular imports.

Use a deterministic `analysisKey` from festival ID, plan values that affect analysis, selected hour, and model version. Generate `analysisId` only when committing a completed snapshot.

- [ ] **Step 3: Write failing stale-request hook tests**

```tsx
it("does not commit an older festival response after a newer selection", async () => {
  function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((next) => { resolve = next; });
    return { promise, resolve };
  }
  const first = deferred<TourismContext>();
  const second = deferred<TourismContext>();
  const { result, rerender } = renderHook(
    ({ plan }) => useFestivalAnalysis({ plan, selectedHour: 20 }, dependencies),
    { initialProps: { plan: firstPlan } },
  );

  rerender({ plan: secondPlan });
  second.resolve(secondTourism);
  await waitFor(() => expect(result.current.snapshot?.plan.name).toBe(secondPlan.name));

  first.resolve(firstTourism);
  await act(async () => Promise.resolve());
  expect(result.current.snapshot?.plan.name).toBe(secondPlan.name);
});
```

Define dependency injection explicitly:

```ts
export interface FestivalAnalysisDependencies {
  loadTourism: typeof getTourismContext;
  loadTrends: typeof getTrendContext;
  loadTraffic: typeof getTrafficContext;
  loadSpending: typeof getSpendingContext;
  loadDemandBackdata: typeof getDemandBackdataContextFromApi;
  loadWeather: (plan: FestivalPlan, signal: AbortSignal) => Promise<WeatherContext>;
  now: () => Date;
}
```

- [ ] **Step 4: Implement the atomic loader hook**

The hook starts one `AbortController` per analysis key and calls all required adapters with the same plan snapshot. Use `Promise.allSettled`; adapters already return labelled fallback contexts for recoverable failures, while rejected results become `unavailable`. Build the snapshot only after every dataset has settled. Before committing, compare the request key with the latest key.

```ts
if (requestKey !== latestRequestKey.current || controller.signal.aborted) return;
setState({
  phase: "ready",
  snapshot: createAnalysisSnapshot(resolvedInput),
  pendingFestivalTitle: undefined,
  errorMessages,
});
```

Never substitute a previous festival's context while a new request is loading.

- [ ] **Step 5: Replace independent App data states**

Remove `tourismState`, `trafficState`, `spendingState`, `demandBackdataState`, `trendState`, and their five effects. Keep candidate search separate because it is planning input, not committed analysis output.

```ts
const analysis = useFestivalAnalysis({
  plan,
  selectedFestivalBasis,
  selectedCandidate,
  selectedHour,
});

const committed = analysis.snapshot;
```

Render result sections only from `committed`. During initial loading, render a stable loading state. During refresh, retain the previous snapshot with its original title and show that the draft festival is pending.

- [ ] **Step 6: Run hook and App tests**

Run: `npx vitest run src/services/analysisSnapshot.test.ts src/hooks/useFestivalAnalysis.test.tsx src/App.test.tsx src/App.selectedBasis.test.tsx tests/festivalSwitch.test.ts`

Expected: PASS; stale results cannot overwrite the latest festival and no panel receives mixed plan keys.

- [ ] **Step 7: Commit**

```bash
git add src/domain/types.ts src/services/analysisSnapshot.ts src/services/analysisSnapshot.test.ts src/hooks/useFestivalAnalysis.ts src/hooks/useFestivalAnalysis.test.tsx src/App.tsx src/App.test.tsx src/App.selectedBasis.test.tsx
git commit -m "feat: commit analysis data atomically"
```

---

### Task 6: Make Dashboard, CSV, Print, and Documentation Agree

**Files:**
- Create: `src/components/AnalysisStatusBanner.tsx`
- Create: `src/components/AnalysisStatusBanner.test.tsx`
- Create: `tests/analysisOutputConsistency.test.tsx`
- Create: `scripts/docs-link-check.js`
- Create: `scripts/docs-link-check.test.js`
- Modify: `src/App.tsx:594-853`
- Modify: `src/components/ReportView.tsx`
- Modify: `src/components/B2gPrintReport.tsx`
- Modify: `src/components/CsvExportButton.tsx`
- Modify: `src/utils/csvExport.ts`
- Modify: `tests/csvExport.test.ts`
- Modify: `src/styles.css`
- Modify: `package.json`
- Modify: `README.md`
- Modify: `docs/README.md`
- Modify: `docs/DATA_RELIABILITY_REPORT.md`

**Interfaces:**
- Consumes: `FestivalAnalysisSnapshot` from Task 5.
- Produces: a single snapshot prop for report, print, and export components.
- Produces: `checkMarkdownLinks(entryFiles): BrokenLink[]` for repository verification.

- [ ] **Step 1: Write failing output consistency tests**

```tsx
it("uses the committed analysis identity and canonical values everywhere", () => {
  render(<App />);
  const analysisId = screen.getByTestId("analysis-id").textContent;
  const dashboardVisitors = screen.getByTestId("dashboard-expected-visitors").textContent;
  const reportVisitors = screen.getByTestId("report-expected-visitors").textContent;
  const printRoot = document.querySelector("[data-print-analysis-id]");

  expect(reportVisitors).toBe(dashboardVisitors);
  expect(printRoot).toHaveAttribute("data-print-analysis-id", analysisId);
});
```

```ts
it("exports snapshot metadata and the same expected visitor value", () => {
  const csv = buildCsvReportContent({ snapshot });
  expect(csv).toContain(`분석 ID,${snapshot.analysisId}`);
  expect(csv).toContain(`모델 버전,${snapshot.modelVersion}`);
  expect(csv).toContain(`예상 방문객,${snapshot.forecast.expectedVisitors}`);
});
```

- [ ] **Step 2: Make report, print, and CSV consume the snapshot**

```ts
interface ReportViewProps {
  snapshot: FestivalAnalysisSnapshot;
  onOpenEvidence: (metricId: MetricEvidenceId) => void;
}

interface B2gPrintReportProps {
  snapshot?: FestivalAnalysisSnapshot;
}

interface CsvExportButtonProps {
  snapshot: FestivalAnalysisSnapshot;
}
```

Remove `createSimulation` calls from `ReportView` and `B2gPrintReport`. Remove independent metric creation inside result components where the value already exists in the snapshot. Add `analysisId`, `modelVersion`, `createdAt`, and dataset status rows to CSV and print metadata.

- [ ] **Step 3: Add a visible analysis status banner**

```tsx
export function AnalysisStatusBanner({ phase, snapshot, pendingFestivalTitle }: Props) {
  if (phase === "loading" && !snapshot) {
    return <div role="status">분석 자료를 준비하고 있습니다.</div>;
  }
  if (phase === "refreshing" && snapshot) {
    return (
      <div role="status">
        현재 결과는 {snapshot.plan.name} 기준입니다. {pendingFestivalTitle} 자료를 갱신하고 있습니다.
      </div>
    );
  }
  return (
    <div role="status" data-testid="analysis-id">
      분석 기준 {snapshot?.createdAt} · {snapshot?.analysisId}
    </div>
  );
}
```

Use this exact prop contract:

```ts
interface AnalysisStatusBannerProps {
  phase: "loading" | "refreshing" | "ready" | "error";
  snapshot?: FestivalAnalysisSnapshot;
  pendingFestivalTitle?: string;
  errorMessages: string[];
}
```

Rename `Props` in the implementation snippet to `AnalysisStatusBannerProps`.

Display a compact dataset status summary using `실조회`, `유효 저장자료`, `검증 보완`, `사용 불가`. Do not use `실데이터 우선` as a blanket label when any required dataset is supplemented.

- [ ] **Step 4: Write and run the Markdown link checker test**

```js
import { describe, expect, it } from "vitest";
import { checkMarkdownLinks } from "./docs-link-check.js";

describe("docs link check", () => {
  it("reports no missing local Markdown targets from repository entry documents", () => {
    expect(checkMarkdownLinks(["README.md", "docs/README.md"])).toEqual([]);
  });
});
```

The checker must ignore `http:`, `https:`, anchors, and image links, resolve relative links from each document directory, and return `{ source, target }` for missing files.

- [ ] **Step 5: Repair documentation and claims**

- Replace README links with files that exist under the current `docs` tree.
- Replace SQLite claims with `JSON 파일 저장소` in current-state sections.
- Describe PostgreSQL as Phase 2 work, not current capability.
- Update `DATA_RELIABILITY_REPORT.md` so physical density is marked unavailable when venue area is absent.
- Replace the fixed test-count claim with the current verified count only after the final test run.
- Add `"test:docs": "node scripts/docs-link-check.js README.md docs/README.md"` to `package.json`.

- [ ] **Step 6: Run focused output tests**

Run: `npx vitest run tests/analysisOutputConsistency.test.tsx tests/csvExport.test.ts src/components/B2gPrintReport.test.tsx src/components/ReportView.test.tsx src/components/AnalysisStatusBanner.test.tsx scripts/docs-link-check.test.js`

Expected: PASS; dashboard, report, print, and CSV share one analysis ID and matching values, and entry-document links resolve.

- [ ] **Step 7: Run full verification**

Run: `npm test`

Expected: all test files PASS.

Run: `npm run test:docs`

Expected: exit code 0 with no broken links.

Run: `npm run build`

Expected: TypeScript and Vite build PASS with no missing VWorld environment placeholder warning when the build environment supplies `VITE_VWORLD_API_KEY`.

Run: `npm audit --omit=dev --audit-level=high`

Expected: record the existing dependency finding for the separate Phase 3 security plan; do not expand this Phase 1 implementation by changing unrelated dependencies.

- [ ] **Step 8: Verify the public workflow visually**

Start the app with `npm run dev -- --host 127.0.0.1`. Check desktop `1440x900` and mobile `390x844` using the in-app browser.

Verify:

- selecting a festival changes title, period, address, coordinates, and operational notes together;
- the old snapshot remains clearly labelled during refresh;
- no screen displays COEX or 삼성역 for the Seoul fireworks plan;
- summary and detailed safety staffing agree for the selected day profile;
- unavailable physical density and evacuation values explain which inputs are missing;
- CSV and print output use the same analysis ID shown on screen;
- no text overlaps the heatmap or compact mobile controls.

- [ ] **Step 9: Commit**

```bash
git add src/App.tsx src/components/AnalysisStatusBanner.tsx src/components/AnalysisStatusBanner.test.tsx src/components/ReportView.tsx src/components/B2gPrintReport.tsx src/components/CsvExportButton.tsx src/utils/csvExport.ts tests/analysisOutputConsistency.test.tsx tests/csvExport.test.ts src/styles.css scripts/docs-link-check.js scripts/docs-link-check.test.js package.json README.md docs/README.md docs/DATA_RELIABILITY_REPORT.md
git commit -m "test: enforce analysis output consistency"
```

---

## Completion Gate

Phase 1 is complete only when all of the following are true:

- No production path contains fixed Gangnam coordinates, 삼성역, or COEX operational notes.
- Festival corrections are read from `data/festival_corrections.json` by both client and server paths.
- One canonical service supplies summary and detailed safety values.
- Relative congestion scores are never labelled `명/m²`.
- Physical density and evacuation time display `산출 불가` when geometry inputs are missing.
- Success potential stays within 0~100 and capacity pressure remains a separate ratio.
- A stale data response cannot overwrite the latest selected festival.
- Dashboard, report, CSV, and print output share one analysis ID and canonical values.
- README and docs index contain no broken local Markdown links.
- Full tests, documentation link check, and production build pass.
