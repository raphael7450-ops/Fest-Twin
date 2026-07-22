import type {
  FestivalPlan,
  ForecastResult,
  MetricEvidence,
  MetricEvidenceId,
  PlanningReport,
} from "../domain/types";
import { PrintReportButton } from "./PrintReportButton";
import { ReportEvidenceSummary } from "./ReportEvidenceSummary";
import { RoiEconomicImpact } from "./RoiEconomicImpact";

interface ReportViewProps {
  report: PlanningReport;
  plan: FestivalPlan;
  forecast: ForecastResult;
  evidenceSet: Record<MetricEvidenceId, MetricEvidence>;
  onOpenEvidence: (metricId: MetricEvidenceId) => void;
}

export function ReportView({
  report,
  plan,
  forecast,
  evidenceSet,
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
      <ReportEvidenceSummary evidenceSet={evidenceSet} />
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
