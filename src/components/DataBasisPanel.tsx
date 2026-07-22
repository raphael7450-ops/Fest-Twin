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
    <section className="panel data-basis-panel">
      <div className="panel-heading">
        <h2>데이터 신뢰도</h2>
        <span>{statusLabel(tourism.provenance.sourceStatus)}</span>
      </div>
      <div className="evidence-source-status">
        <strong>{tourism.provenance.sourceName}</strong>
        <span>
          {tourism.provenance.retrievedAt
            ? new Date(tourism.provenance.retrievedAt).toLocaleString("ko-KR")
            : "샘플 기준"}
        </span>
      </div>
      <ul className="evidence-list">
        <li>{tourism.provenance.basisText}</li>
        <li>{tourism.provenance.fallbackText}</li>
        {tourism.provenance.fallbackReason ? (
          <li>보완 사유: {tourism.provenance.fallbackReason}</li>
        ) : null}
        <li>
          {trends.provenance.sourceName}: {trends.provenance.basisText}
        </li>
        <li>개인정보 수집 여부: 수집하지 않음</li>
        <li>예측값 성격: 실제 집계값이 아닌 사전 의사결정용 추정값</li>
      </ul>
    </section>
  );
}
