# Dashboard Evidence Layer Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Goal: Build an evidence layer that explains the sources, formulas, assumptions, confidence, and limitations behind Fest-Twin dashboard and report metrics.

Architecture: Keep the existing forecast, simulation, and impact metric calculations intact. Add a focused evidence service that translates existing calculation outputs into reusable evidence objects, then render those objects through shared UI components in the dashboard and report.

Tech Stack: React 18, TypeScript, Vite, Vitest, Testing Library, existing CSS.

## Global Constraints

- Do not replace the current heuristic forecast, simulation, or impact metric formulas in this feature.
- Make sample, partial fallback, and live TourAPI states visible to the user.
- Keep the government SaaS tone: concise Korean labels, public-sector clarity, no decorative marketing copy.
- Reuse existing components and style conventions where possible.
- Do not commit Naver client secret or any other secret.
- Each task must run focused tests before commit.

---

## File Structure

- Create `src/services/metricEvidence.ts`: Produces evidence objects for dashboard KPI, safety/logistics, ROI, and report evidence summaries.
- Create `src/services/metricEvidence.test.ts`: Verifies evidence generation, confidence labels, and fallback limitations.
- Create `src/components/EvidenceButton.tsx`: Small reusable button for opening metric evidence.
- Create `src/components/MetricEvidenceDrawer.tsx`: Shared right-side evidence drawer.
- Create `src/components/ReportEvidenceSummary.tsx`: Compact evidence summary for the report.
- Modify `src/domain/types.ts`: Add shared evidence types if keeping them in the domain is cleaner than exporting from the service.
- Modify `src/App.tsx`: Generate metric evidence, own selected evidence state, wire drawer and buttons.
- Modify `src/components/SummaryKpiCards.tsx`: Add evidence triggers to the four KPI cards.
- Modify `src/components/SafetyLogisticsPanel.tsx`: Add evidence triggers to safety/logistics metrics.
- Modify `src/components/RoiEconomicImpact.tsx`: Add evidence trigger for ROI.
- Modify `src/components/DataBasisPanel.tsx`: Reframe the existing data source panel around source status, basis, and limitations.
- Modify `src/components/ReportView.tsx`: Add compact evidence summary.
- Modify `src/App.test.tsx`: Verify users can open evidence from dashboard.
- Modify `src/components/ReportView.test.tsx`: Verify report evidence summary renders.
- Modify `src/styles.css`: Add styles for evidence buttons, drawer, source status, and report summary.
- Create `docs/data-methodology.md`: Submission-oriented explanation of sources, formulas, assumptions, confidence, and limitations.

---

### Task 1: Evidence Data Service

Files:
- Create: `src/services/metricEvidence.ts`
- Create: `src/services/metricEvidence.test.ts`
- Modify: `src/domain/types.ts`

Interfaces:
- Consumes: `FestivalPlan`, `ForecastResult`, `SimulationResult`, `TourismContext`, `TrendContext`, existing `createSummaryKpiMetrics`, `createSafetyLogisticsMetrics`, `createEconomicImpactMetrics`
- Produces:
  - `MetricEvidence`
  - `MetricEvidenceId`
  - `MetricConfidenceLabel`
  - `createMetricEvidenceSet(plan, forecast, simulation, tourism, trends): Record<MetricEvidenceId, MetricEvidence>`
  - `createReportEvidenceSummaries(evidenceSet): Array<{ title: string; summary: string; confidenceLabel: string }>`

- [ ] Step 1: Add failing service tests

Create `src/services/metricEvidence.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import { sampleTourismContext } from "../data/sampleTourApi";
import { sampleTrendContext } from "../data/sampleTrends";
import { createForecast } from "./forecast";
import { createSimulation } from "./simulation";
import {
  createMetricEvidenceSet,
  createReportEvidenceSummaries,
} from "./metricEvidence";

describe("metricEvidence", () => {
  it("creates evidence for every persuasive dashboard metric", () => {
    const forecast = createForecast(sampleFestivalPlan, sampleTourismContext, sampleTrendContext);
    const simulation = createSimulation(sampleFestivalPlan, forecast, forecast.peakHour);

    const evidence = createMetricEvidenceSet(
      sampleFestivalPlan,
      forecast,
      simulation,
      sampleTourismContext,
      sampleTrendContext,
    );

    expect(Object.keys(evidence)).toEqual([
      "demand-index",
      "peak-density",
      "budget-efficiency",
      "commercial-spillover",
      "safety-staff",
      "medical-staff",
      "parking-occupancy",
      "economic-roi",
    ]);
    expect(evidence["demand-index"].title).toBe("흥행 예측 지수");
    expect(evidence["demand-index"].dataSources).toContain("TourAPI 주변 관광지 매력도");
    expect(evidence["economic-roi"].formulaSummary).toContain("예상 방문객");
  });

  it("marks sample fallback limitations clearly", () => {
    const tourism = {
      ...sampleTourismContext,
      provenance: {
        ...sampleTourismContext.provenance,
        sourceStatus: "sample-fallback" as const,
      },
    };
    const forecast = createForecast(sampleFestivalPlan, tourism, sampleTrendContext);
    const simulation = createSimulation(sampleFestivalPlan, forecast, forecast.peakHour);

    const evidence = createMetricEvidenceSet(
      sampleFestivalPlan,
      forecast,
      simulation,
      tourism,
      sampleTrendContext,
    );

    expect(evidence["demand-index"].confidenceLabel).toBe("낮음");
    expect(evidence["demand-index"].limitations.join(" ")).toContain("샘플");
  });

  it("creates compact report summaries from evidence", () => {
    const forecast = createForecast(sampleFestivalPlan, sampleTourismContext, sampleTrendContext);
    const simulation = createSimulation(sampleFestivalPlan, forecast, forecast.peakHour);
    const evidence = createMetricEvidenceSet(
      sampleFestivalPlan,
      forecast,
      simulation,
      sampleTourismContext,
      sampleTrendContext,
    );

    expect(createReportEvidenceSummaries(evidence)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "흥행 예측 지수",
          confidenceLabel: expect.any(String),
        }),
      ]),
    );
  });
});
```

