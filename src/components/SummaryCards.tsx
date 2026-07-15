import type {
  ForecastResult,
  PlanningReport,
  SimulationResult,
} from "../domain/types";

interface SummaryCardsProps {
  forecast: ForecastResult;
  simulation: SimulationResult;
  report: PlanningReport;
}

export function SummaryCards({ forecast, simulation, report }: SummaryCardsProps) {
  const budgetRisk = report.scores.find(
    (score) => score.label === "예산 낭비 위험",
  );

  return (
    <section className="summary-grid" aria-label="핵심 진단 지표">
      <article className="metric-card">
        <span>예상 방문객</span>
        <strong>{forecast.expectedVisitors.toLocaleString("ko-KR")}명</strong>
        <small>{forecast.peakHour}:00 피크 예상</small>
      </article>
      <article className="metric-card">
        <span>흥행 가능성</span>
        <strong>{forecast.successScore}점</strong>
        <small>TourAPI·트렌드 기반</small>
      </article>
      <article className="metric-card">
        <span>혼잡 위험도</span>
        <strong>{simulation.congestionScore}점</strong>
        <small>병목 {simulation.bottlenecks.length}곳</small>
      </article>
      <article className="metric-card">
        <span>예산 낭비 위험</span>
        <strong>{budgetRisk?.score ?? 0}점</strong>
        <small>{budgetRisk?.reason ?? "예산 진단 대기"}</small>
      </article>
    </section>
  );
}
