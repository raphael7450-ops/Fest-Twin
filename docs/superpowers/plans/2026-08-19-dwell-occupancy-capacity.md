# Dwell Occupancy Capacity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate hourly arrivals from concurrent occupancy and use dwell-aware occupancy for crowd, parking, restroom, evacuation, and departure-pressure decisions.

**Architecture:** Add a pure `visitorOccupancy` domain service that selects an explainable festival dwell profile and converts hourly arrival cohorts into occupancy, departures, and cumulative arrivals. `forecast.ts` remains responsible for daily unique demand and arrival weights, while safety and infrastructure services consume occupancy and explicit facility inputs. Existing `visitorsByHour` remains a compatibility alias for occupancy.

**Tech Stack:** TypeScript, React 18, Vitest, Testing Library, Vite, existing Fest-Twin service and evidence architecture

**Spec:** `docs/superpowers/specs/2026-08-19-dwell-occupancy-capacity-design.md`

## Global Constraints

- Do not scrape 한국관광 데이터랩 or invent observed festival dwell values.
- First release uses type defaults with `low` confidence unless a user adjusts the average dwell time.
- Average dwell time is limited to 30-720 minutes.
- Hourly arrivals sum to daily unique visitors after integer rounding correction.
- Retention rates stay in 0-1 and never increase with elapsed time.
- `visitorsByHour` remains a compatibility alias for concurrent occupancy.
- Density, safety staffing, evacuation, parking, and restroom metrics use concurrent occupancy.
- Waste and economic impact continue to use daily unique visitors.
- Missing parking or restroom capacity must produce `input-required`, not a fabricated available capacity.
- Existing scenarios without the new fields must restore successfully.
- TourAPI festival selection clears prior dwell and facility overrides.
- No gradients are introduced in UI controls.
- Each task follows red-green-refactor TDD and ends with a focused test run and commit.
- The known baseline failures in `tests/dataSanity.test.ts` and `tests/festivalSwitch.test.ts` are recorded separately; no new full-suite failures are allowed.

---

## File Structure

- Create `src/services/visitorOccupancy.ts`: profile classification, retention scaling, cohort flow calculation, compatibility accessors.
- Create `src/services/visitorOccupancy.test.ts`: conservation, profile classification, long-dwell and fireworks behavior.
- Modify `src/domain/types.ts`: dwell profile, visitor-flow, forecast, plan, and infrastructure result contracts.
- Modify `src/services/forecast.ts`: treat weights as arrivals, invoke occupancy engine, produce day-type flows.
- Modify `src/services/forecast.test.ts`: forecast integration and compatibility assertions.
- Modify `src/services/capacityAndSafetyForecast.ts`: explicit facility inputs, occupancy parking/restroom, departure pressure.
- Modify `src/services/capacityAndSafetyForecast.test.ts`: available and input-required capacity states.
- Modify `src/services/simulation.ts`, `src/services/safetyDecisionMetrics.ts`, `src/services/impactMetrics.ts`: consume occupancy through one accessor.
- Modify their existing tests: prove occupancy, not arrivals, drives safety.
- Modify `src/services/scenarioStorage.ts` and tests: normalize new plan fields.
- Modify `src/services/festivalSelection.ts` and tests: clear stale overrides on festival switch.
- Modify `src/components/PlanForm.tsx` and tests: dwell and facility inputs.
- Modify `src/components/ForecastChart.tsx` and tests: occupancy/arrival segmented view and flow summary.
- Modify `src/components/InfrastructureCapacityPanel.tsx` and tests: input-required and departure-pressure states.
- Modify `src/services/metricEvidence.ts` and tests: dwell and flow evidence.
- Modify `src/utils/csvExport.ts`, `tests/csvExport.test.ts`: audit fields.
- Modify `src/components/B2gPrintReport.tsx`, `src/components/B2gPrintReport.test.tsx`: print fields.
- Modify `src/components/ReportView.tsx`, `src/components/ReportView.test.tsx`: public-review report fields.
- Modify `src/index.css`: responsive controls and flow rows without gradients.

