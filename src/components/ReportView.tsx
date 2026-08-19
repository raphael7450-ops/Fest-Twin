import type { MetricEvidenceId } from "../domain/types";
import type { FestivalAnalysisSnapshot } from "../services/analysisSnapshot";
import { selectDwellProfile, summarizeVisitorFlow } from "../services/visitorOccupancy";
import { CsvExportButton } from "./CsvExportButton";
import { EvidenceButton } from "./EvidenceButton";
import { InfrastructureCapacityPanel } from "./InfrastructureCapacityPanel";
import { PrintReportButton } from "./PrintReportButton";
import { ReportEvidenceSummary } from "./ReportEvidenceSummary";
import { RoiEconomicImpact } from "./RoiEconomicImpact";
import { SafetyGuardAllocationPanel } from "./SafetyGuardAllocationPanel";

interface ReportViewProps {
  snapshot: FestivalAnalysisSnapshot;
  onOpenEvidence: (metricId: MetricEvidenceId) => void;
}

const importantEvidenceIds: MetricEvidenceId[] = [
  "demand-index",
  "peak-density",
  "economic-roi",
  "parking-occupancy",
];

function formatKrw(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function uniqueLimitations(evidenceSet: FestivalAnalysisSnapshot["evidence"]) {
  return Array.from(
    new Set(
      Object.values(evidenceSet)
        .flatMap((evidence) => evidence.limitations)
        .filter(Boolean),
    ),
  ).slice(0, 5);
}

export function ReportView({
  snapshot,
  onOpenEvidence,
}: ReportViewProps) {
  const {
    report,
    plan,
    forecast,
    selectedFestivalBasis,
    evidence: evidenceSet,
    safety: safetyDecisionProfiles,
    metrics,
  } = snapshot;
  const spending = snapshot.datasets.spending.value;
  const limitations = uniqueLimitations(evidenceSet);
  const peakHour = forecast.visitorsByHour.find((item) => item.hour === forecast.peakHour);
  const successPotential = metrics.summary.successPotential;
  const budgetKrw = metrics.economic.totalBudgetKrw;
  const safetyFindings =
    report.findings.length > 0
      ? report.findings
      : ["피크 시간대 혼잡과 병목 후보를 중심으로 현장 안전계획을 검토합니다."];

  const dwellProfile = forecast.dwellProfile ?? selectDwellProfile(plan);
  const flowSummary = summarizeVisitorFlow(forecast);

  return (
    <section className="panel report-panel" aria-label="공공검토 보고서">
      <div className="panel-heading report-heading">
        <div>
          <h2>기획 보완 리포트</h2>
          <p>지자체 축제 사전 검토용 예측, 안전, 예산 근거 요약</p>
        </div>
        <div className="panel-actions">
          <span>B2G 검토본</span>
          <CsvExportButton snapshot={snapshot} />
          <PrintReportButton />
        </div>
      </div>

      <dl className="report-analysis-metadata" aria-label="분석 스냅샷 정보">
        <div>
          <dt>분석 ID</dt>
          <dd data-testid="report-analysis-id">{snapshot.analysisId}</dd>
        </div>
        <div>
          <dt>모델 버전</dt>
          <dd>{snapshot.modelVersion}</dd>
        </div>
        <div>
          <dt>생성 시각</dt>
          <dd>{snapshot.createdAt}</dd>
        </div>
        <div>
          <dt>축제 ID</dt>
          <dd>{snapshot.festivalId}</dd>
        </div>
        <div>
          <dt>축제명</dt>
          <dd>{selectedFestivalBasis?.title ?? plan.name}</dd>
        </div>
      </dl>

      <section className="report-section" aria-labelledby="report-forecast-heading">
        <div className="report-section-heading">
          <div className="report-section-title">
            <span>수요 예측</span>
            <h3 id="report-forecast-heading">예측 결과</h3>
          </div>
          <EvidenceButton onClick={() => onOpenEvidence("demand-index")} />
        </div>
        <p className="report-summary">{report.summary}</p>
        <p className="muted">{report.governmentReviewNote}</p>
        <div className="report-kpi-strip">
          <article>
            <span>일일 고유 방문객</span>
            <strong data-testid="report-expected-visitors">
              {forecast.expectedVisitors.toLocaleString("ko-KR")}명
            </strong>
          </article>
          <article>
            <span>체류 프로필</span>
            <strong>{dwellProfile.label}</strong>
            <small>평균 체류 {dwellProfile.averageMinutes}분</small>
          </article>
          <article>
            <span>동시 체류 피크</span>
            <strong>{flowSummary.peakOccupancy.toLocaleString("ko-KR")}명</strong>
            <small>{flowSummary.peakOccupancyHour}:00 피크</small>
          </article>
          <article>
            <span>피크 시간</span>
            <strong>{forecast.peakHour}:00</strong>
            <small>{peakHour ? `${peakHour.visitors.toLocaleString("ko-KR")}명 예상` : "시간대별 추정"}</small>
          </article>
          <article>
            <span>성공 예측 점수</span>
            <strong>{successPotential.score}점</strong>
            <small>신뢰도 {forecast.confidence}</small>
          </article>
          <article>
            <span>수용 정원률</span>
            <strong>{metrics.summary.capacityPressure.displayPercent}%</strong>
            <small>{metrics.summary.capacityPressure.status}</small>
          </article>
        </div>
      </section>

      <section className="report-section" aria-labelledby="report-safety-heading">
        <div className="report-section-heading">
          <div className="report-section-title">
            <span>현장 운영</span>
            <h3 id="report-safety-heading">혼잡·안전 진단</h3>
          </div>
          <EvidenceButton onClick={() => onOpenEvidence("peak-density")} />
        </div>
        <div className="score-table">
          {report.scores.length > 0 ? (
            report.scores.map((score) => (
              <article key={score.label}>
                <span>{score.label}</span>
                <strong>{score.score}점</strong>
                <small>{score.reason}</small>
              </article>
            ))
          ) : (
            <article>
              <span>종합 위험</span>
              <strong>검토 필요</strong>
              <small>혼잡도와 현장 배치 정보를 함께 검토합니다.</small>
            </article>
          )}
        </div>
        <ul className="report-finding-list">
          {safetyFindings.map((finding) => (
            <li key={finding}>{finding}</li>
          ))}
        </ul>
      </section>

      <section className="report-section" aria-labelledby="report-budget-heading">
        <div className="report-section-heading">
          <span>ROI 검토</span>
          <h3 id="report-budget-heading">예산·경제 효과</h3>
        </div>
        <div className="report-budget-note">
          <span>총 투입 예산</span>
          <strong>{formatKrw(budgetKrw)}</strong>
          <small>
            방문객 1인당 소비 기준:{" "}
            {spending
              ? `${spending.averageSpendPerVisitorKrw.toLocaleString("ko-KR")}원`
              : "공공데이터 구조 기반 샘플"}
          </small>
        </div>
        <RoiEconomicImpact
          metrics={metrics.economic}
          onOpenEvidence={onOpenEvidence}
        />
      </section>

      <section className="report-section" aria-labelledby="report-data-heading">
        <div className="report-section-heading">
          <span>감사 대응 근거</span>
          <h3 id="report-data-heading">사용 데이터와 한계</h3>
        </div>
        <ReportEvidenceSummary evidenceSet={evidenceSet} onOpenEvidence={onOpenEvidence} />
        <ul className="report-list">
          {limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      </section>

      <section className="report-section" aria-label="추가 심사 예측 모델">
        <div className="report-section-title">
          <span>사전 진단 추가 모델</span>
          <h3>[모델 1 & 2] 수용성 및 안전배치 시뮬레이션</h3>
        </div>
        <InfrastructureCapacityPanel plan={plan} forecast={forecast} onOpenEvidence={onOpenEvidence} />
        <SafetyGuardAllocationPanel
          profiles={safetyDecisionProfiles}
          dayTypeCounts={forecast.dayTypeCounts}
          onOpenEvidence={onOpenEvidence}
        />
      </section>

      <section className="report-section openapi-operations-report" aria-label="OpenAPI 운영계정 신청 증빙">
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
            <dd>개발계정 호출 이력과 공개 URL 정상 동작을 확인한 뒤 운영계정 승인을 요청합니다.</dd>
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
                <dt>주최 / 주관</dt>
                <dd>{selectedFestivalBasis.organizer || "해당 지자체 / 문화재단"}</dd>
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

      <section className="report-section" aria-labelledby="report-recommendation-heading">
        <div className="report-section-heading">
          <span>기획 보완</span>
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
