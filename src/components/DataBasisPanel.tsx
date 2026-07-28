import type {
  DataSourceStatus,
  DemandBackdataContext,
  SelectedFestivalBasis,
  SpendingContext,
  TrafficContext,
  TourismContext,
  TrendContext,
} from "../domain/types";

interface DataBasisPanelProps {
  tourism: TourismContext;
  trends: TrendContext;
  traffic?: TrafficContext;
  spending?: SpendingContext;
  demandBackdata?: DemandBackdataContext;
  selectedFestivalBasis?: SelectedFestivalBasis | null;
}

const TOURAPI_PUBLIC_URL = "https://cwserver.tail97dbc3.ts.net/";
const TOURAPI_OPERATIONS = [
  "areaCode2",
  "searchFestival2",
  "detailCommon2",
  "locationBasedList2",
];

type EvidenceStatus = DataSourceStatus | TrafficContext["status"] | undefined;

function statusLabel(status: EvidenceStatus) {
  if (status === "live") return "실데이터";
  if (status === "partial-fallback") return "부분 보완";
  if (status === "file-normalized") return "파일 정규화";
  if (status === "mapped-sample") return "지역 매핑 샘플";
  return "샘플 보완";
}

function statusTone(status: EvidenceStatus) {
  if (status === "live") return "good";
  if (status === "partial-fallback" || status === "file-normalized" || status === "mapped-sample") {
    return "warn";
  }
  return "sample";
}

export function DataBasisPanel({
  tourism,
  trends,
  traffic,
  spending,
  demandBackdata,
  selectedFestivalBasis,
}: DataBasisPanelProps) {
  const statusRows = [
    {
      label: "TourAPI 축제·관광지",
      value: statusLabel(tourism.provenance.sourceStatus),
      tone: statusTone(tourism.provenance.sourceStatus),
      detail: tourism.provenance.sourceName,
    },
    {
      label: "검색·소셜 트렌드",
      value: statusLabel(trends.provenance.sourceStatus),
      tone: statusTone(trends.provenance.sourceStatus),
      detail: trends.provenance.sourceName,
    },
    {
      label: "KTDB/View-T 교통",
      value: traffic ? statusLabel(traffic.status) : "미연동",
      tone: traffic ? statusTone(traffic.status) : "sample",
      detail: traffic ? `${traffic.year}년 ${traffic.weekType} ${traffic.time}` : "교통 컨텍스트 없음",
    },
    {
      label: "관광소비 객단가",
      value: spending ? statusLabel(spending.sourceStatus) : "미연동",
      tone: spending ? statusTone(spending.sourceStatus) : "sample",
      detail: spending?.sourceName ?? "소비 컨텍스트 없음",
    },
    {
      label: "지역 수요 백데이터",
      value: demandBackdata ? statusLabel(demandBackdata.status) : "미연동",
      tone: demandBackdata ? statusTone(demandBackdata.status) : "sample",
      detail: demandBackdata
        ? `${demandBackdata.similarFestivalBaselines.length}건 비교`
        : "비교 축제 백데이터 없음",
    },
  ];

  return (
    <section className="panel data-basis-panel">
      <div className="panel-heading">
        <h2>데이터 근거</h2>
        <span>{statusLabel(tourism.provenance.sourceStatus)}</span>
      </div>

      <div className="data-status-grid" aria-label="데이터 출처 상태">
        {statusRows.map((row) => (
          <div className="data-status-card" key={row.label}>
            <div className="data-status-card-header">
              <strong>{row.label}</strong>
              <span className={`data-status-badge ${row.tone}`}>{row.value}</span>
            </div>
            <p>{row.detail}</p>
          </div>
        ))}
      </div>

      <div className="evidence-source-status data-basis-source-status">
        <strong>{tourism.provenance.sourceName}</strong>
        <span>
          {tourism.provenance.retrievedAt
            ? new Date(tourism.provenance.retrievedAt).toLocaleString("ko-KR")
            : "샘플 기준"}
        </span>
      </div>

      <ul className="data-basis-evidence-list">
        <li>
          <span>TourAPI 기준</span>
          <p>{tourism.provenance.basisText}</p>
        </li>
        <li>
          <span>Fallback 기준</span>
          <p>{tourism.provenance.fallbackText}</p>
        </li>
        {tourism.provenance.fallbackReason ? (
          <li>
            <span>보완 사유</span>
            <p>{tourism.provenance.fallbackReason}</p>
          </li>
        ) : null}
        <li>
          <span>{trends.provenance.sourceName}</span>
          <p>{trends.provenance.basisText}</p>
        </li>
        <li>
          <span>개인정보 수집 여부</span>
          <p>수집하지 않음</p>
        </li>
        <li>
          <span>예측값 성격</span>
          <p>실제 집계값이 아닌 사전 의사결정용 추정값</p>
        </li>
      </ul>

      {selectedFestivalBasis ? (
        <div className="selected-festival-basis">
          <h3>선택 TourAPI 축제 기준</h3>
          <dl className="selected-festival-basis-grid">
            <div>
              <dt>축제명</dt>
              <dd>{selectedFestivalBasis.title}</dd>
            </div>
            <div>
              <dt>contentId</dt>
              <dd>{selectedFestivalBasis.contentId}</dd>
            </div>
            <div>
              <dt>기간</dt>
              <dd>
                {selectedFestivalBasis.startDate} ~ {selectedFestivalBasis.endDate}
              </dd>
            </div>
            <div>
              <dt>좌표</dt>
              <dd>
                {selectedFestivalBasis.mapX && selectedFestivalBasis.mapY
                  ? `${selectedFestivalBasis.mapX}, ${selectedFestivalBasis.mapY}`
                  : "-"}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}

      <div className="tourapi-operations-evidence">
        <h3>OpenAPI 운영계정 신청 증빙</h3>
        <dl className="tourapi-operations-grid">
          <div>
            <dt>활용 어플 URL</dt>
            <dd>{TOURAPI_PUBLIC_URL}</dd>
          </div>
          <div>
            <dt>사용 오퍼레이션</dt>
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
            <dd>운영계정 승인에는 약 1~3일이 필요하며 승인 후 24개월 사용 가능합니다.</dd>
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