---

### Task 1: Pure Dwell Profile and Occupancy Engine

**Files:**
- Create: `src/services/visitorOccupancy.ts`
- Create: `src/services/visitorOccupancy.test.ts`
- Modify: `src/domain/types.ts`

**Interfaces:**
- Consumes: `FestivalPlan`, daily unique visitor count, ordered hourly arrivals.
- Produces: `selectDwellProfile(plan, demandBackdata?)`, `buildVisitorFlow(arrivals, profile, anchorEndHour?)`, `occupancySeries(forecast)`, `DwellProfile`, `HourlyVisitorFlow`.

- [ ] **Step 1: Add failing type and classification tests**

```ts
it("classifies fireworks plans as long-dwell performance profiles", () => {
  const profile = selectDwellProfile({
    ...sampleFestivalPlan,
    name: "서울세계불꽃축제",
    keywords: ["불꽃", "야간관광"],
  });
  expect(profile).toMatchObject({
    kind: "fireworks-performance",
    averageMinutes: 270,
    sourceType: "type-default",
    confidence: "low",
  });
});

it("uses a valid user dwell override and rejects out-of-range values", () => {
  const fireworksPlan = {
    ...sampleFestivalPlan,
    name: "서울세계불꽃축제",
    keywords: ["불꽃", "야간관광"],
  };
  expect(selectDwellProfile({ ...fireworksPlan, averageDwellMinutes: 360 }))
    .toMatchObject({ averageMinutes: 360, sourceType: "user-adjusted" });
  expect(selectDwellProfile({ ...fireworksPlan, averageDwellMinutes: 900 }).averageMinutes)
    .toBe(270);
});
```

- [ ] **Step 2: Run the classification tests and verify RED**

Run: `npm test -- --run src/services/visitorOccupancy.test.ts`

Expected: FAIL because `visitorOccupancy.ts` and dwell contracts do not exist.

- [ ] **Step 3: Add the domain contracts and profile selector**

Add to `src/domain/types.ts`:

```ts
export type DwellProfileKind =
  | "fireworks-performance"
  | "food-experience"
  | "night-exhibition"
  | "street-parade"
  | "daytime-general";

export interface DwellProfile {
  kind: DwellProfileKind;
  label: string;
  averageMinutes: number;
  sourceType:
    | "festival-observed"
    | "place-benchmark"
    | "similar-festival"
    | "type-default"
    | "user-adjusted";
  sourceName: string;
  confidence: "high" | "medium" | "low";
  retentionRates: number[];
}

export interface HourlyVisitorFlow {
  hour: number;
  arrivals: number;
  occupancy: number;
  departures: number;
  cumulativeArrivals: number;
}
```

Add optional plan fields:

```ts
averageDwellMinutes?: number;
parkingCapacityVehicles?: number;
restroomFixtureCount?: number;
```

Implement keyword classification in `visitorOccupancy.ts` with the exact defaults and retention arrays from the spec. Export:

```ts
export function selectDwellProfile(
  plan: FestivalPlan,
  demandBackdata?: DemandBackdataContext,
): DwellProfile;
```

User override scales the elapsed-time axis by `overrideMinutes / defaultMinutes` using linear interpolation, then clamps and enforces monotonic decrease.

- [ ] **Step 4: Run classification tests and verify GREEN**

Run: `npm test -- --run src/services/visitorOccupancy.test.ts`

Expected: classification and override tests PASS.

- [ ] **Step 5: Add failing cohort-flow conservation tests**

