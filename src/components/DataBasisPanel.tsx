import type { DataSourceStatus, TourismContext, TrendContext } from "../domain/types";

interface DataBasisPanelProps {
  tourism: TourismContext;
  trends: TrendContext;
}

const TOURAPI_PUBLIC_URL = "https://cwserver.tail97dbc3.ts.net/";
const TOURAPI_OPERATIONS = [
  "areaCode2",
  "searchFestival2",
  "detailCommon2",
  "locationBasedList2",
];

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

      <div className="tourapi-operations-evidence">
        <h3>OpenAPI 운영계정 신청 증빙</h3>
        <dl className="tourapi-operations-grid">
          <div>
            <dt>활용 어플 URL</dt>
            <dd>{TOURAPI_PUBLIC_URL}</dd>
          </div>
          <div>
            <dt>활용 오퍼레이션</dt>
            <dd className="operation-chip-row">
              {TOURAPI_OPERATIONS.map((operation) => (
                <span className="operation-chip" key={operation}>
                  {operation}
                </span>
              ))}
            </dd>
          </div>
          <div>
            <dt>개발계정 제한</dt>
            <dd>개발계정은 오퍼레이션별 일 1,000건 트래픽 기준으로 검증합니다.</dd>
          </div>
          <div>
            <dt>운영계정 전환</dt>
            <dd>운영계정 승인에는 약 1~3일이 소요되며 승인 후 24개월 활용 가능합니다.</dd>
          </div>
          <div>
            <dt>키 관리</dt>
            <dd>서비스키는 서버 환경변수로만 관리하고 브라우저와 보고서에는 노출하지 않습니다.</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