- [ ] Step 2: Run test to verify it fails

Run: `npm run test -- src/services/metricEvidence.test.ts`

Expected: FAIL because `./metricEvidence` does not exist.

- [ ] Step 3: Add domain evidence types

Modify `src/domain/types.ts` by adding:

```ts
export type MetricEvidenceId =
  | "demand-index"
  | "peak-density"
  | "budget-efficiency"
  | "commercial-spillover"
  | "safety-staff"
  | "medical-staff"
  | "parking-occupancy"
  | "economic-roi";

export type MetricEvidenceConfidence = "high" | "medium" | "low";

export interface MetricEvidenceContributor {
  label: string;
  value: string;
  effect: "positive" | "neutral" | "risk";
}

export interface MetricEvidence {
  metricId: MetricEvidenceId;
  title: string;
  summary: string;
  dataSources: string[];
  formulaSummary: string;
  assumptions: string[];
  confidence: MetricEvidenceConfidence;
  confidenceLabel: "높음" | "보통" | "낮음";
  limitations: string[];
  contributors: MetricEvidenceContributor[];
}
```

- [ ] Step 4: Implement evidence service

Create `src/services/metricEvidence.ts` with:

```ts
import type {
  FestivalPlan,
  ForecastResult,
  MetricEvidence,
  MetricEvidenceId,
  SimulationResult,
  TourismContext,
  TrendContext,
} from "../domain/types";
import {
  createEconomicImpactMetrics,
  createSafetyLogisticsMetrics,
  createSummaryKpiMetrics,
} from "./impactMetrics";

function confidenceLabel(confidence: MetricEvidence["confidence"]) {
  if (confidence === "high") return "높음";
  if (confidence === "medium") return "보통";
  return "낮음";
}

function sourceConfidence(tourism: TourismContext, trends: TrendContext): MetricEvidence["confidence"] {
  if (
    tourism.provenance.sourceStatus === "live" &&
    trends.provenance.sourceStatus === "live"
  ) {
    return "high";
  }

  if (
    tourism.provenance.sourceStatus === "partial-fallback" ||
    tourism.provenance.sourceStatus === "live"
  ) {
    return "medium";
  }

  return "low";
}

function fallbackLimitations(tourism: TourismContext, trends: TrendContext) {
  const limitations = [
    "본 수치는 실제 방문객 집계가 아닌 사전 의사결정용 예측값입니다.",
    "현장 동선, 기상, 교통 통제, 민간 소비 데이터가 추가되면 결과가 달라질 수 있습니다.",
  ];

  if (tourism.provenance.sourceStatus !== "live") {
    limitations.push("TourAPI 조회가 불완전한 경우 샘플 또는 보완 데이터를 함께 사용합니다.");
  }

  if (trends.provenance.sourceType === "trend-sample") {
    limitations.push("소셜 트렌드는 현재 샘플 신호를 사용하므로 실시간 여론 지표로 해석하면 안 됩니다.");
  }

  return limitations;
}

export function createMetricEvidenceSet(
  plan: FestivalPlan,
  forecast: ForecastResult,
  simulation: SimulationResult,
  tourism: TourismContext,
  trends: TrendContext,
): Record<MetricEvidenceId, MetricEvidence> {
  const summary = createSummaryKpiMetrics(plan, forecast, simulation, tourism);
  const safety = createSafetyLogisticsMetrics(plan, forecast, simulation);
  const economy = createEconomicImpactMetrics(plan, forecast);
  const confidence = sourceConfidence(tourism, trends);
  const limitations = fallbackLimitations(tourism, trends);
  const peakVisitors = Math.max(...forecast.visitorsByHour.map((item) => item.visitors), 0);

  return {
    "demand-index": {
      metricId: "demand-index",
      title: "흥행 예측 지수",
      summary: `예상 방문객 ${forecast.expectedVisitors.toLocaleString("ko-KR")}명을 수용 인원 ${plan.expectedCapacity.toLocaleString("ko-KR")}명과 비교한 지표입니다.`,
      dataSources: ["TourAPI 주변 관광지 매력도", "TourAPI 유사 축제 후보", "소셜 트렌드 관심도", "사용자 입력 수용 인원"],
      formulaSummary: "예상 방문객 = 유사 축제 수요, 수용 인원, 주변 관광 매력도, 트렌드 관심도, 프로그램 매력도, 예산 규모를 가중 반영한 값입니다.",
      assumptions: ["유사 축제 방문 수요는 주제 유사도에 따라 보정합니다.", "18~20시 프로그램은 피크 시간대 가중치를 적용합니다."],
      confidence,
      confidenceLabel: confidenceLabel(confidence),
      limitations,
      contributors: forecast.reasons.map((reason) => ({
        label: reason.label,
        value: `${reason.impact.toLocaleString("ko-KR")}점`,
        effect: reason.impact >= 70 ? "positive" : reason.impact >= 40 ? "neutral" : "risk",
      })),
    },
    "peak-density": {
      metricId: "peak-density",
      title: "최고 밀집 위험도",
      summary: `시뮬레이션 격자의 최고 혼잡도를 ${summary.peakDensity.peoplePerSquareMeter}명/m²로 환산했습니다.`,
      dataSources: ["시간대별 예상 방문객", "행사장 격자", "무대, 출입구, 부스, 주차장 시설 배치"],
      formulaSummary: "격자 밀집도 = 시간대 방문객 비율과 시설 매력도를 결합하고, 최고 격자값을 명/m² 단위로 환산합니다.",
      assumptions: ["시설 가까이에 인파가 더 집중된다고 가정합니다.", "무대 프로그램 시간에는 무대 주변 가중치를 높입니다."],
      confidence,
      confidenceLabel: confidenceLabel(confidence),
      limitations,
      contributors: [
        { label: "피크 시간", value: `${simulation.hour}:00`, effect: "neutral" },
        { label: "피크 방문객", value: `${peakVisitors.toLocaleString("ko-KR")}명`, effect: "risk" },
        { label: "병목 후보", value: `${simulation.bottlenecks.length}곳`, effect: simulation.bottlenecks.length > 0 ? "risk" : "positive" },
      ],
    },
    "budget-efficiency": {
      metricId: "budget-efficiency",
      title: "예산 효율성 점수",
      summary: `총 예산을 예상 방문객으로 나누어 1인당 ${summary.budgetEfficiency.costPerVisitorKrw.toLocaleString("ko-KR")}원 수준으로 산출했습니다.`,
      dataSources: ["사용자 입력 총 예산", "예상 방문객"],
      formulaSummary: "방문객 1인당 예산 = 총 투입 예산 / 예상 방문객",
      assumptions: ["총 예산은 백만원 단위 입력값을 원 단위로 환산합니다."],
      confidence,
      confidenceLabel: confidenceLabel(confidence),
      limitations,
      contributors: [
        { label: "총 예산", value: `${plan.totalBudgetMillionKrw.toLocaleString("ko-KR")}백만원`, effect: "neutral" },
        { label: "예상 방문객", value: `${forecast.expectedVisitors.toLocaleString("ko-KR")}명`, effect: "positive" },
      ],
    },
    "commercial-spillover": {
      metricId: "commercial-spillover",
      title: "지역 상권 유출 연계도",
      summary: `주변 관광지 매력도와 개수를 바탕으로 ${summary.spillover.nearbyInflowRate}%의 연계 가능성을 추정했습니다.`,
      dataSources: ["TourAPI 주변 관광지", "관광지 매력도 점수"],
      formulaSummary: "연계도 = 주변 관광지 평균 매력도와 관광지 수 보너스를 결합한 사전 추정값입니다.",
      assumptions: ["행사장 주변 관광지가 많고 매력도가 높을수록 상권 연계 가능성이 높아진다고 봅니다."],
      confidence,
      confidenceLabel: confidenceLabel(confidence),
      limitations,
      contributors: [
        { label: "주변 관광지", value: `${tourism.nearbySpots.length}곳`, effect: tourism.nearbySpots.length >= 3 ? "positive" : "neutral" },
        { label: "데이터 상태", value: tourism.provenance.sourceStatus === "live" ? "실조회" : "보완", effect: tourism.provenance.sourceStatus === "live" ? "positive" : "risk" },
      ],
    },
    "safety-staff": {
      metricId: "safety-staff",
      title: "안전관리 요원 추천 배치",
      summary: `피크 방문객과 병목 후보를 기준으로 ${safety.safetyStaff}명을 추천합니다.`,
      dataSources: ["피크 시간대 예상 방문객", "혼잡도 시뮬레이션", "병목 후보 수"],
      formulaSummary: "추천 인원 = 피크 방문객 규모, 최고 밀집도, 병목 후보 수를 함께 반영한 배치 검토값입니다.",
      assumptions: ["병목 후보가 늘어나면 현장 통제 인력 필요량을 높입니다."],
      confidence,
      confidenceLabel: confidenceLabel(confidence),
      limitations,
      contributors: [
        { label: "피크 방문객", value: `${safety.peakVisitors.toLocaleString("ko-KR")}명`, effect: "risk" },
        { label: "병목 후보", value: `${simulation.bottlenecks.length}곳`, effect: simulation.bottlenecks.length > 0 ? "risk" : "positive" },
      ],
    },
    "medical-staff": {
      metricId: "medical-staff",
      title: "의료/구급 인력 추천 배치",
      summary: `피크 방문객과 고위험 격자를 기준으로 ${safety.medicalStaff}명을 추천합니다.`,
      dataSources: ["피크 시간대 예상 방문객", "고위험 및 임계 혼잡 격자"],
      formulaSummary: "추천 인원 = 피크 방문객 규모와 임계 혼잡 격자 수를 반영한 구급 대응 검토값입니다.",
      assumptions: ["임계 혼잡 격자가 많을수록 응급 대응 여력을 높입니다."],
      confidence,
      confidenceLabel: confidenceLabel(confidence),
      limitations,
      contributors: [
        { label: "최고 밀집도", value: `${safety.peakDensity}명/m²`, effect: safety.peakDensity >= 3 ? "risk" : "neutral" },
        { label: "추천 인원", value: `${safety.medicalStaff}명`, effect: "neutral" },
      ],
    },
    "parking-occupancy": {
      metricId: "parking-occupancy",
      title: "주차 수용 차오름 비율",
      summary: `피크 방문객의 차량 유입을 가정해 주차 수용률 ${safety.parkingOccupancyRate}%를 산출했습니다.`,
      dataSources: ["피크 시간대 예상 방문객", "행사장 수용 인원", "고위험 격자 수"],
      formulaSummary: "주차 차오름 = 피크 방문객의 차량 유입 추정치 / 행사장 가정 주차 수용량",
      assumptions: ["피크 방문객의 18%가 차량으로 유입된다고 가정합니다."],
      confidence,
      confidenceLabel: confidenceLabel(confidence),
      limitations,
      contributors: [
        { label: "주차 차오름", value: `${safety.parkingOccupancyRate}%`, effect: safety.parkingOccupancyRate >= 85 ? "risk" : "neutral" },
        { label: "피크 방문객", value: `${safety.peakVisitors.toLocaleString("ko-KR")}명`, effect: "risk" },
      ],
    },
    "economic-roi": {
      metricId: "economic-roi",
      title: "예산 대비 경제적 파급효과",
      summary: `예상 방문객 소비액을 총 예산과 비교해 ${economy.roiMultiplier.toFixed(1)}배 창출 가능성으로 표시합니다.`,
      dataSources: ["예상 방문객", "사용자 입력 총 예산", "방문객 1인당 평균 소비 단가 가정"],
      formulaSummary: "예상 지역 소비 창출액 = 예상 방문객 × 1인당 평균 소비 단가, ROI = 예상 소비 창출액 / 총 예산",
      assumptions: [`방문객 1인당 평균 소비 단가는 ${economy.averageSpendPerVisitorKrw.toLocaleString("ko-KR")}원으로 둡니다.`],
      confidence,
      confidenceLabel: confidenceLabel(confidence),
      limitations,
      contributors: [
        { label: "예상 소비 창출액", value: `${economy.expectedLocalSpendingKrw.toLocaleString("ko-KR")}원`, effect: "positive" },
        { label: "총 예산", value: `${economy.totalBudgetKrw.toLocaleString("ko-KR")}원`, effect: "neutral" },
      ],
    },
  };
}

export function createReportEvidenceSummaries(
  evidenceSet: Record<MetricEvidenceId, MetricEvidence>,
) {
  return [
    evidenceSet["demand-index"],
    evidenceSet["peak-density"],
    evidenceSet["safety-staff"],
    evidenceSet["economic-roi"],
  ].map((item) => ({
    title: item.title,
    summary: item.summary,
    confidenceLabel: item.confidenceLabel,
  }));
}
```