```ts
it("conserves arrivals across occupancy and departures", () => {
  const flow = buildVisitorFlow(
    [{ hour: 18, visitors: 100 }, { hour: 19, visitors: 100 }, { hour: 20, visitors: 100 }],
    selectDwellProfile({ ...sampleFestivalPlan, keywords: ["먹거리"] }),
  );
  expect(flow.at(-1)?.cumulativeArrivals).toBe(300);
  expect(flow.every((point) => point.occupancy >= 0 && point.departures >= 0)).toBe(true);
});

it("produces a larger occupancy peak for a longer dwell profile", () => {
  const arrivals = [10, 11, 12, 13].map((hour) => ({ hour, visitors: 1_000 }));
  const shortProfile = selectDwellProfile({
    ...sampleFestivalPlan,
    name: "거리 퍼레이드",
    keywords: ["퍼레이드"],
  });
  const longProfile = selectDwellProfile({
    ...sampleFestivalPlan,
    name: "불꽃 공연",
    keywords: ["불꽃"],
  });
  const shortPeak = Math.max(...buildVisitorFlow(arrivals, shortProfile).map((p) => p.occupancy));
  const longPeak = Math.max(...buildVisitorFlow(arrivals, longProfile).map((p) => p.occupancy));
  expect(longPeak).toBeGreaterThan(shortPeak);
});

it("retains fireworks visitors until the anchor and releases them after it", () => {
  const arrivals = [18, 19, 20, 21].map((hour) => ({ hour, visitors: 1_000 }));
  const profile = selectDwellProfile({
    ...sampleFestivalPlan,
    name: "불꽃 공연",
    keywords: ["불꽃"],
  });
  const flow = buildVisitorFlow(arrivals, profile, 21);
  const at20 = flow.find((point) => point.hour === 20)!;
  const at21 = flow.find((point) => point.hour === 21)!;
  const at22 = flow.find((point) => point.hour === 22)!;
  expect(at21.occupancy).toBeGreaterThan(at20.arrivals);
  expect(at22.departures).toBeGreaterThan(at20.departures);
});
```

- [ ] **Step 6: Run flow tests and verify RED**

Run: `npm test -- --run src/services/visitorOccupancy.test.ts`

Expected: FAIL because `buildVisitorFlow` is missing.

- [ ] **Step 7: Implement cohort flow and compatibility accessors**

```ts
export function buildVisitorFlow(
  arrivals: Array<{ hour: number; visitors: number }>,
  profile: DwellProfile,
  anchorEndHour?: number,
): HourlyVisitorFlow[];

export function occupancySeries(
  forecast: Pick<ForecastResult, "visitorsByHour" | "occupancyByHour">,
): Array<{ hour: number; visitors: number }> {
  return forecast.occupancyByHour ?? forecast.visitorsByHour;
}
```

Extend flow through `anchorEndHour + 2` or until all modeled cohorts have departed. Apply the fireworks anchor floor and post-anchor caps from the spec. Round cohort contributions only after summation per hour so small cohorts are not lost.

- [ ] **Step 8: Run Task 1 tests and commit**

Run: `npm test -- --run src/services/visitorOccupancy.test.ts`

Expected: all Task 1 tests PASS.

```bash
git add src/domain/types.ts src/services/visitorOccupancy.ts src/services/visitorOccupancy.test.ts
git commit -m "feat: add dwell occupancy engine"
```

---

### Task 2: Forecast Arrival and Occupancy Integration

**Files:**
- Modify: `src/services/forecast.ts`
- Modify: `src/services/forecast.test.ts`
- Modify: `src/domain/types.ts`

**Interfaces:**
- Consumes: `selectDwellProfile`, `buildVisitorFlow` from Task 1.
- Produces: complete flow arrays on `ForecastResult` and each `DayTypeProfile`.

- [ ] **Step 1: Add failing forecast integration tests**

