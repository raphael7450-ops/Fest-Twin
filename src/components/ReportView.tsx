/**
 * 파일 : src/components/ReportView.tsx
 * 내용 : 지자체 예산 집행 전 사전 검토 보고서 뷰어 및 브라우저 인쇄(PDF Export) 서식 컴포넌트
 * 수정 : 2026-07-24. 기획 보완 추천안, 경제 파급효과 지표 및 출처 요약 리포트 레이아웃 구성
 */

// 핵심 도메인 인터페이스 및 타입 불러오기
import type {
  FestivalPlan, // 축제 기획안 모델
  ForecastResult, // 수요 예측 결과 모델
  MetricEvidence, // 지표별 산출 근거 모델
  MetricEvidenceId, // 지표 식별자
  PlanningReport, // 사전 진단 리포트 모델
  SpendingContext, // 관광데이터랩 소비 데이터 맥락
} from "../domain/types";
// 브라우저 인쇄/PDF 저장 버튼 컴포넌트 불러오기
import { PrintReportButton } from "./PrintReportButton";
// 보고서 하단 데이터 출처 요약 서브 컴포넌트 불러오기
import { ReportEvidenceSummary } from "./ReportEvidenceSummary";
// 예산 대비 경제적 파급효과 시각화 컴포넌트 불러오기
import { RoiEconomicImpact } from "./RoiEconomicImpact";

// ReportView 입력 프로퍼티(Props) 정의
interface ReportViewProps {
  report: PlanningReport; // 리포트 진단 종합 데이터
  plan: FestivalPlan; // 축제 기획안 데이터
  forecast: ForecastResult; // 시간대별 수요 예측 데이터
  spending?: SpendingContext; // 소비지출 백데이터
  evidenceSet: Record<MetricEvidenceId, MetricEvidence>; // 전체 지표 근거 맵
  onOpenEvidence: (metricId: MetricEvidenceId) => void; // 근거 모달 오픈 콜백
}

// B2G 사전 진단 종합 보고서 화면 렌더링 메인 컴포넌트
export function ReportView({
  report,
  plan,
  forecast,
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
            <dd>개발계정은 오퍼레이션별 일 1,000건 기준으로 호출 이력을 검증하고, 운영계정 승인에는 약 1~3일이 소요됩니다.</dd>
          </div>
          <div>
            <dt>출처 및 라이선스</dt>
            <dd>한국관광공사 TourAPI 4.0 출처 표기와 라이선스 표시 동의를 전제로 활용합니다.</dd>
          </div>
        </dl>
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
