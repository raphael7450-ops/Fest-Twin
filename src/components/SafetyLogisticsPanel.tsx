import type {
  MetricEvidenceId,
  SafetyDecisionMetrics,
} from "../domain/types";
import type { LogisticsMetrics } from "../services/impactMetrics";
import { EvidenceButton } from "./EvidenceButton";

interface SafetyLogisticsPanelProps {
  metrics: SafetyDecisionMetrics;
  logistics?: LogisticsMetrics;
  hour?: number;
  onOpenEvidence: (metricId: MetricEvidenceId) => void;
}

function peopleValue(metric: SafetyDecisionMetrics["medicalStaff"]) {
  return metric.status === "available" ? `${metric.value}명` : "산출 불가";
}

export function SafetyLogisticsPanel({
  metrics,
  logistics,
  hour,
  onOpenEvidence,
}: SafetyLogisticsPanelProps) {
  return (
    <section className="panel safety-logistics-panel">
      <div className="panel-heading">
        <h2>안전 및 물류 수용성</h2>
        <span>{hour === undefined ? "피크 기준" : `${hour}:00 피크 기준`}</span>
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
            <strong>{metrics.staffing.recommended}명</strong>
            <small>
              최소 {metrics.staffing.min}명 · 권고 {metrics.staffing.recommended}명 · 최대{" "}
              {metrics.staffing.max}명
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
            <strong>{peopleValue(metrics.medicalStaff)}</strong>
            {metrics.peakDensity.status === "available" ? (
              <small>물리 밀도 {metrics.peakDensity.value.toFixed(2)}명/m² 기준</small>
            ) : (
              <>
                <small>물리 밀도: <strong>산출 불가</strong></small>
                <small>{metrics.peakDensity.reason}</small>
              </>
            )}
          </div>
        </article>

        <article className="safety-metric">
          <span className="safety-icon safety-icon-amber" aria-hidden="true">
            !
          </span>
          <div>
            <div className="metric-inline-heading">
              <span>접근 교통 위험도</span>
              <EvidenceButton onClick={() => onOpenEvidence("traffic-risk")} />
            </div>
            <strong>{logistics?.trafficRiskLabel ?? "데이터 없음"}</strong>
            <small>
              {logistics
                ? `${logistics.trafficRoadName} · ${logistics.trafficRiskScore}점 · ${logistics.trafficSourceLabel} (${logistics.trafficSourceStatusLabel})`
                : "교통 맥락이 연결되지 않았습니다."}
            </small>
          </div>
        </article>

        <article className="safety-metric">
          <span className="safety-icon safety-icon-teal" aria-hidden="true">
            P
          </span>
          <div className="capacity-header">
            <div className="metric-inline-heading">
              <span>주차 수용 차오름 비율</span>
              <EvidenceButton onClick={() => onOpenEvidence("parking-occupancy")} />
            </div>
            <strong>{logistics ? `${logistics.parkingOccupancyRate}%` : "데이터 없음"}</strong>
          </div>
          {logistics ? (
            <div
              className="capacity-gauge"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={logistics.parkingOccupancyRate}
              aria-label="주차 수용 차오름 비율"
            >
              <div
                className="capacity-gauge-fill"
                style={{ width: `${logistics.parkingOccupancyRate}%` }}
              />
            </div>
          ) : null}
          <small>예상 차량 유입과 행사장 수용력 기반의 사전 배치 검토값입니다.</small>
        </article>
      </div>
    </section>
  );
}