- [ ] Step 5: Run test to verify it passes

Run: `npm run test -- src/services/metricEvidence.test.ts`

Expected: PASS.

- [ ] Step 6: Commit

Run:

```bash
git add src/domain/types.ts src/services/metricEvidence.ts src/services/metricEvidence.test.ts
git commit -m "feat: add metric evidence service"
```

---

### Task 2: Evidence Drawer UI

Files:
- Create: `src/components/EvidenceButton.tsx`
- Create: `src/components/MetricEvidenceDrawer.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/styles.css`

Interfaces:
- Consumes: `MetricEvidence`
- Produces:
  - `EvidenceButton({ label?, onClick })`
  - `MetricEvidenceDrawer({ evidence, isOpen, onClose })`

- [ ] Step 1: Add failing dashboard interaction test

Modify `src/App.test.tsx` by adding this test inside the existing `describe("App", () => { ... })` block:

```ts
it("opens a metric evidence drawer from the dashboard", async () => {
  render(<App />);

  fireEvent.click(screen.getAllByRole("button", { name: "근거 보기" })[0]);

  expect(screen.getByRole("dialog", { name: "지표 산출 근거" })).toBeInTheDocument();
  expect(screen.getByText("사용 데이터")).toBeInTheDocument();
  expect(screen.getByText("산출 방식")).toBeInTheDocument();
  expect(screen.getByText("해석 시 주의사항")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "근거 닫기" }));

  expect(screen.queryByRole("dialog", { name: "지표 산출 근거" })).not.toBeInTheDocument();
});
```

