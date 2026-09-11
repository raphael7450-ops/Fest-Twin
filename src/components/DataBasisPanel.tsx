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
import type { VenueInfrastructureContext } from "../services/infrastructureAdapter";

interface DataBasisPanelProps {
  tourism: TourismContext;
  trends: TrendContext;
  traffic?: TrafficContext;
  spending?: SpendingContext;
  demandBackdata?: DemandBackdataContext;
  weather?: WeatherContext;
  infrastructure?: VenueInfrastructureContext;
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
  infrastructure,
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
            label: "기상 참고값",
            status: compactStatusLabel(weather.provenance.sourceStatus),
            basis: weather.provenance.sourceStatus === "live" ? "기상청 예보 조회값" : "계절별 기상 샘플 (실제 예보 아님)",
          },
        ]
      : []),
    ...(traffic
      ? [
          {
            label: "교통 근거",
            status: trafficStatusLabel(traffic.status),
            basis: `${traffic.provenance.sourceName} (KTDB 기준 도로 용량 통계)`,
          },
        ]
      : []),
    ...(spending
      ? [
          {
            label: "관광소비",
            status: compactStatusLabel(spending.sourceStatus),
            basis: `${spending.sourceName} (소비 원단위 기준 통계)`,
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
              "지역축제 백데이터 기준 통계",
          },
        ]
      : []),
    ...(infrastructure?.sourceDetails.map((detail) => ({
      label: detail.sourceName,
      status: detail.statusLabel,
      basis: "행사장 주변 시설 참고 정보. 관측 목록과 조회 범위는 현장 탭에서 확인하세요.",
    })) ?? []),
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
        <li>기획안과 공유 내용에는 개인정보를 입력하지 마세요.</li>
        <li>예측값 성격: 실제 집계값이 아닌 사전 의사결정용 추정값</li>
        <li>수요·수용력 연계: 모델 예상 수요와 입력한 행사장 수용 인원을 비교합니다. 통신 기반 실측 인구나 현장 안전 인증이 아닙니다.</li>
      </ul>

      <div className="data-status-summary">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <h3 style={{ margin: 0 }}>데이터 상태 요약</h3>
          <span style={{ fontSize: "0.78rem", color: "#10b981", background: "#ecfdf5", padding: "2px 8px", borderRadius: "12px", border: "1px solid #a7f3d0" }}>
            분석 시점 조회 상태
          </span>
        </div>
        <dl className="data-status-grid">
          {statusRows.map((row) => {
            const isLive = row.status === "실조회";
            const isNormalized = row.status === "파일 정규화";
            const badgeBg = isLive ? "#ecfdf5" : isNormalized ? "#eff6ff" : "#fef3c7";
            const badgeColor = isLive ? "#065f46" : isNormalized ? "#1e40af" : "#92400e";
            const badgeBorder = isLive ? "#a7f3d0" : isNormalized ? "#bfdbfe" : "#fde68a";

            return (
              <div key={row.label} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <dt style={{ fontWeight: "600", fontSize: "0.85rem" }}>{row.label}</dt>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: "600",
                      padding: "1px 6px",
                      borderRadius: "4px",
                      backgroundColor: badgeBg,
                      color: badgeColor,
                      border: `1px solid ${badgeBorder}`,
                    }}
                  >
                    {row.status}
                  </span>
                </div>
                <dd style={{ margin: 0, fontSize: "0.78rem", color: "#64748b" }}>
                  <span>{row.basis}</span>
                </dd>
              </div>
            );
          })}
        </dl>
      </div>

      {selectedFestivalBasis ? (
        <div className="selected-festival-basis">
          <h3>선택 TourAPI 축제 기준</h3>
          {selectedFestivalBasis.imageUrl && (
            <div style={{ marginBottom: "12px", width: "100%", maxHeight: "140px", overflow: "hidden", borderRadius: "6px" }}>
              <img
                src={selectedFestivalBasis.imageUrl}
                alt={selectedFestivalBasis.title}
                style={{ width: "100%", height: "140px", objectFit: "cover" }}
              />
            </div>
          )}
          <dl className="selected-festival-basis-grid">
            <div>
              <dt>축제명</dt>
              <dd>{selectedFestivalBasis.title}</dd>
            </div>
            <div>
              <dt>주최 / 주관</dt>
              <dd>{selectedFestivalBasis.organizer || "주최 정보 미확인"}</dd>
            </div>
            <div>
              <dt>기간</dt>
              <dd>
                {selectedFestivalBasis.startDate} ~ {selectedFestivalBasis.endDate}
              </dd>
            </div>
            <div>
              <dt>주소</dt>
              <dd>{selectedFestivalBasis.address || "주소 미기재"}</dd>
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
