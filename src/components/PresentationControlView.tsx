import type {
  FestivalPlan,
  ForecastResult,
  MetricEvidence,
  MetricEvidenceId,
  PlanningReport,
  SelectedFestivalBasis,
  SpendingContext,
} from "../domain/types";
import { createSimulation } from "../services/simulation";
import { ForecastChart } from "./ForecastChart";
import { Heatmap } from "./Heatmap";

interface PresentationControlViewProps {
  plan: FestivalPlan;
  forecast: ForecastResult;
  report: PlanningReport;
  selectedFestivalBasis: SelectedFestivalBasis | null;
  spending: SpendingContext;
  metricEvidence: Record<MetricEvidenceId, MetricEvidence>;
  onExit: () => void;
}

function formatKrw(value: number) {
  return `${(value || 0).toLocaleString("ko-KR")}원`;
}

export function PresentationControlView({
  plan,
  forecast,
  report,
  selectedFestivalBasis,
  spending,
  onExit,
}: PresentationControlViewProps) {
  const simulation = createSimulation(plan, forecast, forecast?.peakHour ?? 20);
  const maxDensityVal = simulation?.cells?.length
    ? Math.max(...simulation.cells.map((c) => c.density))
    : (simulation?.congestionScore ?? 45);
  const maxDensityPerSqm = Number.isFinite(maxDensityVal) ? (maxDensityVal / 25).toFixed(2) : "1.80";
  const expectedVisitors = forecast?.expectedVisitors ?? 0;
  const expectedCapacity = plan?.expectedCapacity ?? 1;
  const budgetKrw = (plan?.totalBudgetMillionKrw ?? 0) * 1_000_000;
  const avgSpend = spending?.averageSpendPerVisitorKrw ?? 42000;
  const totalEconomicEffect = expectedVisitors * avgSpend;
  const roi = budgetKrw > 0 && Number.isFinite(totalEconomicEffect) ? (totalEconomicEffect / budgetKrw).toFixed(2) : "0.0";
  const overallRiskLevel = report?.scores?.find((s) => s.level === "critical" || s.level === "high")?.level ?? report?.scores?.[0]?.level ?? "medium";
  const peakVisitorCount = forecast?.visitorsByHour?.find((v) => v.hour === forecast?.peakHour)?.visitors ?? 0;

  return (
    <div className="presentation-view-container" aria-label="관제 및 발표용 전체화면 대시보드">
      {/* 관제 헤더 */}
      <header className="presentation-header">
        <div className="presentation-header__brand">
          <span className="presentation-logo">FT CONTROL</span>
          <div className="presentation-header__titles">
            <span className="presentation-tag">지자체 대형 시연 및 실시간 관제 모드</span>
            <h1 className="presentation-title">
              {selectedFestivalBasis?.title || plan.name}
            </h1>
            <p className="presentation-subtitle">
              {plan.region} | {plan.startDate} ~ {plan.endDate} | 총 예산: {formatKrw(budgetKrw)}
            </p>
          </div>
        </div>

        <button
          className="presentation-exit-btn"
          type="button"
          onClick={onExit}
          aria-label="관제 프레젠테이션 모드 종료 (ESC)"
        >
          관제 모드 종료 (ESC)
        </button>
      </header>

      {/* 4대 대형 KPI 하이라이트 */}
      <div className="presentation-kpi-row">
        <div className="presentation-kpi-card">
          <span className="presentation-kpi-label">총 예상 방문객 수</span>
          <strong className="presentation-kpi-val">{expectedVisitors.toLocaleString("ko-KR")} 명</strong>
          <span className="presentation-kpi-sub">
            피크시간: {forecast.peakHour ?? 20}:00 ({peakVisitorCount.toLocaleString("ko-KR")}명)
          </span>
        </div>

        <div className="presentation-kpi-card">
          <span className="presentation-kpi-label">피크 최고 밀집도</span>
          <strong className="presentation-kpi-val">{maxDensityPerSqm} 명/㎡</strong>
          <span className="presentation-kpi-sub">
            수용 능력 비율: {Math.round((expectedVisitors / expectedCapacity) * 100)}%
          </span>
        </div>

        <div className="presentation-kpi-card">
          <span className="presentation-kpi-label">상권 경제 파급효과</span>
          <strong className="presentation-kpi-val">{formatKrw(totalEconomicEffect)}</strong>
          <span className="presentation-kpi-sub">
            예산 대비 ROI: {roi}배 (1인당 {avgSpend.toLocaleString("ko-KR")}원)
          </span>
        </div>

        <div className="presentation-kpi-card presentation-kpi-card--risk">
          <span className="presentation-kpi-label">종합 안전 위험 등급</span>
          <strong className={`presentation-risk-badge presentation-risk-badge--${overallRiskLevel}`}>
            {overallRiskLevel === "low"
              ? "낮음 (양호)"
              : overallRiskLevel === "medium"
              ? "보통 (주의)"
              : overallRiskLevel === "high"
              ? "높음 (경고)"
              : "심각 (위험)"}
          </strong>
          <span className="presentation-kpi-sub">
            안전 예산: {plan.safetyBudgetMillionKrw ?? 0}백만원 ({Math.round(((plan.safetyBudgetMillionKrw ?? 0) / (plan.totalBudgetMillionKrw || 1)) * 100)}%)
          </span>
        </div>
      </div>

      {/* 대형 관제 그리드 */}
      <div className="presentation-main-grid">
        {/* 좌측: 실시간 공간 밀집도 시뮬레이션 히트맵 */}
        <section className="presentation-panel">
          <div className="presentation-panel__header">
            <h2>실시간 공간 혼잡도 및 밀집도 관제 맵</h2>
            <span className="panel-badge">TourAPI & KTDB 데이터 바인딩</span>
          </div>
          <div className="presentation-panel__body presentation-heatmap-body">
            <Heatmap plan={plan} simulation={simulation} />
          </div>
        </section>

        {/* 우측: 시간대별 수요 예측 차트 & 4단계 수치 산출 근거 */}
        <div className="presentation-side-stack">
          <section className="presentation-panel">
            <div className="presentation-panel__header">
              <h2>시간대별 예상 방문객 및 피크 시간 추이</h2>
              <span className="panel-badge">신뢰도: {forecast.confidence ?? "보통"} ({forecast.successScore ?? 80}점)</span>
            </div>
            <div className="presentation-panel__body">
              <ForecastChart forecast={forecast} />
            </div>
          </section>

          <section className="presentation-panel presentation-breakdown-panel">
            <div className="presentation-panel__header">
              <h2>핵심 4단계 수치 산출 근거 및 진단 소견</h2>
            </div>
            <div className="presentation-panel__body">
              <div className="presentation-breakdown-grid">
                <div className="presentation-breakdown-box">
                  <h3>Step 1. 수요 추정</h3>
                  <p>TourAPI 4.0 검색 트렌드 및 KTDB 유동인구 기반 추산 ({expectedVisitors.toLocaleString("ko-KR")}명)</p>
                </div>
                <div className="presentation-breakdown-box">
                  <h3>Step 2. 안전 인력</h3>
                  <p>피크 밀집도 {maxDensityPerSqm}명/㎡ 기준 최소 {Math.ceil(expectedVisitors / 400)}명 전담 인력 권고</p>
                </div>
                <div className="presentation-breakdown-box">
                  <h3>Step 3. 경제 파급</h3>
                  <p>소비단가 {avgSpend.toLocaleString("ko-KR")}원 적용 파급효과 {formatKrw(totalEconomicEffect)} (ROI {roi}배)</p>
                </div>
                <div className="presentation-breakdown-box">
                  <h3>Step 4. 안전 소견</h3>
                  <p>{report.findings?.[0] ?? "메인 무대 주변 병목 구간 통제선 구축 권고"}</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
