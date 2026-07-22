import type {
  FestivalPlan,
  ForecastResult,
  SimulationResult,
} from "../domain/types";
import { createSafetyLogisticsMetrics } from "../services/impactMetrics";

interface SafetyLogisticsPanelProps {
  plan: FestivalPlan;
  forecast: ForecastResult;
  simulation: SimulationResult;
}

export function SafetyLogisticsPanel({
  plan,
  forecast,
  simulation,
}: SafetyLogisticsPanelProps) {
  const metrics = createSafetyLogisticsMetrics(plan, forecast, simulation);

  return (
    <section className="panel safety-logistics-panel">
      <div className="panel-heading">
        <h2>안전 및 물류 수용성</h2>
        <span>{simulation.hour}:00 피크 밀집 기준</span>
      </div>

      <div className="safety-grid">
        <article className="safety-metric">
          <span className="safety-icon safety-icon-blue" aria-hidden="true">
            !
          </span>
          <div>
            <span>안전관리 요원 추천 배치</span>
            <strong>{metrics.safetyStaff}명</strong>
            <small>
              피크 {metrics.peakVisitors.toLocaleString("ko-KR")}명, 병목 구역{" "}
              {simulation.bottlenecks.length}곳 기준
            </small>
          </div>
        </article>

        <article className="safety-metric">
          <span className="safety-icon safety-icon-red" aria-hidden="true">
            +
          </span>
          <div>
            <span>의료/구급 인력 추천 배치</span>
            <strong>{metrics.medicalStaff}명</strong>
            <small>최고 밀집도 {metrics.peakDensity}명/m² 기준</small>
          </div>
        </article>

        <article className="safety-metric safety-metric-wide">
          <div className="capacity-header">
            <span>주차 수용 차오름 비율</span>
            <strong>{metrics.parkingOccupancyRate}%</strong>
          </div>
          <div
            className="capacity-gauge"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={metrics.parkingOccupancyRate}
            aria-label="주차 수용 차오름 비율"
          >
            <div
              className="capacity-gauge-fill"
              style={{ width: `${metrics.parkingOccupancyRate}%` }}
            />
          </div>
          <small>
            예상 차량 유입과 행사장 수용력 기반의 사전 배치 검토값입니다.
          </small>
        </article>
      </div>
    </section>
  );
}
