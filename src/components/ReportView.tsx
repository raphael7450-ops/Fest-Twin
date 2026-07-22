import type {
  FestivalPlan,
  ForecastResult,
  MetricEvidenceId,
  PlanningReport,
} from "../domain/types";
import { PrintReportButton } from "./PrintReportButton";
import { RoiEconomicImpact } from "./RoiEconomicImpact";

interface ReportViewProps {
  report: PlanningReport;
  plan: FestivalPlan;
  forecast: ForecastResult;
  onOpenEvidence: (metricId: MetricEvidenceId) => void;
}

export function ReportView({
  report,
  plan,
  forecast,
  onOpenEvidence,
}: ReportViewProps) {
  return (
    <section className="panel report-panel">
      <div className="panel-heading">
        <h2>기획 보완 리포트</h2>
        <div className="panel-actions">
          <span>공공 검토용 요약</span>
          <PrintReportButton />
        </div>
      </div>
      <RoiEconomicImpact
        plan={plan}
        forecast={forecast}
        onOpenEvidence={onOpenEvidence}
      />
      <p className="report-summary">{report.summary}</p>
      <p className="muted">{report.governmentReviewNote}</p>
      <div className="score-table">
        {report.scores.map((score) => (
          <article key={score.label}>
            <span>{score.label}</span>
            <strong>{score.score}점</strong>
            <small>{score.reason}</small>
          </article>
        ))}
      </div>
      <div className="recommendation-grid">
        {report.recommendations.map((item) => (
          <article className="recommendation" key={item.id}>
            <h3>{item.title}</h3>
            <p>{item.detail}</p>
            <small>{item.expectedEffect}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
