import type {
  ForecastResult,
  PlanningReport,
  SimulationResult,
} from "../domain/types";
import { createSuccessPotentialMetric } from "../services/impactMetrics";

interface SummaryCardsProps {
  forecast: ForecastResult;
  simulation: SimulationResult;
  report: PlanningReport;
}

export function SummaryCards({ forecast, simulation, report }: SummaryCardsProps) {
  const successPotential = createSuccessPotentialMetric(forecast);
  const budgetRisk = report.scores.find(
    (score) => score.label === "예산 낭비 위험",
  );

  return (
    <section className="summary-grid" aria-label="핵심 진단 지표">
      <article className="metric-card metric-card--primary">
        <span>예상 방문객 (행사장 유입)</span>
        <strong>{forecast.expectedVisitors.toLocaleString("ko-KR")}명</strong>
        {forecast.regionalPotentialDemand ? (
          <small className="metric-trend" style={{ fontSize: "0.78rem", opacity: 0.9 }}>
            광역 잠재수요 {forecast.regionalPotentialDemand.toLocaleString("ko-KR")}명
          </small>
        ) : null}
        <small className="metric-trend">{forecast.peakHour}:00 피크 예상</small>
      </article>
      <article className="metric-card metric-card--success">
        <span>흥행 가능성</span>
        <strong>{successPotential.score}점</strong>
        <small className="metric-trend">데이터 신뢰도</small>
      </article>
      <article className="metric-card metric-card--danger">
        <span>혼잡 위험도</span>
        <strong>{simulation.congestionScore}점</strong>
        <small className="metric-trend">병목 {simulation.bottlenecks.length}곳</small>
      </article>
      <article className="metric-card metric-card--warning">
        <span>예산 검토</span>
        <strong>{budgetRisk?.score ?? 0}점</strong>
        <small className="metric-trend">{budgetRisk?.reason ?? "예산 진단 대기"}</small>
      </article>
    </section>
  );
}
