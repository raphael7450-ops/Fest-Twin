/**
 * 파일 : src/components/ReportView.tsx
 * 내용 : 지자체 예산 집행 전 사전 검토 보고서 뷰어 및 브라우저 인쇄(PDF Export) 서식 컴포넌트
 * 수정 : 2026-07-24. 기획 보완 추천안, 경제 파급효과 지표 및 출처 요약 리포트 레이아웃 구성
 */

import type {
  FestivalPlan,
  ForecastResult,
  MetricEvidence,
  MetricEvidenceId,
  PlanningReport,
  SpendingContext,
} from "../domain/types";
import { PrintReportButton } from "./PrintReportButton";
import { ReportEvidenceSummary } from "./ReportEvidenceSummary";
import { RoiEconomicImpact } from "./RoiEconomicImpact";

interface ReportViewProps {
  report: PlanningReport;
  plan: FestivalPlan;
  forecast: ForecastResult;
  spending?: SpendingContext;
  evidenceSet: Record<MetricEvidenceId, MetricEvidence>;
  onOpenEvidence: (metricId: MetricEvidenceId) => void;
}

export function ReportView({
  report,
  plan,
  forecast,
  spending,
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
        spending={spending}
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
