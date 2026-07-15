import type { PlanningReport } from "../domain/types";

interface RiskPanelProps {
  report: PlanningReport;
}

export function RiskPanel({ report }: RiskPanelProps) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>주요 리스크</h2>
        <span>기획 보완 우선순위</span>
      </div>
      <ol className="risk-list">
        {report.findings.map((finding) => (
          <li key={finding}>{finding}</li>
        ))}
      </ol>
    </section>
  );
}