```ts
it("separates daily arrivals from concurrent occupancy", () => {
  const forecast = createForecast(sampleFestivalPlan, sampleTourismContext, sampleTrendContext);
  expect(forecast.arrivalsByHour.reduce((total, point) => total + point.visitors, 0))
    .toBe(forecast.expectedVisitors);
  expect(forecast.occupancyByHour).toEqual(forecast.visitorsByHour);
  const peakPoint = forecast.occupancyByHour.reduce((peak, point) =>
    point.visitors > peak.visitors ? point : peak,
  );
  expect(forecast.peakHour).toBe(peakPoint.hour);
  expect(Math.max(...forecast.occupancyByHour.map((x) => x.visitors)))
    .toBeGreaterThan(Math.max(...forecast.arrivalsByHour.map((x) => x.visitors)));
});

it("applies the same dwell model to weekday and weekend profiles", () => {
  const { weekday, weekend } = createForecast(
    sampleFestivalPlan,
    sampleTourismContext,
    sampleTrendContext,
  ).dayTypeProfiles!;
  expect(weekday.arrivalsByHour.reduce((total, point) => total + point.visitors, 0))
    .toBe(weekday.expectedDailyVisitors);
  expect(weekend.peakVisitors).toBeGreaterThan(weekday.peakVisitors);
  expect(weekend.dwellProfile.kind).toBe(weekday.dwellProfile.kind);
});
```

- [ ] **Step 2: Run forecast tests and verify RED**

Run: `npm test -- --run src/services/forecast.test.ts`

Expected: FAIL because flow arrays are absent.

- [ ] **Step 3: Extend forecast and day-profile contracts**

Add required fields to newly generated results and optional fields for fixture compatibility:

```ts
arrivalsByHour?: Array<{ hour: number; visitors: number }>;
occupancyByHour?: Array<{ hour: number; visitors: number }>;
departuresByHour?: Array<{ hour: number; visitors: number }>;
cumulativeArrivalsByHour?: Array<{ hour: number; visitors: number }>;
dwellProfile?: DwellProfile;
```

Keep `visitorsByHour` required.

- [ ] **Step 4: Refactor hourly weights into integer-corrected arrivals**

Add a local helper that distributes rounding remainder to the largest-weight hours so:

```ts
sum(arrivalsByHour.map((x) => x.visitors)) === expectedVisitors
```

Call `selectDwellProfile(plan, demandBackdata)`, find the highest-draw program end hour, and call `buildVisitorFlow`. Map flow properties into the four arrays and set `visitorsByHour = occupancyByHour`.

- [ ] **Step 5: Generate weekday and weekend flow independently**

Scale daily unique visitors and recompute integer-corrected arrivals before cohort calculation. Do not multiply already-computed occupancy because that can break conservation after rounding.

- [ ] **Step 6: Run forecast and downstream smoke tests**

Run:

```bash
npm test -- --run src/services/forecast.test.ts src/services/simulation.test.ts src/services/safetyDecisionMetrics.test.ts
```

Expected: all selected tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/domain/types.ts src/services/forecast.ts src/services/forecast.test.ts
git commit -m "feat: forecast arrivals and concurrent occupancy"
```

---

### Task 3: Safety, Parking, Restroom, and Departure Calculations

**Files:**
- Modify: `src/services/capacityAndSafetyForecast.ts`
- Modify: `src/services/capacityAndSafetyForecast.test.ts`
- Modify: `src/services/simulation.ts`
- Modify: `src/services/simulation.test.ts`
- Modify: `src/services/safetyDecisionMetrics.ts`
- Modify: `src/services/safetyDecisionMetrics.test.ts`
- Modify: `src/services/impactMetrics.ts`
- Modify: `src/services/impactMetrics.test.ts`
- Modify: `src/domain/types.ts`

**Interfaces:**
- Consumes: `occupancySeries(forecast)`, optional departure arrays, explicit plan capacities.
- Produces: capacity status, recommended capacities, peak departures, and occupancy-based safety results.

- [ ] **Step 1: Add failing occupancy-consumer tests**

Create `arrivalOnlyForecast` and `dwellForecast` fixtures with the same daily unique visitors. Give both an arrivals peak at 18:00, but let `dwellForecast.occupancyByHour` peak at 20:00 while `arrivalOnlyForecast.visitorsByHour` mirrors arrivals. Assert simulation, density, staffing, and parking respond to the 20:00 occupancy value.

```ts
expect(createSimulation(plan, forecast, 20).congestionScore)
  .toBeGreaterThan(createSimulation(plan, forecast, 18).congestionScore);