- [ ] Step 2: Run test to verify it fails

Run: `npm run test -- src/App.test.tsx`

Expected: FAIL because evidence UI does not exist yet.

- [ ] Step 3: Create evidence button

Create `src/components/EvidenceButton.tsx` with:

```tsx
interface EvidenceButtonProps {
  label?: string;
  onClick: () => void;
}

export function EvidenceButton({ label = "근거 보기", onClick }: EvidenceButtonProps) {
  return (
    <button className="evidence-button" type="button" onClick={onClick}>
      {label}
    </button>
  );
}
```

- [ ] Step 4: Create evidence drawer

Create `src/components/MetricEvidenceDrawer.tsx` with:

```tsx
import type { MetricEvidence } from "../domain/types";

interface MetricEvidenceDrawerProps {
  evidence?: MetricEvidence;
  isOpen: boolean;
  onClose: () => void;
}

export function MetricEvidenceDrawer({
  evidence,
  isOpen,
  onClose,
}: MetricEvidenceDrawerProps) {
  if (!isOpen || !evidence) return null;

  return (
    <aside className="evidence-drawer" role="dialog" aria-modal="true" aria-label="지표 산출 근거">
      <div className="evidence-drawer-backdrop" onClick={onClose} />
      <section className="evidence-drawer-panel">
        <div className="evidence-drawer-heading">
          <div>
            <span className={`confidence-badge confidence-badge-${evidence.confidence}`}>
              신뢰도 {evidence.confidenceLabel}
            </span>
            <h2>{evidence.title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="근거 닫기">
            닫기
          </button>
        </div>

        <p className="evidence-summary">{evidence.summary}</p>

        <div className="evidence-section">
          <h3>사용 데이터</h3>
          <ul>
            {evidence.dataSources.map((source) => (
              <li key={source}>{source}</li>
            ))}
          </ul>
        </div>

        <div className="evidence-section">
          <h3>산출 방식</h3>
          <p>{evidence.formulaSummary}</p>
        </div>

        <div className="evidence-section">
          <h3>주요 영향 요인</h3>
          <ul className="contributor-list">
            {evidence.contributors.map((item) => (
              <li key={`${item.label}-${item.value}`} className={`contributor contributor-${item.effect}`}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </li>
            ))}
          </ul>
        </div>

        <div className="evidence-section">
          <h3>해석 시 주의사항</h3>
          <ul>
            {evidence.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </div>
      </section>
    </aside>
  );
}
```

