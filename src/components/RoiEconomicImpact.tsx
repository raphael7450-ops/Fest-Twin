import type {
  FestivalPlan,
  ForecastResult,
  MetricEvidenceId,
} from "../domain/types";
import { createEconomicImpactMetrics } from "../services/impactMetrics";
import { EvidenceButton } from "./EvidenceButton";

interface RoiEconomicImpactProps {
  plan: FestivalPlan;
  forecast: ForecastResult;
  onOpenEvidence: (metricId: MetricEvidenceId) => void;
}

function formatKrw(value: number) {
  if (value >= 100_000_000) {
    return `${(value / 100_000_000).toLocaleString("ko-KR", {
      maximumFractionDigits: 1,
    })}억원`;
  }

  return `${value.toLocaleString("ko-KR")}원`;
}

export function RoiEconomicImpact({
  plan,
  forecast,
  onOpenEvidence,
}: RoiEconomicImpactProps) {
  const metrics = createEconomicImpactMetrics(plan, forecast);
  const maxValue = Math.max(
    metrics.totalBudgetKrw,
    metrics.expectedLocalSpendingKrw,
    1,
  );
  const budgetWidth = Math.round((metrics.totalBudgetKrw / maxValue) * 100);
  const impactWidth = Math.round(
    (metrics.expectedLocalSpendingKrw / maxValue) * 100,
  );

  return (
    <section className="roi-impact" aria-label="예산 대비 경제적 파급효과">
      <div className="roi-impact-heading">
        <div>
          <h3>예산 대비 경제적 파급효과</h3>
          <p>
            방문객 1인당 평균 소비 단가{" "}
            {metrics.averageSpendPerVisitorKrw.toLocaleString("ko-KR")}원 기준
            시연 값입니다.
          </p>
        </div>
        <div className="metric-inline-heading">
          <EvidenceButton onClick={() => onOpenEvidence("economic-roi")} />
          <strong>{metrics.roiMultiplier.toFixed(1)}배 창출 예상</strong>
        </div>
      </div>

      <div className="roi-bars">
        <div className="roi-bar-row">
          <span>총 투입 예산</span>
          <div className="roi-bar-track">
            <div
              className="roi-bar-fill roi-bar-fill-budget"
              style={{ width: `${budgetWidth}%` }}
            />
          </div>
          <strong>{formatKrw(metrics.totalBudgetKrw)}</strong>
        </div>

        <div className="roi-bar-row">
          <span>예상 지역 상권 소비 창출액</span>
          <div className="roi-bar-track">
            <div
              className="roi-bar-fill roi-bar-fill-impact"
              style={{ width: `${impactWidth}%` }}
            />
          </div>
          <strong>{formatKrw(metrics.expectedLocalSpendingKrw)}</strong>
        </div>
      </div>
    </section>
  );
}