const dwellStaffing = createSafetyDecisionProfiles(
  plan,
  dwellForecast,
  createSimulation(plan, dwellForecast, 20),
).summary.staffing.recommended;
const arrivalOnlyStaffing = createSafetyDecisionProfiles(
  plan,
  arrivalOnlyForecast,
  createSimulation(plan, arrivalOnlyForecast, 18),
).summary.staffing.recommended;
expect(dwellStaffing).toBeGreaterThan(arrivalOnlyStaffing);
```

- [ ] **Step 2: Add failing facility-state tests**

In the test file, define `dwellForecast` as a complete `ForecastResult` fixture. Include `expectedVisitors: 6000`, matching hour keys in all flow arrays, an occupancy peak at 20:00, and a departures peak at 22:00. Keep legacy-required forecast fields from the existing fixture factory rather than casting a partial object.

```ts
it("requires explicit parking and restroom capacity", () => {
  const result = calculateInfrastructureCapacityForecast(
    { ...sampleFestivalPlan, parkingCapacityVehicles: undefined, restroomFixtureCount: undefined },
    dwellForecast,
  );
  expect(result.parkingStatus).toBe("input-required");
  expect(result.restroomStatus).toBe("input-required");
  expect(result.parkingPeakOccupancyRate).toBeUndefined();
  expect(result.restroomDeficitCount).toBeUndefined();
  expect(result.recommendedParkingCapacity).toBeGreaterThan(0);
  expect(result.recommendedRestroomCount).toBeGreaterThan(0);
});

it("calculates first fill time and peak departure pressure with explicit inputs", () => {
  const result = calculateInfrastructureCapacityForecast(
    { ...sampleFestivalPlan, parkingCapacityVehicles: 800, restroomFixtureCount: 40 },
    dwellForecast,
  );
  expect(result.parkingStatus).toBe("available");
  expect(result.peakDepartureHour).toBe(22);
  expect(result.peakDepartures).toBeGreaterThan(0);
});
```

- [ ] **Step 3: Run focused tests and verify RED**

Run:

```bash
npm test -- --run src/services/capacityAndSafetyForecast.test.ts src/services/simulation.test.ts src/services/safetyDecisionMetrics.test.ts src/services/impactMetrics.test.ts
```

Expected: new assertions FAIL.

- [ ] **Step 4: Extend `InfrastructureCapacityForecast`**

```ts
parkingStatus: "available" | "input-required";
restroomStatus: "available" | "input-required";
parkingPeakOccupancyRate?: number;
providedParkingCapacity?: number;
recommendedParkingCapacity: number;
restroomDeficitCount?: number;
providedRestroomCount?: number;
recommendedRestroomCount: number;
peakDepartureHour: number;
peakDepartures: number;
```

Keep `estimatedVehicles`, `requiredRestroomCount`, wait minutes, and waste fields. Make fields optional only where `input-required` has no defensible value.

- [ ] **Step 5: Implement explicit facility and departure calculations**

Use peak concurrent occupancy for vehicle and restroom demand:

```ts
estimatedVehicles = Math.round((peakOccupancy * 0.18) / 2.5);
requiredRestroomCount = Math.ceil(peakOccupancy / 250);
```

Use each hour's occupancy to find the first parking fill hour. Use `departuresByHour`, falling back to zero for legacy fixtures. Waste remains `expectedDailyVisitors * 0.4kg`.

- [ ] **Step 6: Migrate safety consumers through `occupancySeries`**

Replace direct reads of `forecast.visitorsByHour` in simulation, safety, impact, and metric derivation paths where the quantity means people present. Do not replace daily unique visitor reads for economics or waste.

- [ ] **Step 7: Run Task 3 tests and commit**

Run the Step 3 command again. Expected: PASS.

```bash
git add src/domain/types.ts src/services/capacityAndSafetyForecast.ts src/services/capacityAndSafetyForecast.test.ts src/services/simulation.ts src/services/simulation.test.ts src/services/safetyDecisionMetrics.ts src/services/safetyDecisionMetrics.test.ts src/services/impactMetrics.ts src/services/impactMetrics.test.ts
git commit -m "feat: use occupancy for safety and facilities"
```

---

### Task 4: Plan Inputs, Scenario Persistence, and Festival Reset

**Files:**
- Modify: `src/components/PlanForm.tsx`
- Modify: `src/components/PlanForm.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/services/scenarioStorage.ts`
- Modify: `src/services/scenarioStorage.test.ts`
- Modify: `src/services/festivalSelection.ts`
- Modify: `src/services/festivalSelection.test.ts`

**Interfaces:**
- Consumes: plan optional fields and the actual `forecast.dwellProfile` selected with demand backdata.
- Produces: validated plan edits, persisted assumptions, clean festival-switch behavior.

- [ ] **Step 1: Add failing scenario and selection tests**

```ts
it("normalizes positive dwell and facility inputs", () => {
  const plan = normalizeFestivalPlan({
    ...sampleFestivalPlan,
    averageDwellMinutes: 360,
    parkingCapacityVehicles: 1500,
    restroomFixtureCount: 80,
  });
  expect(plan).toMatchObject({
    averageDwellMinutes: 360,
    parkingCapacityVehicles: 1500,
    restroomFixtureCount: 80,
  });
});