- [ ] Step 5: Add drawer styles

Append to `src/styles.css`:

```css
.evidence-button {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #1e3a8a;
  border-radius: 6px;
  padding: 0.3rem 0.55rem;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
}

.evidence-drawer {
  position: fixed;
  inset: 0;
  z-index: 40;
}

.evidence-drawer-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.32);
}

.evidence-drawer-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(440px, 100%);
  overflow-y: auto;
  background: #ffffff;
  border-left: 1px solid #cbd5e1;
  padding: 1.25rem;
  box-shadow: -12px 0 28px rgba(15, 23, 42, 0.18);
}

.evidence-drawer-heading,
.evidence-source-status {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.evidence-drawer-heading h2 {
  margin: 0.45rem 0 0;
  font-size: 1.2rem;
}

.evidence-drawer-heading button {
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  border-radius: 6px;
  padding: 0.45rem 0.7rem;
  cursor: pointer;
}

.confidence-badge {
  display: inline-flex;
  border-radius: 999px;
  padding: 0.25rem 0.55rem;
  font-size: 0.75rem;
  font-weight: 800;
}

.confidence-badge-high {
  background: #dcfce7;
  color: #166534;
}

.confidence-badge-medium {
  background: #fef3c7;
  color: #92400e;
}

.confidence-badge-low {
  background: #fee2e2;
  color: #991b1b;
}

.evidence-summary,
.evidence-section p,
.evidence-section li {
  color: #334155;
  line-height: 1.6;
}

.evidence-section {
  margin-top: 1.1rem;
  border-top: 1px solid #e2e8f0;
  padding-top: 1rem;
}

.evidence-section h3 {
  margin: 0 0 0.55rem;
  font-size: 0.95rem;
  color: #0f172a;
}

.contributor-list {
  display: grid;
  gap: 0.45rem;
  padding: 0;
  list-style: none;
}

.contributor {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  border-radius: 6px;
  padding: 0.55rem 0.65rem;
  background: #f8fafc;
}

.contributor-positive strong {
  color: #047857;
}

.contributor-neutral strong {
  color: #1e3a8a;
}

.contributor-risk strong {
  color: #b91c1c;
}
```

- [ ] Step 6: Run test to verify it still fails for wiring only

Run: `npm run test -- src/App.test.tsx`

Expected: FAIL because `SummaryKpiCards` and `App` are not wired yet.

- [ ] Step 7: Commit reusable UI

Run:

```bash
git add src/components/EvidenceButton.tsx src/components/MetricEvidenceDrawer.tsx src/styles.css src/App.test.tsx
git commit -m "feat: add metric evidence drawer UI"
```

---

