import type { MetricEvidence, MetricEvidenceId } from "../domain/types";
import { createReportEvidenceSummaries } from "../services/metricEvidence";
import { EvidenceButton } from "./EvidenceButton";

interface ReportEvidenceSummaryProps {
  evidenceSet: Record<MetricEvidenceId, MetricEvidence>;
  onOpenEvidence?: (metricId: MetricEvidenceId) => void;
}

export function ReportEvidenceSummary({
  evidenceSet,
  onOpenEvidence,
}: ReportEvidenceSummaryProps) {
  const summaries = createReportEvidenceSummaries(evidenceSet);

  return (
    <section className="report-evidence-summary" aria-label="산출 근거 요약">
      <h3>산출 근거 요약</h3>
      <div className="report-evidence-grid">
        {summaries.map((item) => (
          <article key={item.metricId}>
            <div className="report-evidence-card-header">
              <span>신뢰도 {item.confidenceLabel}</span>
              {onOpenEvidence ? (
                <EvidenceButton
                  label="근거 보기"
                  ariaLabel={`${item.title} 근거 보기`}
                  onClick={() => onOpenEvidence(item.metricId)}
                />
              ) : null}
            </div>
            <strong>{item.title}</strong>
            <p>{item.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
