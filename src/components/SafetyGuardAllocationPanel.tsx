import type {
  FestivalPlan,
  ForecastResult,
  SimulationResult,
} from "../domain/types";
import { calculateSafetyGuardAllocationForecast } from "../services/capacityAndSafetyForecast";

interface SafetyGuardAllocationPanelProps {
  plan: FestivalPlan;
  forecast: ForecastResult;
  simulation: SimulationResult;
}

export function SafetyGuardAllocationPanel({
  plan,
  forecast,
  simulation,
}: SafetyGuardAllocationPanelProps) {
  const safety = calculateSafetyGuardAllocationForecast(plan, forecast, simulation);

  const goldenMinutes = Math.floor(safety.evacuationGoldenTimeSeconds / 60);
  const goldenSeconds = safety.evacuationGoldenTimeSeconds % 60;

  return (
    <section className="panel safety-allocation-panel" aria-label="[모델 2] 인파 사고 리스크 & 안전요원 배치 모델">
      <div className="panel-heading">
        <div>
          <h2>인파 사고 리스크 & 구역별 안전요원 배치 모델</h2>
          <p>구역별 추천 배치 인원, 의료 지원 및 비상 탈출 골든타임 진단</p>
        </div>
        <span className="badge badge-warning">모델 2 안전배치</span>
      </div>

      <div className="safety-metrics-grid">
        <article className="safety-summary-card">
          <span>총 추천 안전관리요원</span>
          <strong>{safety.totalRecommendedGuards}명</strong>
          <small>행안부 인파 안전관리 지침 반영 수치</small>
        </article>

        <article className="safety-summary-card">
          <span>예상 응급환자 / 의료 지원</span>
          <strong>시간당 {safety.expectedMedicalIncidentsPerHour}건</strong>
          <small>추천 의료진 {safety.recommendedMedicalStaff}명 / 구급차 {safety.recommendedAmbulances}대</small>
        </article>

        <article className="safety-summary-card">
          <span>비상 탈출 골든타임</span>
          <strong>{goldenMinutes}분 {goldenSeconds}초 ({safety.evacuationStatus})</strong>
          <small>100m 비상 동선 탈출 예상 시간</small>
        </article>
      </div>

      <div className="zone-allocation-table-wrapper">
        <h3>구역별 안전요원 추천 배치 명세</h3>
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
                    {zone.priority === "high" ? "상 (필수)" : "중 (권고)"}
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
