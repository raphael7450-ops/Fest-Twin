import type { TourismContext, TrendContext } from "../domain/types";

interface DataBasisPanelProps {
  tourism: TourismContext;
  trends: TrendContext;
}

export function DataBasisPanel({ tourism, trends }: DataBasisPanelProps) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>데이터 근거</h2>
        <span>공공데이터·비식별 트렌드</span>
      </div>
      <ul className="evidence-list">
        <li>
          {tourism.provenance.sourceName}: {tourism.provenance.basisText}
        </li>
        <li>{tourism.provenance.fallbackText}</li>
        <li>
          {trends.provenance.sourceName}: {trends.provenance.basisText}
        </li>
        <li>개인정보 수집 여부: 수집하지 않음</li>
      </ul>
    </section>
  );
}
