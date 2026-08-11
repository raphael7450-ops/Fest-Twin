import { useState } from "react";
import type {
  DayType,
  DayTypeCounts,
  MetricEstimate,
  MetricEvidenceId,
  SafetyDecisionProfiles,
} from "../domain/types";
import { EvidenceButton } from "./EvidenceButton";

interface SafetyGuardAllocationPanelProps {
  profiles: SafetyDecisionProfiles;
  dayTypeCounts?: DayTypeCounts;
  onOpenEvidence?: (metricId: MetricEvidenceId) => void;
}

function availableValue(metric: MetricEstimate, suffix: string) {
  return metric.status === "available" ? `${Math.round(metric.value)}${suffix}` : "산출 불가";
}

function evacuationValue(metric: MetricEstimate) {
  if (metric.status === "unavailable") {
    return "산출 불가";
  }

  const totalSeconds = Math.round(metric.value);
  return `${Math.floor(totalSeconds / 60)}분 ${totalSeconds % 60}초`;
}

export function SafetyGuardAllocationPanel({
  profiles,
  dayTypeCounts,
  onOpenEvidence,
}: SafetyGuardAllocationPanelProps) {
  const [selectedDayType, setSelectedDayType] = useState<DayType>("summary");
  const safety = profiles[selectedDayType];
  const counts = dayTypeCounts ?? {
    totalDays: 3,
    weekdayDays: 2,
    weekendDays: 1,
  };

  return (
    <section className="panel safety-allocation-panel" aria-label="[모델 2] 인파 사고 리스크 & 안전요원 배치 모델">
      <div className="panel-heading">
        <div>
          <h2>인파 사고 리스크 & 구역별 안전요원 배치 모델</h2>
          <p>구역별 추천 배치 인원, 의료 지원 및 비상 탈출 시간 진단</p>
        </div>
        <div className="panel-actions-inline">
          <span className="badge badge-warning">모델 2 안전배치</span>
          {onOpenEvidence ? (
            <EvidenceButton onClick={() => onOpenEvidence("safety-guards-allocation")} />
          ) : null}
        </div>
      </div>

      <div className="day-type-tab-group" role="tablist" aria-label="안전요원 배치 구분">
        <button
          type="button"
          role="tab"
          aria-selected={selectedDayType === "summary"}
          className={`day-type-tab ${selectedDayType === "summary" ? "active" : ""}`}
          onClick={() => setSelectedDayType("summary")}
        >
          전체 요약 ({counts.totalDays}일간)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={selectedDayType === "weekday"}
          className={`day-type-tab ${selectedDayType === "weekday" ? "active" : ""}`}
          onClick={() => setSelectedDayType("weekday")}
        >
          평일 평균 ({counts.weekdayDays}일)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={selectedDayType === "weekend"}
          className={`day-type-tab ${selectedDayType === "weekend" ? "active" : ""}`}
          onClick={() => setSelectedDayType("weekend")}
        >
          주말 피크 ({counts.weekendDays}일)
        </button>
      </div>

      <div className="safety-metrics-grid">
        <article className="safety-summary-card">
          <div className="safety-card-header">
            <span>총 추천 안전관리요원</span>
            {onOpenEvidence ? (
              <EvidenceButton onClick={() => onOpenEvidence("safety-guards-allocation")} />
            ) : null}
          </div>
          <strong>{safety.staffing.recommended}명</strong>
          <small>{safety.staffing.min}~{safety.staffing.max}명 사전 배치 범위</small>
        </article>

        <article className="safety-summary-card">
          <div className="safety-card-header">
            <span>의료 지원</span>
            {onOpenEvidence ? (
              <EvidenceButton onClick={() => onOpenEvidence("medical-staff")} />
            ) : null}
          </div>
          <strong>{availableValue(safety.medicalStaff, "명")}</strong>
          <small>구급차 {availableValue(safety.ambulances, "대")}</small>
        </article>

        <article className="safety-summary-card">
          <div className="safety-card-header">
            <span>비상 탈출 예상 시간</span>
            {onOpenEvidence ? (
              <EvidenceButton onClick={() => onOpenEvidence("evacuation-golden-time")} />
            ) : null}
          </div>
          <strong>{evacuationValue(safety.evacuationTime)}</strong>
          <small>
            {safety.evacuationTime.status === "available"
              ? safety.evacuationTime.basis
              : safety.evacuationTime.reason}
          </small>
        </article>
      </div>

      <div className="zone-allocation-table-wrapper">
        <div className="table-heading-with-action">
          <h3>구역별 안전요원 추천 배치 명세</h3>
          {onOpenEvidence ? (
            <EvidenceButton onClick={() => onOpenEvidence("safety-guards-allocation")} />
          ) : null}
        </div>
        <table className="zone-allocation-table">
          <thead>
            <tr>
              <th>배치 구역명</th>
              <th>추천 인원</th>
              <th>우선순위</th>
              <th>배치 이유 및 위험 가이드</th>
            </tr>
          </thead>
          <tbody>
            {safety.zoneAllocations.map((zone) => (
              <tr key={zone.zoneName}>
                <td><strong>{zone.zoneName}</strong></td>
                <td><span className="badge-highlight">{zone.recommendedGuards}명</span></td>
                <td>
                  <span className={`risk-badge risk-badge-${zone.priority === "high" ? "high" : "low"}`}>
                    {zone.priority === "high" ? "상 (필수)" : zone.priority === "medium" ? "중 (권고)" : "낮음"}
                  </span>
                </td>
                <td>{zone.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
