/**
 * 파일 : src/components/SummaryKpiCards.tsx
 * 내용 : 흥행 예측 지수, 최고 밀집 위험도, 예산 효율성 점수, 상권 유출 연계도 4대 핵심 KPI 카드 컴포넌트
 * 수정 : 2026-07-24. KPI 뱃지 상태 연동 및 지표별 표준 근거 보기 버튼 통합
 */

// 핵심 도메인 인터페이스 및 타입 정의 불러오기
import type {
  DemandBackdataContext,
  FestivalPlan, // 축제 기획안 모델
  ForecastResult, // 수요 예측 결과 모델
  MetricEvidenceId, // 근거 보기 지표 ID
  SafetyDecisionMetrics,
  SimulationResult, // 96격자 군중 밀집 시뮬레이션 결과
  TourismContext, // TourAPI 관광지 연동 맥락
} from "../domain/types";
// 핵심 4대 KPI 지표 계산 비즈니스 함수 불러오기
import { createSummaryKpiMetrics } from "../services/impactMetrics";
// 산출 근거 보기 공통 버튼 컴포넌트 불러오기
import { EvidenceButton } from "./EvidenceButton";

// SummaryKpiCards 입력 프로퍼티(Props) 정의
interface SummaryKpiCardsProps {
  plan: FestivalPlan; // 기획안 (예산 포함)
  forecast: ForecastResult; // 수요 예측 결과
  simulation: SimulationResult; // 피크 혼잡 시뮬레이션 결과
  tourism: TourismContext; // 주변 관광 매력도 정보
  demandBackdata?: DemandBackdataContext;
  safetyMetrics?: SafetyDecisionMetrics;
  onOpenEvidence: (metricId: MetricEvidenceId) => void; // 근거 모달 오픈 콜백
}

// 통화(원) 포맷팅 헬퍼 함수
function formatKrw(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

// 상단 핵심 4대 KPI 카드를 시각화하는 메인 UI 컴포넌트
export function SummaryKpiCards({
  plan,
  forecast,
  simulation,
  tourism,
  demandBackdata,
  safetyMetrics,
  onOpenEvidence,
}: SummaryKpiCardsProps) {
  const metrics = createSummaryKpiMetrics(
    plan,
    forecast,
    simulation,
    tourism,
    demandBackdata,
    safetyMetrics,
  );
  const successTone =
    metrics.successPotential.grade === "상"
      ? "high"
      : metrics.successPotential.grade === "중"
        ? "medium"
        : "low";
  const capacityTone =
    metrics.capacityPressure.status === "within"
      ? "high"
      : metrics.capacityPressure.status === "caution"
        ? "medium"
        : "low";
  const capacityLabel =
    metrics.capacityPressure.status === "within"
      ? "여유"
      : metrics.capacityPressure.status === "caution"
        ? "주의"
        : "초과";
  const densityTone =
    metrics.peakDensity.status === "available" && metrics.peakDensity.value >= 5
      ? "warning"
      : metrics.peakDensity.status === "available" && metrics.peakDensity.value >= 3
        ? "caution"
        : "normal";
  const densityLabel =
    metrics.peakDensity.status === "unavailable"
      ? "근거 부족"
      : metrics.peakDensity.value >= 5
        ? "경고"
        : metrics.peakDensity.value >= 3
          ? "주의"
          : "정상";

  return (
    <section className="summary-grid summary-kpi-grid" aria-label="핵심 진단 지표">
      <article className="metric-card metric-card--primary">
        <div className="kpi-title-row">
          <span>흥행 가능성 점수</span>
          <div className="kpi-actions">
            <EvidenceButton onClick={() => onOpenEvidence("demand-index")} />
            <em className={`kpi-badge kpi-badge-${successTone}`}>
              {metrics.successPotential.grade}
            </em>
            <em className={`kpi-badge kpi-badge-${capacityTone}`}>
              {capacityLabel}
            </em>
          </div>
        </div>
        <strong>{metrics.successPotential.score}점</strong>
        <small className="metric-trend">
          수용 정원률 {metrics.capacityPressure.displayPercent}%
        </small>
      </article>

      <article className="metric-card metric-card--danger">
        <div className="kpi-title-row">
          <span>최고 밀집 위험도</span>
          <div className="kpi-actions">
            <EvidenceButton onClick={() => onOpenEvidence("peak-density")} />
            <em className={`risk-badge risk-badge-${densityTone}`}>
              {densityLabel}
            </em>
          </div>
        </div>
        <strong>
          {metrics.peakDensity.status === "available"
            ? `${metrics.peakDensity.value.toFixed(2)}명/m²`
            : "산출 불가"}
        </strong>
        <small className="metric-trend">
          {metrics.peakDensity.status === "available"
            ? metrics.peakDensity.basis
            : metrics.peakDensity.reason}
        </small>
      </article>

      <article className="metric-card metric-card--warning">
        <div className="kpi-title-row">
          <span>예산 효율성 점수</span>
          <EvidenceButton onClick={() => onOpenEvidence("budget-efficiency")} />
        </div>
        <strong>{formatKrw(metrics.budgetEfficiency.costPerVisitorKrw)}</strong>
        <small className="metric-trend">{metrics.budgetEfficiency.description}</small>
      </article>

      <article className="metric-card metric-card--success">
        <div className="kpi-title-row">
          <span>지역 상권 유출 연계도</span>
          <EvidenceButton onClick={() => onOpenEvidence("commercial-spillover")} />
        </div>
        <strong>{metrics.spillover.nearbyInflowRate}%</strong>
        <small className="metric-trend">{metrics.spillover.description}</small>
      </article>
    </section>
  );
}
