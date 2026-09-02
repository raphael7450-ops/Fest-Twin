import type { FestivalPlan } from "../domain/types";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import type { SavedScenario } from "../services/scenarioStorage";
import { createForecast } from "../services/forecast";
import { sampleTourismContext } from "../data/sampleTourApi";
import { sampleTrendContext } from "../data/sampleTrends";
import { sampleSpendingContext } from "../data/sampleSpending";
import { createSafetyDecisionProfiles, getDensityRiskStage } from "../services/safetyDecisionMetrics";
import { createSimulation } from "../services/simulation";
import {
  createSummaryKpiMetrics,
  createEconomicImpactMetrics,
} from "../services/impactMetrics";
import { formatDurationSecondsKorean } from "../utils/duration";

interface ScenarioComparisonModalProps {
  scenarioA: SavedScenario;
  scenarioB: SavedScenario;
  isOpen: boolean;
  onClose: () => void;
  onApplyScenario?: (scenario: SavedScenario) => void;
}

function formatKrw(value: number) {
  return `${(value || 0).toLocaleString("ko-KR")}원`;
}

function calculateScenarioMetrics(plan: FestivalPlan, hour: number) {
  const forecast = createForecast(plan, sampleTourismContext, sampleTrendContext);
  const simulation = createSimulation(plan, forecast, hour);
  const safety = createSafetyDecisionProfiles(plan, forecast, simulation).summary;
  const summaryKpi = createSummaryKpiMetrics(plan, forecast, simulation, sampleTourismContext, undefined, safety);
  const economic = createEconomicImpactMetrics(plan, forecast, sampleSpendingContext);

  return {
    forecast,
    simulation,
    safety,
    metrics: {
      summary: summaryKpi,
      economic,
    },
  };
}