### Task 3: Dashboard Wiring and Data Basis Reframe

Files:
- Modify: `src/App.tsx`
- Modify: `src/components/SummaryKpiCards.tsx`
- Modify: `src/components/SafetyLogisticsPanel.tsx`
- Modify: `src/components/RoiEconomicImpact.tsx`
- Modify: `src/components/DataBasisPanel.tsx`
- Modify: `src/App.test.tsx`

Interfaces:
- Consumes: `Record<MetricEvidenceId, MetricEvidence>`, `MetricEvidenceId`, `onOpenEvidence(metricId)`
- Produces: Dashboard controls that open the drawer for each major metric.

- [ ] Step 1: Update component props

Modify component prop types as follows:

```ts
import type { MetricEvidenceId } from "../domain/types";

interface EvidenceProps {
  onOpenEvidence: (metricId: MetricEvidenceId) => void;
}
```

Apply this pattern to:

- `SummaryKpiCards`: open `demand-index`, `peak-density`, `budget-efficiency`, `commercial-spillover`
- `SafetyLogisticsPanel`: open `safety-staff`, `medical-staff`, `parking-occupancy`
- `RoiEconomicImpact`: open `economic-roi`

- [ ] Step 2: Add evidence buttons to KPI cards

In each metric header in `src/components/SummaryKpiCards.tsx`, render:

```tsx
<EvidenceButton onClick={() => onOpenEvidence("demand-index")} />
```

Use the matching IDs for the other KPI cards:

```tsx
<EvidenceButton onClick={() => onOpenEvidence("peak-density")} />
<EvidenceButton onClick={() => onOpenEvidence("budget-efficiency")} />
<EvidenceButton onClick={() => onOpenEvidence("commercial-spillover")} />
```

- [ ] Step 3: Add evidence buttons to safety and ROI panels

In `src/components/SafetyLogisticsPanel.tsx`, add:

```tsx
<EvidenceButton onClick={() => onOpenEvidence("safety-staff")} />
<EvidenceButton onClick={() => onOpenEvidence("medical-staff")} />
<EvidenceButton onClick={() => onOpenEvidence("parking-occupancy")} />
```

In `src/components/RoiEconomicImpact.tsx`, add:

```tsx
<EvidenceButton onClick={() => onOpenEvidence("economic-roi")} />
```

- [ ] Step 4: Wire evidence state in App

Modify `src/App.tsx` by importing:

```ts
import type { MetricEvidenceId } from "./domain/types";
import { MetricEvidenceDrawer } from "./components/MetricEvidenceDrawer";
import { createMetricEvidenceSet } from "./services/metricEvidence";
```

Add state and memoized evidence:

```tsx
const [selectedEvidenceId, setSelectedEvidenceId] = useState<MetricEvidenceId | null>(null);
const metricEvidence = useMemo(
  () => createMetricEvidenceSet(plan, forecast, simulation, tourism, sampleTrendContext),
  [forecast, plan, simulation, tourism],
);
```

Pass `onOpenEvidence={setSelectedEvidenceId}` to `SummaryKpiCards`, `SafetyLogisticsPanel`, and through `ReportView` to `RoiEconomicImpact`.

Render the drawer:

```tsx
<MetricEvidenceDrawer
  evidence={selectedEvidenceId ? metricEvidence[selectedEvidenceId] : undefined}
  isOpen={selectedEvidenceId !== null}
  onClose={() => setSelectedEvidenceId(null)}
/>
```

- [ ] Step 5: Reframe data basis panel

Modify `src/components/DataBasisPanel.tsx` to show:

```tsx
<section className="panel data-basis-panel">
  <div className="panel-heading">
    <h2>데이터 신뢰도</h2>
    <span>{statusLabel(tourism.provenance.sourceStatus)}</span>
  </div>
  <div className="evidence-source-status">
    <strong>{tourism.provenance.sourceName}</strong>
    <span>{tourism.provenance.retrievedAt ? new Date(tourism.provenance.retrievedAt).toLocaleString("ko-KR") : "샘플 기준"}</span>
  </div>
  <ul className="evidence-list">
    <li>{tourism.provenance.basisText}</li>
    <li>{tourism.provenance.fallbackText}</li>
    <li>{trends.provenance.sourceName}: {trends.provenance.basisText}</li>
    <li>개인정보 수집 여부: 수집하지 않음</li>
    <li>예측값 성격: 실제 집계값이 아닌 사전 의사결정용 추정값</li>
  </ul>
</section>
```

Keep the existing `statusLabel` behavior, but make labels readable Korean:

```ts
function statusLabel(status: DataSourceStatus | undefined) {
  if (status === "live") return "실제 TourAPI 조회 성공";
  if (status === "partial-fallback") return "실제 TourAPI 일부 조회 및 샘플 보완";
  return "샘플 데이터 대체 사용";
}
```

- [ ] Step 6: Run dashboard test

Run: `npm run test -- src/App.test.tsx`

Expected: PASS.

- [ ] Step 7: Commit dashboard wiring

Run:

```bash
git add src/App.tsx src/components/SummaryKpiCards.tsx src/components/SafetyLogisticsPanel.tsx src/components/RoiEconomicImpact.tsx src/components/DataBasisPanel.tsx src/App.test.tsx
git commit -m "feat: wire metric evidence into dashboard"
```

