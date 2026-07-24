/**
 * 파일 : src/components/SafetyLogisticsPanel.tsx
 * 내용 : 안전관리 요원, 의료진, 교통 위험도, 주차 수용성 4대 지표 패널 컴포넌트
 * 수정 : 2026-07-24. 4열/2열 대칭 그리드 규격화, word-break 음절 잘림 방지 및 근거 버튼 일치
 */

// 핵심 도메인 인터페이스 및 타입 정의 불러오기
import type {
  FestivalPlan, // 축제 기획안 모델
  ForecastResult, // 수요 예측 결과 모델
  MetricEvidenceId, // 근거 드로어 지표 식별자
  SimulationResult, // 96격자 군중 밀집 시뮬레이션 결과
  TrafficContext, // KTDB 도로 교통 정체 연동 맥락
} from "../domain/types";
// 안전관리 및 물류 수용성 지표 계산 비즈니스 함수 불러오기
import { createSafetyLogisticsMetrics } from "../services/impactMetrics";
// 산출 근거 보기 표준 버튼 컴포넌트 불러오기
import { EvidenceButton } from "./EvidenceButton";

// SafetyLogisticsPanel 입력 프로퍼티(Props) 명세
interface SafetyLogisticsPanelProps {
  plan: FestivalPlan; // 축제 기획안 데이터
  forecast: ForecastResult; // 수요 예측 데이터
  simulation: SimulationResult; // 피크 시간대 혼잡 시뮬레이션 결과
  traffic?: TrafficContext; // KTDB 교통량 데이터 (선택적)
  onOpenEvidence: (metricId: MetricEvidenceId) => void; // 근거 보기 클릭 핸들러
}

// 안전 및 물류 수용성 4대 카드를 렌더링하는 메인 UI 컴포넌트
export function SafetyLogisticsPanel({
  plan,
  forecast,
  simulation,
  traffic,
  onOpenEvidence,
}: SafetyLogisticsPanelProps) {
  // 행안부/소방청 가이드라인 및 KTDB 링크 정체 기반으로 안전/의료/교통/주차 4대 지표 산출
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
            <strong>{metrics.trafficRiskLabel}</strong>
            <small>
              {metrics.trafficRoadName} · {metrics.trafficRiskScore}점 · {metrics.trafficSourceLabel} ({metrics.trafficSourceStatusLabel})
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
              예상 차량 유입과 행사장 수용력 기반 사전 배치 검토값
            </small>
          </div>
        </article>
      </div>
    </section>
  );
}
