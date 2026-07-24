import type {
  FestivalPlan,
  ForecastResult,
  MetricEvidenceId,
  SimulationResult,
  TrafficContext,
} from "../domain/types";
import { createSafetyLogisticsMetrics } from "../services/impactMetrics";
import { EvidenceButton } from "./EvidenceButton";

interface SafetyLogisticsPanelProps {
  plan: FestivalPlan;
  forecast: ForecastResult;
  simulation: SimulationResult;
  traffic?: TrafficContext;
  onOpenEvidence: (metricId: MetricEvidenceId) => void;
}

export function SafetyLogisticsPanel({
  plan,
  forecast,
  simulation,
  traffic,
  onOpenEvidence,
}: SafetyLogisticsPanelProps) {
  const metrics = createSafetyLogisticsMetrics(plan, forecast, simulation, traffic);

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
            <div className="metric-inline-heading">
              <span>안전관리 요원 추천 배치</span>
              <EvidenceButton onClick={() => onOpenEvidence("safety-staff")} />
            </div>
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
            <div className="metric-inline-heading">
              <span>의료/구급 인력 추천 배치</span>
              <EvidenceButton onClick={() => onOpenEvidence("medical-staff")} />
            </div>
            <strong>{metrics.medicalStaff}명</strong>
            <small>최고 밀집도 {metrics.peakDensity}명/m² 기준</small>
          </div>
        </article>

        <article className="safety-metric">
          <span className="safety-icon safety-icon-amber" aria-hidden="true">
            ↕
          </span>
          <div>
            <div className="metric-inline-heading">
              <span>접근 교통 위험도</span>
              <EvidenceButton onClick={() => onOpenEvidence("parking-occupancy")} />
            </div>
            <div className="traffic-source-row">
              <span className="traffic-source-badge">{metrics.trafficSourceLabel}</span>
              <span className="traffic-source-status">{metrics.trafficSourceStatusLabel}</span>
            </div>
            <strong>{metrics.trafficRiskLabel}</strong>
            <small>
              {metrics.trafficRoadName} · {metrics.trafficRiskScore}점 · 기준년도 교통량
            </small>
          </div>
        </article>

        <article className="safety-metric">
          <span className="safety-icon safety-icon-teal" aria-hidden="true">
            P
          </span>
          <div>
            <div className="metric-inline-heading">
              <span>주차 수용 차오름 비율</span>
              <EvidenceButton onClick={() => onOpenEvidence("parking-occupancy")} />
            </div>
            <strong>{metrics.parkingOccupancyRate}%</strong>
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
          </div>
        </article>
      </div>
    </section>
  );
}