---

### Task 4: Report Evidence Summary and Methodology Document

Files:
- Create: `src/components/ReportEvidenceSummary.tsx`
- Modify: `src/components/ReportView.tsx`
- Modify: `src/components/ReportView.test.tsx`
- Modify: `src/App.tsx`
- Modify: `docs/data-methodology.md`
- Modify: `src/styles.css`

Interfaces:
- Consumes: `MetricEvidence`
- Produces: Compact report evidence summary and submission methodology doc.

- [ ] Step 1: Add failing report test

Modify `src/components/ReportView.test.tsx` to include:

```ts
expect(screen.getByText("산출 근거 요약")).toBeInTheDocument();
expect(screen.getByText("흥행 예측 지수")).toBeInTheDocument();
expect(screen.getByText("최고 밀집 위험도")).toBeInTheDocument();
expect(screen.getByText("예산 대비 경제적 파급효과")).toBeInTheDocument();
```

- [ ] Step 2: Run report test to verify it fails

Run: `npm run test -- src/components/ReportView.test.tsx`

Expected: FAIL because `ReportEvidenceSummary` does not exist yet.

- [ ] Step 3: Create report summary component

Create `src/components/ReportEvidenceSummary.tsx` with:

```tsx
import type { MetricEvidence, MetricEvidenceId } from "../domain/types";
import { createReportEvidenceSummaries } from "../services/metricEvidence";

interface ReportEvidenceSummaryProps {
  evidenceSet: Record<MetricEvidenceId, MetricEvidence>;
}

export function ReportEvidenceSummary({ evidenceSet }: ReportEvidenceSummaryProps) {
  const summaries = createReportEvidenceSummaries(evidenceSet);

  return (
    <section className="report-evidence-summary" aria-label="산출 근거 요약">
      <h3>산출 근거 요약</h3>
      <div className="report-evidence-grid">
        {summaries.map((item) => (
          <article key={item.title}>
            <span>신뢰도 {item.confidenceLabel}</span>
            <strong>{item.title}</strong>
            <p>{item.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
```

- [ ] Step 4: Wire report evidence

Modify `ReportView` props:

```ts
import type { MetricEvidence, MetricEvidenceId } from "../domain/types";

interface ReportViewProps {
  report: PlanningReport;
  plan: FestivalPlan;
  forecast: ForecastResult;
  evidenceSet: Record<MetricEvidenceId, MetricEvidence>;
  onOpenEvidence: (metricId: MetricEvidenceId) => void;
}
```

Render:

```tsx
<RoiEconomicImpact plan={plan} forecast={forecast} onOpenEvidence={onOpenEvidence} />
<ReportEvidenceSummary evidenceSet={evidenceSet} />
```

Update `App.tsx`:

```tsx
<ReportView
  report={report}
  plan={plan}
  forecast={forecast}
  evidenceSet={metricEvidence}
  onOpenEvidence={setSelectedEvidenceId}
/>
```

- [ ] Step 5: Add report summary styles

Append to `src/styles.css`:

```css
.report-evidence-summary {
  margin-top: 1rem;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  padding: 1rem;
  background: #f8fbff;
}

.report-evidence-summary h3 {
  margin: 0 0 0.8rem;
  font-size: 1rem;
  color: #0f172a;
}

.report-evidence-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
}

.report-evidence-grid article {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.75rem;
  background: #ffffff;
}

.report-evidence-grid span {
  display: block;
  margin-bottom: 0.35rem;
  color: #1d4ed8;
  font-size: 0.75rem;
  font-weight: 800;
}

.report-evidence-grid strong {
  display: block;
  color: #0f172a;
}

.report-evidence-grid p {
  margin: 0.35rem 0 0;
  color: #475569;
  line-height: 1.55;
}
```

- [ ] Step 6: Create methodology document

Create `docs/data-methodology.md` with:

```md
# Fest-Twin 데이터 산출 방법론

## 목적

이 문서는 Fest-Twin 대시보드에 표시되는 예측 수치의 데이터 출처, 산출 방식, 가정, 한계를 설명한다. 제출 데모와 정부 사업 검토 과정에서 “왜 이 수치가 나왔는지”를 설명하기 위한 기준 문서다.

## 데이터 출처

- 한국관광공사 TourAPI: 축제 후보, 주변 관광지, 유사 관광 자원 탐색
- 사용자 입력값: 지역, 기간, 행사장, 예산, 수용 인원, 프로그램, 시설 배치
- 소셜 트렌드 신호: 현재 데모에서는 샘플 또는 보완 데이터를 사용할 수 있음

## 주요 지표 산출 방식

### 흥행 예측 지수

예상 방문객을 행사장 수용 인원과 비교한 지표다. 유사 축제 수요, 주변 관광지 매력도, 소셜 관심도, 프로그램 매력도, 예산 규모를 함께 반영한다.

### 최고 밀집 위험도

시간대별 예상 방문객과 행사장 시설 배치를 격자 시뮬레이션에 반영한 뒤, 최고 혼잡 격자를 명/m² 단위로 환산한다.

### 안전 및 물류 수용성

피크 방문객, 최고 밀집도, 병목 후보 수, 고위험 격자를 기준으로 안전관리 요원, 의료/구급 인력, 주차 수용 차오름 비율을 산출한다.

### 경제적 파급효과

예상 지역 소비 창출액은 예상 방문객과 1인당 평균 소비 단가를 곱해 산출한다. ROI는 예상 소비 창출액을 총 투입 예산으로 나눈 값이다.

## 신뢰도 기준

- 높음: TourAPI와 트렌드 데이터가 모두 실조회 상태인 경우
- 보통: TourAPI 실조회 또는 일부 보완 데이터가 포함된 경우
- 낮음: 샘플 대체 데이터가 주요 근거로 사용된 경우

## 한계

- 본 서비스의 수치는 실제 방문객 집계값이 아니라 사전 기획 검토용 예측값이다.
- 통신사 유동인구, 카드 소비, 교통 통제, 기상, 현장 안전 계획이 추가되면 결과가 달라질 수 있다.
- 개인정보를 수집하지 않으며, 개인 단위 이동 경로를 추적하지 않는다.
```