export function ScenarioComparisonModal({
  scenarioA,
  scenarioB,
  isOpen,
  onClose,
  onApplyScenario,
}: ScenarioComparisonModalProps) {
  useBodyScrollLock(isOpen);

  if (!isOpen || !scenarioA || !scenarioB) return null;

  const dataA = calculateScenarioMetrics(scenarioA.plan, scenarioA.selectedHour || 20);
  const dataB = calculateScenarioMetrics(scenarioB.plan, scenarioB.selectedHour || 20);

  // 차이값 계산
  const visitorsDiff = dataB.forecast.expectedVisitors - dataA.forecast.expectedVisitors;
  const successScoreDiff = dataB.metrics.summary.successPotential.score - dataA.metrics.summary.successPotential.score;
  const staffingDiff = dataB.safety.staffing.recommended - dataA.safety.staffing.recommended;
  const budgetDiff = (scenarioB.plan.totalBudgetMillionKrw || 0) - (scenarioA.plan.totalBudgetMillionKrw || 0);
  const spendingDiff = dataB.metrics.economic.expectedLocalSpendingKrw - dataA.metrics.economic.expectedLocalSpendingKrw;

  const densityA = dataA.safety.peakDensity.status === "available" ? dataA.safety.peakDensity.value : null;
  const densityB = dataB.safety.peakDensity.status === "available" ? dataB.safety.peakDensity.value : null;
  const densityDiff = densityA !== null && densityB !== null ? densityB - densityA : null;

  const evacA = dataA.safety.evacuationTime.status === "available" ? dataA.safety.evacuationTime.value : null;
  const evacB = dataB.safety.evacuationTime.status === "available" ? dataB.safety.evacuationTime.value : null;
  const evacDiff = evacA !== null && evacB !== null ? evacB - evacA : null;

  const stageA = densityA !== null ? getDensityRiskStage(densityA) : null;
  const stageB = densityB !== null ? getDensityRiskStage(densityB) : null;

  return (
    <div
      className="scenario-comparison-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="시나리오 A/B 비교 분석"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        backgroundColor: "rgba(15, 23, 42, 0.8)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        className="scenario-comparison-card"
        style={{
          width: "100%",
          maxWidth: "1020px",
          maxHeight: "90vh",
          overflowY: "auto",
          backgroundColor: "#0f172a",
          border: "1px solid #334155",
          borderRadius: "12px",
          color: "#f8fafc",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          padding: "24px",
        }}
      >
        {/* 헤더 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            borderBottom: "1px solid #1e293b",
            paddingBottom: "16px",
            marginBottom: "20px",
          }}
        >
          <div>
            <span
              style={{
                fontSize: "0.78rem",
                fontWeight: 700,
                color: "#38bdf8",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              B2G Scenario Differential Analysis
            </span>
            <h2 style={{ margin: "4px 0 0", fontSize: "1.35rem", color: "#f8fafc" }}>
              시나리오 A/B 병렬 대조 비교 및 개선 효과 검증
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#1e293b",
              border: "1px solid #334155",
              color: "#cbd5e1",
              borderRadius: "6px",
              padding: "6px 12px",
              cursor: "pointer",
              fontSize: "0.85rem",
            }}
          >
            닫기
          </button>
        </div>

        {/* 시나리오 메타 배너 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            gap: "16px",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          {/* Plan A */}
          <div
            style={{
              backgroundColor: "#1e293b",
              border: "1px solid #3b82f6",
              borderRadius: "8px",
              padding: "14px 16px",
            }}
          >
            <span
              style={{
                fontSize: "0.72rem",
                color: "#93c5fd",
                fontWeight: 700,
                display: "inline-block",
                marginBottom: "4px",
              }}
            >
              기준안 (Plan A)
            </span>
            <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#ffffff" }}>
              {scenarioA.plan.name}
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "#94a3b8" }}>
              {scenarioA.plan.region} | {scenarioA.plan.startDate} ~ {scenarioA.plan.endDate}
            </p>
          </div>

          <div
            style={{
              textAlign: "center",
              fontWeight: 800,
              fontSize: "1.1rem",
              color: "#64748b",
            }}
          >
            VS
          </div>

          {/* Plan B */}
          <div
            style={{
              backgroundColor: "#1e293b",
              border: "1px solid #10b981",
              borderRadius: "8px",
              padding: "14px 16px",
            }}
          >
            <span
              style={{
                fontSize: "0.72rem",
                color: "#6ee7b7",
                fontWeight: 700,
                display: "inline-block",
                marginBottom: "4px",
              }}
            >
              비교/보강안 (Plan B)
            </span>
            <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#ffffff" }}>
              {scenarioB.plan.name}
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "#94a3b8" }}>
              {scenarioB.plan.region} | {scenarioB.plan.startDate} ~ {scenarioB.plan.endDate}
            </p>
          </div>
        </div>

        {/* 핵심 비교 지표 테이블 */}
        <div style={{ marginBottom: "24px" }}>
          <h4 style={{ margin: "0 0 12px", fontSize: "0.95rem", color: "#cbd5e1" }}>
            주요 안전·수요·재정 지표 비교 (Differential Matrix)
          </h4>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.88rem",
                textAlign: "left",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#1e293b", color: "#cbd5e1" }}>
                  <th style={{ padding: "10px 14px", borderBottom: "2px solid #334155" }}>항목</th>
                  <th style={{ padding: "10px 14px", borderBottom: "2px solid #334155" }}>기준안 (A)</th>
                  <th style={{ padding: "10px 14px", borderBottom: "2px solid #334155" }}>보강안 (B)</th>
                  <th style={{ padding: "10px 14px", borderBottom: "2px solid #334155" }}>차이값 (Diff)</th>
                  <th style={{ padding: "10px 14px", borderBottom: "2px solid #334155" }}>행정 평가</th>
                </tr>
              </thead>
              <tbody>
                {/* 1. 예상 방문객 */}
                <tr style={{ borderBottom: "1px solid #1e293b" }}>
                  <td style={{ padding: "10px 14px", fontWeight: 600 }}>총 예상 방문객</td>
                  <td style={{ padding: "10px 14px" }}>
                    {dataA.forecast.expectedVisitors.toLocaleString("ko-KR")}명
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    {dataB.forecast.expectedVisitors.toLocaleString("ko-KR")}명
                  </td>
                  <td
                    style={{
                      padding: "10px 14px",
                      color: visitorsDiff >= 0 ? "#38bdf8" : "#f87171",
                      fontWeight: 600,
                    }}
                  >
                    {visitorsDiff >= 0 ? `+${visitorsDiff.toLocaleString("ko-KR")}` : visitorsDiff.toLocaleString("ko-KR")}명
                  </td>
                  <td style={{ padding: "10px 14px", color: "#94a3b8" }}>
                    {visitorsDiff >= 0 ? "수요 확대 기대" : "수요 분산"}
                  </td>
                </tr>

                {/* 2. 흥행 점수 */}
                <tr style={{ borderBottom: "1px solid #1e293b" }}>
                  <td style={{ padding: "10px 14px", fontWeight: 600 }}>흥행 가능성 점수</td>
                  <td style={{ padding: "10px 14px" }}>
                    {dataA.metrics.summary.successPotential.score}점 ({dataA.metrics.summary.successPotential.grade})
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    {dataB.metrics.summary.successPotential.score}점 ({dataB.metrics.summary.successPotential.grade})
                  </td>
                  <td
                    style={{
                      padding: "10px 14px",
                      color: successScoreDiff >= 0 ? "#4ade80" : "#f87171",
                      fontWeight: 600,
                    }}
                  >
                    {successScoreDiff >= 0 ? `+${successScoreDiff}` : successScoreDiff}점
                  </td>
                  <td style={{ padding: "10px 14px", color: "#94a3b8" }}>
                    {successScoreDiff >= 0 ? "흥행 지수 개선" : "흥행 지수 하락"}
                  </td>
                </tr>

                {/* 3. 최고 밀집도 */}
                <tr style={{ borderBottom: "1px solid #1e293b" }}>
                  <td style={{ padding: "10px 14px", fontWeight: 600 }}>최고 인원 밀집도</td>
                  <td style={{ padding: "10px 14px" }}>
                    {densityA !== null ? `${densityA.toFixed(2)} 명/㎡` : "산출 불가"}
                    {stageA && (
                      <span
                        style={{
                          marginLeft: "6px",
                          fontSize: "0.75rem",
                          color: stageA.color,
                        }}
                      >
                        ({stageA.label.split(" ")[0]})
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    {densityB !== null ? `${densityB.toFixed(2)} 명/㎡` : "산출 불가"}
                    {stageB && (
                      <span
                        style={{
                          marginLeft: "6px",
                          fontSize: "0.75rem",
                          color: stageB.color,
                        }}
                      >
                        ({stageB.label.split(" ")[0]})
                      </span>
                    )}
                  </td>
                  <td
                    style={{
                      padding: "10px 14px",
                      color: densityDiff !== null ? (densityDiff <= 0 ? "#4ade80" : "#f87171") : "#94a3b8",
                      fontWeight: 600,
                    }}
                  >
                    {densityDiff !== null
                      ? `${densityDiff >= 0 ? "+" : ""}${densityDiff.toFixed(2)} 명/㎡`
                      : "-"}
                  </td>
                  <td style={{ padding: "10px 14px", color: "#94a3b8" }}>
                    {densityDiff !== null
                      ? densityDiff <= 0
                        ? "군중 밀집 완화"
                        : "밀집도 증가 (주의)"
                      : "-"}
                  </td>
                </tr>

                {/* 4. 피난 소요시간 */}
                <tr style={{ borderBottom: "1px solid #1e293b" }}>
                  <td style={{ padding: "10px 14px", fontWeight: 600 }}>비상 피난 소요시간</td>
                  <td style={{ padding: "10px 14px" }}>
                    {evacA !== null ? formatDurationSecondsKorean(evacA) : "산출 불가"}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    {evacB !== null ? formatDurationSecondsKorean(evacB) : "산출 불가"}
                  </td>
                  <td
                    style={{
                      padding: "10px 14px",
                      color: evacDiff !== null ? (evacDiff <= 0 ? "#4ade80" : "#f87171") : "#94a3b8",
                      fontWeight: 600,
                    }}
                  >
                    {evacDiff !== null
                      ? `${evacDiff >= 0 ? "+" : ""}${Math.round(evacDiff)}초`
                      : "-"}
                  </td>
                  <td style={{ padding: "10px 14px", color: "#94a3b8" }}>
                    {evacDiff !== null
                      ? evacDiff <= 0
                        ? "골든타임 단축 확보"
                        : "피난 지연 위험"
                      : "-"}
                  </td>
                </tr>

                {/* 5. 안전 요원 배치 */}
                <tr style={{ borderBottom: "1px solid #1e293b" }}>
                  <td style={{ padding: "10px 14px", fontWeight: 600 }}>권고 안전관리 인력</td>
                  <td style={{ padding: "10px 14px" }}>
                    {dataA.safety.staffing.recommended}명 (범위 {dataA.safety.staffing.min}~{dataA.safety.staffing.max}명)
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    {dataB.safety.staffing.recommended}명 (범위 {dataB.safety.staffing.min}~{dataB.safety.staffing.max}명)
                  </td>
                  <td
                    style={{
                      padding: "10px 14px",
                      color: staffingDiff >= 0 ? "#38bdf8" : "#fbbf24",
                      fontWeight: 600,
                    }}
                  >
                    {staffingDiff >= 0 ? `+${staffingDiff}` : staffingDiff}명
                  </td>
                  <td style={{ padding: "10px 14px", color: "#94a3b8" }}>
                    {staffingDiff >= 0 ? "안전 인력 보강" : "인력 효율화"}
                  </td>
                </tr>

                {/* 6. 총 예산 및 경제효과 */}
                <tr style={{ borderBottom: "1px solid #1e293b" }}>
                  <td style={{ padding: "10px 14px", fontWeight: 600 }}>총 예산 / 경제소비효과</td>
                  <td style={{ padding: "10px 14px" }}>
                    {scenarioA.plan.totalBudgetMillionKrw}백만원 / {formatKrw(dataA.metrics.economic.expectedLocalSpendingKrw)}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    {scenarioB.plan.totalBudgetMillionKrw}백만원 / {formatKrw(dataB.metrics.economic.expectedLocalSpendingKrw)}
                  </td>
                  <td
                    style={{
                      padding: "10px 14px",
                      color: spendingDiff >= 0 ? "#4ade80" : "#f87171",
                      fontWeight: 600,
                    }}
                  >
                    예산 {budgetDiff >= 0 ? `+${budgetDiff}` : budgetDiff}백만 / 소비 {spendingDiff >= 0 ? `+${formatKrw(spendingDiff)}` : formatKrw(spendingDiff)}
                  </td>
                  <td style={{ padding: "10px 14px", color: "#94a3b8" }}>
                    ROI: {dataB.metrics.economic.roiMultiplier.toFixed(1)}배 (A: {dataA.metrics.economic.roiMultiplier.toFixed(1)}배)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 하단 컨트롤 버튼 */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            borderTop: "1px solid #1e293b",
            paddingTop: "16px",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#1e293b",
              border: "1px solid #334155",
              color: "#cbd5e1",
              borderRadius: "6px",
              padding: "8px 16px",
              cursor: "pointer",
            }}
          >
            비교 창 닫기
          </button>
          {onApplyScenario && (
            <button
              type="button"
              onClick={() => {
                onApplyScenario(scenarioB);
                onClose();
              }}
              style={{
                background: "#2563eb",
                border: "none",
                color: "#ffffff",
                borderRadius: "6px",
                padding: "8px 16px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              보강안 (Plan B) 대시보드에 적용하기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
