import type { MetricEvidence, MetricEvidenceId } from "../domain/types";
import { createReportEvidenceSummaries } from "../services/metricEvidence";

interface ReportEvidenceSummaryProps {
  evidenceSet: Record<MetricEvidenceId, MetricEvidence>;
}

export function ReportEvidenceSummary({
  evidenceSet,
}: ReportEvidenceSummaryProps) {
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
