/**
 * 파일 : src/components/SummaryKpiCards.tsx
 * 내용 : 흥행 예측 지수, 최고 밀집 위험도, 예산 효율성 점수, 상권 유출 연계도 4대 핵심 KPI 카드 컴포넌트
 * 수정 : 2026-07-24. KPI 뱃지 상태 연동 및 지표별 표준 근거 보기 버튼 통합
 */

import type {
  FestivalPlan,
  ForecastResult,
  MetricEvidenceId,
  SimulationResult,
  TourismContext,
} from "../domain/types";
import { createSummaryKpiMetrics } from "../services/impactMetrics";
import { EvidenceButton } from "./EvidenceButton";

interface SummaryKpiCardsProps {
  plan: FestivalPlan;
  forecast: ForecastResult;
  simulation: SimulationResult;
  tourism: TourismContext;
  onOpenEvidence: (metricId: MetricEvidenceId) => void;
}

function formatKrw(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

export function SummaryKpiCards({
  plan,
  forecast,
  simulation,
  tourism,
  onOpenEvidence,
}: SummaryKpiCardsProps) {
  const metrics = createSummaryKpiMetrics(plan, forecast, simulation, tourism);
  const demandTone =
    metrics.demandIndex.grade === "상"
      ? "high"
      : metrics.demandIndex.grade === "중"
        ? "medium"
        : "low";

  return (
    <section className="summary-grid summary-kpi-grid" aria-label="핵심 진단 지표">
      <article className="metric-card metric-card--primary">
        <div className="kpi-title-row">
          <span>흥행 예측 지수</span>
          <div className="kpi-actions">
            <EvidenceButton onClick={() => onOpenEvidence("demand-index")} />
            <em className={`kpi-badge kpi-badge-${demandTone}`}>
              {metrics.demandIndex.grade}
            </em>
          </div>
        </div>
        <strong>{metrics.demandIndex.percent}%</strong>
        <small className="metric-trend">{metrics.demandIndex.description}</small>
      </article>

      <article className="metric-card metric-card--danger">
        <div className="kpi-title-row">
          <span>최고 밀집 위험도</span>
          <div className="kpi-actions">
            <EvidenceButton onClick={() => onOpenEvidence("peak-density")} />
            <em className={`risk-badge risk-badge-${metrics.peakDensity.status}`}>
              {metrics.peakDensity.label}
            </em>
          </div>
        </div>
        <strong>{metrics.peakDensity.peoplePerSquareMeter}명/m²</strong>
        <small className="metric-trend">
          시뮬레이션 셀 최고 밀집도를 현장 진단 단위로 환산
        </small>
      </article>

      <article className="metric-card metric-card--warning">
        <div className="kpi-title-row">
          <span>예산 효율성 점수</span>
          <EvidenceButton onClick={() => onOpenEvidence("budget-efficiency")} />
        </div>
        <strong>{formatKrw(metrics.budgetEfficiency.costPerVisitorKrw)}</strong>
        <small className="metric-trend">{metrics.budgetEfficiency.description}</small>
      </article>

      <article className="metric-card metric-card--success">
        <div className="kpi-title-row">
          <span>지역 상권 유출 연계도</span>
          <EvidenceButton onClick={() => onOpenEvidence("commercial-spillover")} />
        </div>
        <strong>{metrics.spillover.nearbyInflowRate}%</strong>
        <small className="metric-trend">{metrics.spillover.description}</small>
      </article>
    </section>
  );
}
