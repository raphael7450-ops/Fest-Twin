import { useState } from "react";
import type { DayType, FestivalPlan, ForecastResult, MetricEvidenceId } from "../domain/types";
import { calculateInfrastructureCapacityForecast } from "../services/capacityAndSafetyForecast";
import { EvidenceButton } from "./EvidenceButton";

interface InfrastructureCapacityPanelProps {
  plan: FestivalPlan;
  forecast: ForecastResult;
  onOpenEvidence?: (metricId: MetricEvidenceId) => void;
}

export function InfrastructureCapacityPanel({
  plan,
  forecast,
  onOpenEvidence,
}: InfrastructureCapacityPanelProps) {
  const [selectedDayType, setSelectedDayType] = useState<DayType>("summary");

  const profiles = forecast.dayTypeProfiles;
  const currentProfile = profiles?.[selectedDayType];

  const capacity = calculateInfrastructureCapacityForecast(plan, forecast, currentProfile);
  const parkingRate = capacity.parkingPeakOccupancyRate;
  const restroomDeficit = capacity.restroomDeficitCount;

  const dayTypeCounts = forecast.dayTypeCounts ?? {
    totalDays: 3,
    weekdayDays: 2,
    weekendDays: 1,
  };

  return (
    <section className="panel capacity-panel" aria-label="[모델 1] 인프라 수용성 & 대기시간 예측">
      <div className="panel-heading">
        <div>
          <h2>인프라 수용성 & 대기시간 예측 모델</h2>
          <p>주차 만차 시점, 화장실 대기시간 및 쓰레기 발생량 사전 진단</p>
        </div>
        <div className="panel-actions-inline">
          <span className="badge badge-info">모델 1 수용성</span>
          {onOpenEvidence && (
            <EvidenceButton onClick={() => onOpenEvidence("infrastructure-capacity")} />
          )}
        </div>
      </div>

      <div className="day-type-tab-group" role="tablist" aria-label="인프라 수용성 구분">
        <button
          type="button"
          role="tab"
          aria-selected={selectedDayType === "summary"}
          className={`day-type-tab ${selectedDayType === "summary" ? "active" : ""}`}
          onClick={() => setSelectedDayType("summary")}
        >
          전체 요약 ({dayTypeCounts.totalDays}일간)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={selectedDayType === "weekday"}
          className={`day-type-tab ${selectedDayType === "weekday" ? "active" : ""}`}
          onClick={() => setSelectedDayType("weekday")}
        >
          평일 평균 ({dayTypeCounts.weekdayDays}일)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={selectedDayType === "weekend"}
          className={`day-type-tab ${selectedDayType === "weekend" ? "active" : ""}`}
          onClick={() => setSelectedDayType("weekend")}
        >
          주말 피크 ({dayTypeCounts.weekendDays}일)
        </button>
      </div>

      <div className="capacity-grid">
        <article className="capacity-card">
          <div className="capacity-card-header">
            <span>주차 수용 및 만차 시점</span>
            <div className="card-header-actions">
              <em className={`kpi-badge ${parkingRate !== undefined && parkingRate >= 80 ? "kpi-badge-high" : "kpi-badge-medium"}`}>
                {parkingRate === undefined ? "입력 필요" : `점유율 ${parkingRate}%`}
              </em>
              {onOpenEvidence && (
                <EvidenceButton onClick={() => onOpenEvidence("parking-occupancy")} />
              )}
            </div>
          </div>
          <strong>{capacity.parkingFillTime}</strong>
          <small className="metric-trend">
            유입 추정 {capacity.estimatedVehicles.toLocaleString("ko-KR")}대 / 확보 수용 {capacity.providedParkingCapacity?.toLocaleString("ko-KR") ?? "입력 필요"}대
          </small>
        </article>

        <article className="capacity-card">
          <div className="capacity-card-header">
            <span>임시 화장실 수용 한계</span>
            <div className="card-header-actions">
              <em className={`kpi-badge ${restroomDeficit !== undefined && restroomDeficit > 0 ? "kpi-badge-high" : "kpi-badge-low"}`}>
                {restroomDeficit === undefined ? "입력 필요" : restroomDeficit > 0 ? `부족 ${restroomDeficit}칸` : "적정"}
              </em>
              {onOpenEvidence && (
                <EvidenceButton onClick={() => onOpenEvidence("restroom-capacity")} />
              )}
            </div>
          </div>
          <strong>{capacity.estimatedRestroomWaitMinutes === undefined ? "대기 시간 입력 필요" : `대기 약 ${capacity.estimatedRestroomWaitMinutes}분 예상`}</strong>
          <small className="metric-trend">
            필요 {capacity.requiredRestroomCount}칸 / 확보 {capacity.providedRestroomCount?.toLocaleString("ko-KR") ?? "입력 필요"}칸 (피크 250명당 1칸 가이드)
          </small>
        </article>

        <article className="capacity-card">
          <div className="capacity-card-header">
            <span>폐기물 배출 예측량</span>
            <div className="card-header-actions">
              <em className="kpi-badge kpi-badge-medium">
                총 {capacity.totalWasteTons}톤
              </em>
              {onOpenEvidence && (
                <EvidenceButton onClick={() => onOpenEvidence("waste-generation")} />
              )}
            </div>
          </div>
          <strong>일반 {capacity.generalWasteTons}톤 / 재활용 {capacity.recyclableWasteTons}톤</strong>
          <small className="metric-trend">
            방문객 1인당 0.4kg 배출 가이드라인 적용
          </small>
        </article>
      </div>
    </section>
  );
}
