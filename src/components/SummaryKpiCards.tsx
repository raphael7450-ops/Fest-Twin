import type {
  FestivalPlan,
  ForecastResult,
  SimulationResult,
  TourismContext,
} from "../domain/types";
import { createSummaryKpiMetrics } from "../services/impactMetrics";

interface SummaryKpiCardsProps {
  plan: FestivalPlan;
  forecast: ForecastResult;
  simulation: SimulationResult;
  tourism: TourismContext;
}

function formatKrw(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

export function SummaryKpiCards({
  plan,
  forecast,
  simulation,
  tourism,
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
          <em className={`kpi-badge kpi-badge-${demandTone}`}>
            {metrics.demandIndex.grade}
          </em>
        </div>
        <strong>{metrics.demandIndex.percent}%</strong>
        <small className="metric-trend">{metrics.demandIndex.description}</small>
      </article>

      <article className="metric-card metric-card--danger">
        <div className="kpi-title-row">
          <span>최고 밀집 위험도</span>
          <em className={`risk-badge risk-badge-${metrics.peakDensity.status}`}>
            {metrics.peakDensity.label}
          </em>
        </div>
        <strong>{metrics.peakDensity.peoplePerSquareMeter}명/m²</strong>
        <small className="metric-trend">
          시뮬레이션 셀 최고 밀집도를 현장 진단 단위로 환산
        </small>
      </article>

      <article className="metric-card metric-card--warning">
        <span>예산 효율성 점수</span>
        <strong>{formatKrw(metrics.budgetEfficiency.costPerVisitorKrw)}</strong>
        <small className="metric-trend">{metrics.budgetEfficiency.description}</small>
      </article>

      <article className="metric-card metric-card--success">
        <span>지역 상권 유출 연계도</span>
        <strong>{metrics.spillover.nearbyInflowRate}%</strong>
        <small className="metric-trend">{metrics.spillover.description}</small>
      </article>
    </section>
  );
}