it("clears dwell and facility overrides when selecting a festival", () => {
  const changed = applyFestivalCandidateToPlan(planWithOverrides, otherFestival, options);
  expect(changed.averageDwellMinutes).toBeUndefined();
  expect(changed.parkingCapacityVehicles).toBeUndefined();
  expect(changed.restroomFixtureCount).toBeUndefined();
});
```

- [ ] **Step 2: Add failing PlanForm interaction tests**

Assert that the automatic profile label is visible, entering `360`, `1500`, and `80` calls `onPlanChange` with the matching fields, and `자동값 복원` clears only those fields.

- [ ] **Step 3: Run tests and verify RED**

Run:

```bash
npm test -- --run src/services/scenarioStorage.test.ts src/services/festivalSelection.test.ts src/components/PlanForm.test.tsx
```

- [ ] **Step 4: Normalize and reset the new fields**

Reuse `normalizePositiveNumber`. Add an explicit 30-720 check for dwell minutes. In `applyFestivalCandidateToPlan`, clear all three fields whenever a TourAPI candidate is applied; saved scenario restoration does not call this function and therefore preserves its values.

- [ ] **Step 5: Add `체류·시설 가정` controls**

Use number inputs with stable labels and these constraints:

```tsx
<input type="number" min={30} max={720} step={30} />
<input type="number" min={1} step={1} />
<input type="number" min={1} step={1} />
```

Add a required `dwellProfile: DwellProfile` prop to `PlanForm` and pass `forecast.dwellProfile ?? selectDwellProfile(plan)` from `App`; the fallback exists only for legacy test fixtures. Show that profile's label, source, and confidence so production form and calculation never classify independently. Empty input means automatic/input-required. The reset button uses the existing secondary button style and no gradient.

- [ ] **Step 6: Run tests and commit**

Run the Step 3 command. Expected: PASS.

```bash
git add src/App.tsx src/App.test.tsx src/components/PlanForm.tsx src/components/PlanForm.test.tsx src/services/scenarioStorage.ts src/services/scenarioStorage.test.ts src/services/festivalSelection.ts src/services/festivalSelection.test.ts
git commit -m "feat: add dwell and facility planning inputs"
```

---

### Task 5: Flow and Infrastructure User Interface

**Files:**
- Modify: `src/components/ForecastChart.tsx`
- Modify: `src/components/ForecastChart.test.tsx`
- Modify: `src/components/InfrastructureCapacityPanel.tsx`
- Create: `src/components/InfrastructureCapacityPanel.test.tsx`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: flow arrays, dwell profile, infrastructure status from Tasks 2-3.
- Produces: operational flow visualization and explicit input-required states.

- [ ] **Step 1: Add failing ForecastChart tests**

Assert default `동시 체류`, mode switch to `신규 유입`, average dwell summary, peak departures, and fallback rendering when only legacy `visitorsByHour` exists.

```ts
expect(screen.getByRole("tab", { name: "동시 체류" })).toHaveAttribute("aria-selected", "true");
await user.click(screen.getByRole("tab", { name: "신규 유입" }));
expect(screen.getByText("시간대 신규 유입")).toBeInTheDocument();
expect(screen.getByText(/평균 체류 270분/)).toBeInTheDocument();
```

- [ ] **Step 2: Add failing infrastructure panel tests**

Assert `기획 입력 필요`, recommended capacity, explicit occupancy rate after inputs, and `22:00 최대 이탈` display.

- [ ] **Step 3: Run component tests and verify RED**

Run:

```bash
npm test -- --run src/components/ForecastChart.test.tsx src/components/InfrastructureCapacityPanel.test.tsx
```

- [ ] **Step 4: Implement segmented flow modes and summaries**

Use two `role="tab"` buttons. Keep day-type tabs independent from flow mode. Use `occupancyByHour ?? visitorsByHour` and `arrivalsByHour ?? visitorsByHour` for compatibility.

- [ ] **Step 5: Implement capacity states and departure card**

Do not compare optional percentages before checking `parkingStatus`. For input-required cards show recommendations and no risk-colored percentage badge.

- [ ] **Step 6: Add responsive styles**

Add stable grid tracks and mobile stacking at the existing mobile breakpoint. Ensure labels wrap, numeric controls do not exceed containers, and all new button backgrounds are flat colors.

- [ ] **Step 7: Run component tests, build, and commit**

Run:

```bash
npm test -- --run src/components/ForecastChart.test.tsx src/components/InfrastructureCapacityPanel.test.tsx src/components/PlanForm.test.tsx
npm run build
```

Expected: tests and build PASS; the existing bundle-size warning is acceptable.

```bash
git add src/components/ForecastChart.tsx src/components/ForecastChart.test.tsx src/components/InfrastructureCapacityPanel.tsx src/components/InfrastructureCapacityPanel.test.tsx src/index.css
git commit -m "feat: show dwell-aware visitor flow and capacity"
```

---

### Task 6: Evidence, CSV, Print, Browser Verification, and Deployment

**Files:**
- Modify: `src/services/metricEvidence.ts`
- Modify: `src/services/metricEvidence.test.ts`
- Modify: `src/utils/csvExport.ts`
- Modify: `tests/csvExport.test.ts`
- Modify: `src/components/B2gPrintReport.tsx`
- Modify: `src/components/B2gPrintReport.test.tsx`
- Modify: `src/components/ReportView.tsx`
- Modify: `src/components/ReportView.test.tsx`
- Modify: `docs/CHANGELOG.md`

**Interfaces:**
- Consumes: one committed forecast snapshot and capacity result.
- Produces: matching on-screen, audit, CSV, print/PDF explanations and deployable release.

- [ ] **Step 1: Add failing evidence tests**

Assert that peak-density, parking, restroom, and infrastructure evidence includes:

```text
일일 고유 방문객
시간대 신규 유입
최대 동시 체류인원
평균 체류시간
체류 프로필
최대 시간대 이탈
주차면/화장실 입력 상태
```

Also assert ambiguous formula text such as `피크 방문객의 차량 유입` is replaced with concurrent-occupancy wording.

- [ ] **Step 2: Add failing CSV and print/report tests**

Assert the same numeric peak occupancy, dwell minutes, and peak departure hour appear in CSV, print, and report output. Assert user-adjusted source wording when `averageDwellMinutes` exists.

- [ ] **Step 3: Run report tests and verify RED**

Run:

```bash
npm test -- --run src/services/metricEvidence.test.ts tests/csvExport.test.ts src/components/B2gPrintReport.test.tsx src/components/ReportView.test.tsx
```

- [ ] **Step 4: Implement one shared flow summary helper**

Add a small exported helper in `visitorOccupancy.ts` rather than recomputing peak values in four consumers:

```ts
export function summarizeVisitorFlow(forecast: ForecastResult): {
  peakArrivals: number;
  peakArrivalHour: number;
  peakOccupancy: number;
  peakOccupancyHour: number;
  peakDepartures: number;
  peakDepartureHour: number;
};
```

Use this helper in evidence, CSV, print, and report.

- [ ] **Step 5: Update evidence and exported reports**

Keep exact source status:

- Type default: `축제 유형별 기본 체류 프로필`, confidence low.
- User override: `유형 기본값 참고 후 사용자 조정`, confidence low.
- Never label these as observed telecom data.

- [ ] **Step 6: Update changelog and run focused verification**

Run the Step 3 command plus:

```bash
npm test -- --run src/services/visitorOccupancy.test.ts src/services/forecast.test.ts src/services/capacityAndSafetyForecast.test.ts src/services/simulation.test.ts src/services/safetyDecisionMetrics.test.ts src/services/impactMetrics.test.ts src/services/scenarioStorage.test.ts src/services/festivalSelection.test.ts src/components/PlanForm.test.tsx src/components/ForecastChart.test.tsx src/components/InfrastructureCapacityPanel.test.tsx
npm run build
git diff --check
```

- [ ] **Step 7: Run the full suite and compare with baseline**

Run: `npm test -- --run`

Expected: no failures beyond the two documented baseline failures:

- `tests/dataSanity.test.ts`
- `tests/festivalSwitch.test.ts`

If either baseline failure changes shape or any additional test fails, stop and investigate.

- [ ] **Step 8: Verify in the browser**

Start the local server on an unused port. Verify at 1440x1000 and 390x844:

- Seoul fireworks uses the fireworks profile.
- Occupancy peak is greater than the corresponding hourly arrivals.
- Arrival/occupancy mode switch works.
- Editing dwell minutes updates density, parking, restroom, and evidence together.
- Missing facility inputs show input-required; entering values shows computed capacity.
- No horizontal overflow, clipped text, console errors, or warnings.

- [ ] **Step 9: Perform independent code review**

Review the complete diff from `origin/codex/city-park-area-clean` to HEAD against the spec. Fix all Critical and Important findings, rerun affected tests, and request a focused re-review.

- [ ] **Step 10: Commit final evidence changes**

```bash
git add src/services/visitorOccupancy.ts src/services/metricEvidence.ts src/services/metricEvidence.test.ts src/utils/csvExport.ts tests/csvExport.test.ts src/components/B2gPrintReport.tsx src/components/B2gPrintReport.test.tsx src/components/ReportView.tsx src/components/ReportView.test.tsx docs/CHANGELOG.md
git commit -m "feat: report dwell-aware capacity evidence"
```

- [ ] **Step 11: Push and deploy after approval gates pass**

```bash
git push -u origin codex/dwell-occupancy-model
npm run deploy:remote
```

Verify:

- Git remote HEAD equals local HEAD.
- `https://cwserver.tail97dbc3.ts.net/` returns the new bundle.
- Five existing deployment health checks pass.
- Deployed UI shows the dwell profile and occupancy mode.
- No API key or secret-bearing commit is reachable from the pushed branch.
