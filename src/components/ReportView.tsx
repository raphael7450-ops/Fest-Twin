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
  const highRiskScores = report.scores.filter((score) => score.level !== "low");
  const safetyFindings =
    report.findings.length > 0 ? report.findings : ["피크 시간대 혼잡과 병목 후보를 중심으로 현장 안전계획을 검토합니다."];

  return (
    <section className="panel report-panel">
      <div className="panel-heading">
        <h2>기획 보완 리포트</h2>
        <div className="panel-actions">
          <span>공공 검토용 요약</span>
          <PrintReportButton />
        </div>
      </div>

      <section className="report-section" aria-labelledby="report-forecast-heading">
        <div className="report-section-heading">
          <span>01</span>
          <h3 id="report-forecast-heading">예측 결과</h3>
        </div>
        <p className="report-summary">{report.summary}</p>
        <p className="muted">{report.governmentReviewNote}</p>
        <div className="report-kpi-strip">
          <article>
            <span>예상 방문객</span>
            <strong>{forecast.expectedVisitors.toLocaleString("ko-KR")}명</strong>
          </article>
          <article>
            <span>피크 시간</span>
            <strong>{forecast.peakHour}:00</strong>
          </article>
          <article>
            <span>성공 가능성</span>
            <strong>{forecast.successScore}점</strong>
          </article>
        </div>
        <div className="score-table">
          {report.scores.map((score) => (
            <article key={score.label}>
              <span>{score.label}</span>
              <strong>{score.score}점</strong>
              <small>{score.reason}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="report-section" aria-labelledby="report-safety-heading">
        <div className="report-section-heading">
          <span>02</span>
          <h3 id="report-safety-heading">혼잡·안전 진단</h3>
        </div>
        <ul className="report-finding-list">
          {safetyFindings.map((finding) => (
            <li key={finding}>{finding}</li>
          ))}
        </ul>
        {highRiskScores.length > 0 ? (
          <div className="score-table">
            {highRiskScores.map((score) => (
              <article key={score.label}>
                <span>{score.label}</span>
                <strong>{score.score}점</strong>
                <small>{score.reason}</small>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className="report-section" aria-labelledby="report-economy-heading">
        <div className="report-section-heading">
          <span>03</span>
          <h3 id="report-economy-heading">예산·경제 효과</h3>
        </div>
        <RoiEconomicImpact
          plan={plan}
          forecast={forecast}
          spending={spending}
          onOpenEvidence={onOpenEvidence}
        />
      </section>

      <section className="report-section" aria-labelledby="report-data-heading">
        <div className="report-section-heading">
          <span>04</span>
          <h3 id="report-data-heading">사용 데이터와 한계</h3>
        </div>
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
      </section>

      <section className="report-section" aria-labelledby="report-recommendation-heading">
        <div className="report-section-heading">
          <span>05</span>
          <h3 id="report-recommendation-heading">개선 권고</h3>
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
    </section>
  );
}