- [ ] Step 7: Run report test

Run: `npm run test -- src/components/ReportView.test.tsx`

Expected: PASS.

- [ ] Step 8: Commit report and docs

Run:

```bash
git add src/components/ReportEvidenceSummary.tsx src/components/ReportView.tsx src/components/ReportView.test.tsx src/App.tsx src/styles.css docs/data-methodology.md
git commit -m "feat: add report evidence summary"
```

---

### Task 5: Full Verification, Push, and Docker Deploy

Files:
- Verify all touched files.
- No new source files unless a test reveals a focused fix.

Interfaces:
- Consumes: All outputs from Tasks 1-4.
- Produces: Passing test/build state, pushed GitHub branch, updated Docker demo.

- [ ] Step 1: Run full tests

Run: `npm run test`

Expected: all Vitest tests pass.

- [ ] Step 2: Run production build

Run: `VITE_VWORLD_API_KEY=your_vworld_api_key npm run build`

Expected: TypeScript and Vite build pass.

- [ ] Step 3: Inspect git status

Run: `git status --short`

Expected: only pre-existing unrelated changes remain:

```text
 M README.md
 M docs/contest-notice-response-matrix.md
 M docs/submission-summary.md
?? artifacts/fest-twin-project-understanding-docs/
```

- [ ] Step 4: Push main to GitHub

Run: `git push origin main`

Expected: `main -> main`.

- [ ] Step 5: Deploy Docker demo

Create an archive from `HEAD`, upload it to `cwuser@100.104.94.112`, build with `VWORLD_API_KEY=your_vworld_api_key`, and replace the `fest-twin-demo` container. When `/home/cwuser/fest-twin-demo.env` exists, the replacement container must be started with `--env-file /home/cwuser/fest-twin-demo.env`; otherwise the server-side TourAPI proxy returns `TOUR_API_KEY_MISSING` and the region selector cannot load real area codes.

Use the same deployment pattern already proven in this project:

```powershell
git archive -o tmp\fest-twin-demo.tar HEAD
```

Then upload the archive and run the remote redeploy script with PuTTY tools. The remote script must preserve server-only runtime secrets by passing the env file into `docker run`.

```powershell
& 'C:\Program Files (x86)\PuTTY\pscp.exe' -pw 'ckddnjsl' -batch tmp\fest-twin-demo.tar cwuser@100.104.94.112:/home/cwuser/fest-twin-demo.tar
& 'C:\Program Files (x86)\PuTTY\plink.exe' -pw 'ckddnjsl' -batch cwuser@100.104.94.112 'bash /home/cwuser/redeploy-fest-twin-map-final.sh'
```

Expected: container `fest-twin-demo` restarts, `curl http://127.0.0.1:18080/` returns 200, and `curl http://127.0.0.1:18080/api/tour/area-code?numOfRows=3\&pageNo=1` returns a TourAPI `resultCode` of `0000` instead of `TOUR_API_KEY_MISSING`.

- [ ] Step 6: Verify public demo bundle

Run a browser or HTTP check against:

```text
https://cwserver.tail97dbc3.ts.net/
```

Expected visible labels in the deployed bundle:

```text
근거 보기
지표 산출 근거
데이터 신뢰도
산출 근거 요약
```

- [ ] Step 7: Final status

Report:

- Tests passed or exact failure.
- Build passed or exact failure.
- GitHub push commit range.
- Docker deployment URL.
- Any remaining unrelated local changes.

---

## Self-Review

- Spec coverage: Tasks cover evidence service, dashboard drawer, data basis reframe, report summary, methodology document, tests, push, and Docker deploy.
- Placeholder scan: No task contains unresolved markers, “fill in details”, or unspecified implementation.
- Type consistency: `MetricEvidenceId`, `MetricEvidence`, `createMetricEvidenceSet`, and `createReportEvidenceSummaries` are consistently named across service, UI, report, and tests.
- Scope check: The plan does not replace forecasting formulas, integrate new external datasets, or add PDF generation.
