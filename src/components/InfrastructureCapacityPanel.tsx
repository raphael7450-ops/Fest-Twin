import type { FestivalPlan, ForecastResult } from "../domain/types";
import { calculateInfrastructureCapacityForecast } from "../services/capacityAndSafetyForecast";

interface InfrastructureCapacityPanelProps {
  plan: FestivalPlan;
  forecast: ForecastResult;
}

export function InfrastructureCapacityPanel({
  plan,
  forecast,
}: InfrastructureCapacityPanelProps) {
  const capacity = calculateInfrastructureCapacityForecast(plan, forecast);

  return (
    <section className="panel capacity-panel" aria-label="[모델 1] 인프라 수용성 & 대기시간 예측">
      <div className="panel-heading">
        <div>
          <h2>인프라 수용성 & 대기시간 예측 모델</h2>
          <p>주차 만차 시점, 화장실 대기시간 및 쓰레기 발생량 사전 진단</p>
        </div>
        <span className="badge badge-info">모델 1 수용성</span>
      </div>

      <div className="capacity-grid">
        <article className="capacity-card">
          <div className="capacity-card-header">
            <span>주차 수용 및 만차 시점</span>
            <em className={`kpi-badge ${capacity.parkingPeakOccupancyRate >= 80 ? "kpi-badge-high" : "kpi-badge-medium"}`}>
              점유율 {capacity.parkingPeakOccupancyRate}%
            </em>
          </div>
          <strong>{capacity.parkingFillTime}</strong>
          <small className="metric-trend">
            유입 추정 {capacity.estimatedVehicles.toLocaleString("ko-KR")}대 / 확보 수용 {capacity.providedParkingCapacity.toLocaleString("ko-KR")}대
          </small>
        </article>

        <article className="capacity-card">
          <div className="capacity-card-header">
            <span>임시 화장실 수용 한계</span>
            <em className={`kpi-badge ${capacity.restroomDeficitCount > 0 ? "kpi-badge-high" : "kpi-badge-low"}`}>
              {capacity.restroomDeficitCount > 0 ? `부족 ${capacity.restroomDeficitCount}칸` : "적정"}
            </em>
          </div>
          <strong>대기 약 {capacity.estimatedRestroomWaitMinutes}분 예상</strong>
          <small className="metric-trend">
            필요 {capacity.requiredRestroomCount}칸 / 확보 {capacity.providedRestroomCount}칸 (피크 250명당 1칸 가이드)
          </small>
        </article>

        <article className="capacity-card">
          <div className="capacity-card-header">
            <span>폐기물 배출 예측량</span>
            <em className="kpi-badge kpi-badge-medium">
              총 {capacity.totalWasteTons}톤
            </em>
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
