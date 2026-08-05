import type {
  DataSourceStatus,
  DemandBackdataContext,
  SelectedFestivalBasis,
  SpendingContext,
  TrafficContext,
  TourismContext,
  TrendContext,
} from "../domain/types";
import type { WeatherContext } from "../services/weatherAdapter";

interface DataBasisPanelProps {
  tourism: TourismContext;
  trends: TrendContext;
  traffic?: TrafficContext;
  spending?: SpendingContext;
  demandBackdata?: DemandBackdataContext;
  weather?: WeatherContext;
  selectedFestivalBasis?: SelectedFestivalBasis | null;
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
  if (status === "file-normalized") return "파일 정규화";
  return "샘플 데이터 대체 사용";
}

function compactStatusLabel(status: DataSourceStatus | undefined) {
  if (status === "live") return "실조회";
  if (status === "partial-fallback") return "일부 보완";
  if (status === "file-normalized") return "파일 정규화";
  return "샘플 대체";
}

function trafficStatusLabel(status: TrafficContext["status"] | undefined) {
  if (status === "live") return "실조회";
  if (status === "mapped-sample") return "매핑 샘플";
  return "샘플 대체";
}

export function DataBasisPanel({
  tourism,
  trends,
  traffic,
  spending,
  demandBackdata,
  weather,
  selectedFestivalBasis,
}: DataBasisPanelProps) {
  const statusRows = [
    {
      label: "TourAPI",
      status: compactStatusLabel(tourism.provenance.sourceStatus),
      basis: tourism.provenance.sourceName,
    },
    {
      label: "검색 관심도",
      status: compactStatusLabel(trends.provenance.sourceStatus),
      basis: trends.provenance.sourceName,
    },
    ...(weather
      ? [
          {
            label: "기상청 단기예보",
            status: compactStatusLabel(weather.provenance.sourceStatus),
            basis:
              weather.provenance.sourceType === "kma-forecast"
                ? "기상청 실시간 단기예보 API"
                : "동계/하계 평년 기후 샘플",
          },
        ]
      : []),
    ...(traffic
      ? [
          {
            label: "교통 근거",
            status: trafficStatusLabel(traffic.status),
            basis: traffic.provenance.sourceName,
          },
          {
            label: "TAGO 대중교통",
            status: "실조회",
            basis: "국토교통부 버스정류소/노선 API",
          },
        ]
      : []),
    ...(spending
      ? [
          {
            label: "관광소비",
            status: compactStatusLabel(spending.sourceStatus),
            basis: spending.sourceName,
          },
        ]
      : []),
    ...(demandBackdata
      ? [
          {
            label: "지역 수요 백데이터",
            status: compactStatusLabel(demandBackdata.status),
            basis:
              demandBackdata.sourceDetails[0]?.sourceName ??
              "지역축제 백데이터 기준",
          },
        ]
      : []),
  ];

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

      <div className="data-status-summary">
        <h3>데이터 상태 요약</h3>
        <dl className="data-status-grid">
          {statusRows.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>
                <strong>{row.status}</strong>
                <span>{row.basis}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>

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
