import type { DataSourceStatus, TourismContext, TrendContext } from "../domain/types";

interface DataBasisPanelProps {
  tourism: TourismContext;
  trends: TrendContext;
}

function statusLabel(status: DataSourceStatus | undefined) {
  if (status === "live") return "실제 TourAPI 조회 성공";
  if (status === "partial-fallback") return "실제 TourAPI 일부 조회 및 샘플 보완";
  return "샘플 데이터 대체 사용";
}

export function DataBasisPanel({ tourism, trends }: DataBasisPanelProps) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>데이터 근거</h2>
        <span>{statusLabel(tourism.provenance.sourceStatus)}</span>
      </div>
      <ul className="evidence-list">
        <li>
          {tourism.provenance.sourceName}: {tourism.provenance.basisText}
        </li>
        <li>TourAPI 상태: {statusLabel(tourism.provenance.sourceStatus)}</li>
        {tourism.provenance.retrievedAt ? (
          <li>
            데이터 기준 시점:{" "}
            {new Date(tourism.provenance.retrievedAt).toLocaleString("ko-KR")}
          </li>
        ) : null}
        <li>{tourism.provenance.fallbackText}</li>
        {tourism.provenance.fallbackReason ? (
          <li>대체 사유: {tourism.provenance.fallbackReason}</li>
        ) : null}
        <li>
          {trends.provenance.sourceName}: {trends.provenance.basisText}
        </li>
        <li>개인정보 수집 여부: 수집하지 않음</li>
      </ul>
    </section>
  );
}
