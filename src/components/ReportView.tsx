import type {
  FestivalPlan,
  ForecastResult,
  MetricEvidence,
  MetricEvidenceId,
  PlanningReport,
  SelectedFestivalBasis,
  SpendingContext,
} from "../domain/types";
import { PrintReportButton } from "./PrintReportButton";
import { ReportEvidenceSummary } from "./ReportEvidenceSummary";
import { RoiEconomicImpact } from "./RoiEconomicImpact";

interface ReportViewProps {
  report: PlanningReport;
  plan: FestivalPlan;
  forecast: ForecastResult;
  selectedFestivalBasis?: SelectedFestivalBasis | null;
  spending?: SpendingContext;
  evidenceSet: Record<MetricEvidenceId, MetricEvidence>;
  onOpenEvidence: (metricId: MetricEvidenceId) => void;
}

export function ReportView({
  report,
  plan,
  forecast,
  selectedFestivalBasis,
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
      <section className="openapi-operations-report" aria-label="OpenAPI 운영계정 신청 증빙">
        <div className="openapi-operations-heading">
          <h3>OpenAPI 운영계정 신청 증빙</h3>
          <strong>Fest-Twin</strong>
        </div>
        <dl className="openapi-operations-grid">
          <div>
            <dt>활용 어플 URL</dt>
            <dd>https://cwserver.tail97dbc3.ts.net/</dd>
          </div>
          <div>
            <dt>서비스 유형</dt>
            <dd>B2G SaaS Web</dd>
          </div>
          <div>
            <dt>활용 목적</dt>
            <dd>축제 후보 조회, 행사장 위치 보강, 주변 관광지 기반 수요 예측 근거 산출</dd>
          </div>
          <div>
            <dt>TourAPI 호출 흐름</dt>
            <dd>지역 선택 → 축제 후보 → 상세 좌표 → 주변 관광지</dd>
          </div>
          <div>
            <dt>운영 전환 기준</dt>
            <dd>
              개발계정은 오퍼레이션별 일 1,000건 기준으로 호출 이력을 검증하고, 운영계정
              승인에는 약 1~3일이 소요됩니다.
            </dd>
          </div>
          <div>
            <dt>출처 및 라이선스</dt>
            <dd>한국관광공사 TourAPI 4.0 출처 표기와 라이선스 표시 동의를 전제로 활용합니다.</dd>
          </div>
        </dl>
        {selectedFestivalBasis ? (
          <div className="selected-festival-basis selected-festival-basis--report">
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
                <dt>주소</dt>
                <dd>{selectedFestivalBasis.address}</dd>
              </div>
            </dl>
          </div>
        ) : null}
      </section>
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
