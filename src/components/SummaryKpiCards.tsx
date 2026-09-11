import type { MetricEvidenceId } from "../domain/types";
import type { SummaryKpiMetrics } from "../services/impactMetrics";
import { EvidenceButton } from "./EvidenceButton";

interface SummaryKpiCardsProps {
  metrics: SummaryKpiMetrics;
  onOpenEvidence: (metricId: MetricEvidenceId) => void;
}

function formatKrw(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

export function SummaryKpiCards({ metrics, onOpenEvidence }: SummaryKpiCardsProps) {
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

  const spilloverTone =
    metrics.spillover.nearbyInflowRate >= 40
      ? "high"
      : metrics.spillover.nearbyInflowRate >= 20
        ? "medium"
        : "low";
  const spilloverLabel =
    metrics.spillover.nearbyInflowRate >= 40
      ? "상권 우수"
      : metrics.spillover.nearbyInflowRate >= 20
        ? "상권 보통"
        : "상권 취약";

  return (
    <section className="summary-grid summary-kpi-grid" aria-label="핵심 진단 지표">
      {/* 1. 흥행 가능성 점수 */}
      <article className="metric-card metric-card--primary">
        <div className="kpi-card-header">
          <span className="kpi-title-label">흥행 가능성 점수</span>
          <EvidenceButton onClick={() => onOpenEvidence("demand-index")} />
        </div>
        <div className="kpi-meta-row">
          <span className="source-tag">TourAPI·문체부</span>
          <div className="kpi-badges-group">
            <em className={`kpi-badge kpi-badge-${successTone}`}>
              {metrics.successPotential.grade}
            </em>
            <em className={`kpi-badge kpi-badge-${capacityTone}`}>
              {capacityLabel}
            </em>
          </div>
        </div>
        <div className="kpi-body">
          <strong className="kpi-value">{metrics.successPotential.score}점</strong>
          <small className="metric-trend">
            수용 정원률 {metrics.capacityPressure.displayPercent}%
          </small>
        </div>
      </article>

      {/* 2. 최고 밀집 위험도 */}
      <article className="metric-card metric-card--danger">
        <div className="kpi-card-header">
          <span className="kpi-title-label">피크 시간 평균 밀도</span>
          <EvidenceButton onClick={() => onOpenEvidence("peak-density")} />
        </div>
        <div className="kpi-meta-row">
          <span className="source-tag">피크 인원·행사장 면적</span>
          <div className="kpi-badges-group">
            <em className={`risk-badge risk-badge-${densityTone}`}>
              {densityLabel}
            </em>
          </div>
        </div>
        <div className="kpi-body">
          <strong className="kpi-value">
            {metrics.peakDensity.status === "available"
              ? `${metrics.peakDensity.value.toFixed(2)}명/m²`
              : "산출 불가"}
          </strong>
          <small className="metric-trend">
            {metrics.peakDensity.status === "available"
              ? metrics.peakDensity.basis
              : metrics.peakDensity.reason}
          </small>
        </div>
      </article>

      {/* 3. 예산 효율성 점수 */}
      <article className="metric-card metric-card--warning">
        <div className="kpi-card-header">
          <span className="kpi-title-label">예산 단가 참고값</span>
          <EvidenceButton onClick={() => onOpenEvidence("budget-efficiency")} />
        </div>
        <div className="kpi-meta-row">
          <span className="source-tag">예산·관광백데이터</span>
          <div className="kpi-badges-group">
            <em className="kpi-badge kpi-badge-medium">기획 참고값</em>
          </div>
        </div>
        <div className="kpi-body">
          <strong className="kpi-value">{formatKrw(metrics.budgetEfficiency.costPerVisitorKrw)}</strong>
          <small className="metric-trend">{metrics.budgetEfficiency.description}</small>
        </div>
      </article>

      {/* 4. 지역 상권 유출 연계도 */}
      <article className="metric-card metric-card--success">
        <div className="kpi-card-header">
          <span className="kpi-title-label">주변 관광 연계 점수</span>
          <EvidenceButton onClick={() => onOpenEvidence("commercial-spillover")} />
        </div>
        <div className="kpi-meta-row">
          <span className="source-tag">주변 관광지·축제 참고자료</span>
          <div className="kpi-badges-group">
            <em className={`kpi-badge kpi-badge-${spilloverTone}`}>{spilloverLabel}</em>
          </div>
        </div>
        <div className="kpi-body">
          <strong className="kpi-value">{metrics.spillover.nearbyInflowRate}점</strong>
          <small className="metric-trend">{metrics.spillover.description}</small>
        </div>
      </article>
    </section>
  );
}
