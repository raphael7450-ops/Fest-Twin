import type { FestivalPlan, MetricEvidenceId, SimulationResult } from "../domain/types";
import { EvidenceButton } from "./EvidenceButton";

interface HeatmapProps {
  plan: FestivalPlan;
  simulation: SimulationResult;
  onOpenEvidence?: (metricId: MetricEvidenceId) => void;
  onSelectHour?: (hour: number) => void;
}

export function Heatmap({
  plan,
  simulation,
  onOpenEvidence,
  onSelectHour,
}: HeatmapProps) {
  const maxScore = Math.max(0, ...simulation.cells.map((c) => c.relativeDensityScore));
  const venueAreaText = plan.venueAreaSquareMeters
    ? `${plan.venueAreaSquareMeters.toLocaleString()}m²`
    : simulation.venueAreaSquareMeters
      ? `${simulation.venueAreaSquareMeters.toLocaleString()}m²(추정)`
      : "35,000m²(기준)";
  const cellAreaText = simulation.cellAreaSquareMeters
    ? `셀당 약 ${simulation.cellAreaSquareMeters}m²`
    : `${plan.gridWidth} × ${plan.gridHeight}`;
  const maxDensityText =
    simulation.maxDensityPerSqm !== undefined ? `${simulation.maxDensityPerSqm}명/m²` : "-";

  const minHour =
    plan.operatingHours && plan.operatingHours.length > 0 ? plan.operatingHours[0] : 10;
  const maxHour =
    plan.operatingHours && plan.operatingHours.length > 0
      ? plan.operatingHours[plan.operatingHours.length - 1]
      : 22;

  return (
    <section className="panel heatmap-panel">
      <div className="panel-heading">
        <div className="panel-heading-title">
          <h2>공간 혼잡도 및 밀도 시뮬레이션</h2>
          <span className="source-tag">실제 행사장 면적·격자 감쇠 모델</span>
        </div>
        <div className="panel-heading-actions">
          <span className="confidence-pill">{simulation.hour}:00 기준</span>
          {onOpenEvidence && (
            <EvidenceButton onClick={() => onOpenEvidence("peak-density")} />
          )}
        </div>
      </div>

      {onSelectHour && (
        <div className="heatmap-time-slider-row">
          <label htmlFor="heatmap-hour-slider">시뮬레이션 시간대 선택:</label>
          <input
            id="heatmap-hour-slider"
            type="range"
            min={minHour}
            max={maxHour}
            value={simulation.hour}
            onChange={(e) => onSelectHour(Number(e.target.value))}
            aria-label="시뮬레이션 시간대 변경"
          />
          <strong>{simulation.hour}:00</strong>
        </div>
      )}

      <div className="heatmap-summary-strip">
        <div className="summary-item">
          <span className="label">행사장 면적</span>
          <strong className="val">{venueAreaText}</strong>
          <small style={{ fontSize: "0.72rem", color: "#64748b" }}>{cellAreaText}</small>
        </div>
        <div className="summary-item">
          <span className="label">최대 군중 밀도</span>
          <strong className="val" style={{ color: simulation.maxDensityPerSqm && simulation.maxDensityPerSqm >= 5 ? "#dc2626" : undefined }}>
            {maxDensityText}
          </strong>
          <small style={{ fontSize: "0.72rem", color: "#64748b" }}>행안부 기준(5명/m² 초과 시 위험)</small>
        </div>
        <div className="summary-item">
          <span className="label">혼잡도 점수</span>
          <strong className="val">{simulation.congestionScore}점 (피크 {maxScore})</strong>
        </div>
        <div className="summary-item">
          <span className="label">병목 후보</span>
          <strong className="val">{simulation.bottlenecks.length}개소</strong>
        </div>
      </div>

      <div
        className="heatmap"
        role="grid"
        aria-label="혼잡도 시뮬레이션 격자"
        style={{ gridTemplateColumns: `repeat(${plan.gridWidth}, 1fr)` }}
      >
        {simulation.cells.map((cell) => (
          <div
            aria-label={`${cell.x + 1}열 ${cell.y + 1}행 상대 혼잡 점수 ${cell.relativeDensityScore}, 위험 ${cell.level}`}
            className={`heat-cell heat-${cell.level}`}
            key={`${cell.x}-${cell.y}`}
            title={`상대 혼잡도 ${cell.relativeDensityScore}점${cell.densityPerSqm !== undefined ? ` | 예상 밀도 ${cell.densityPerSqm}명/m²` : ""} (${cell.level})`}
          />
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "6px 0", fontSize: "0.76rem", color: "#64748b" }}>
        <span>밀도 범례 (행안부 안전관리 기준):</span>
        <div style={{ display: "flex", gap: "10px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: "10px", height: "10px", background: "#3b82f6", borderRadius: "2px", display: "inline-block" }} /> 원활 (&lt;1.5명/m²)
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: "10px", height: "10px", background: "#eab308", borderRadius: "2px", display: "inline-block" }} /> 주의 (1.5~3명)
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: "10px", height: "10px", background: "#f97316", borderRadius: "2px", display: "inline-block" }} /> 위험 (3~5명)
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: "10px", height: "10px", background: "#ef4444", borderRadius: "2px", display: "inline-block" }} /> 심각 (≥5명)
          </span>
        </div>
      </div>

      <div style={{ minHeight: "80px" }}>
        {simulation.bottlenecks.length > 0 ? (
          <ul className="evidence-list heatmap-bottleneck-list" aria-label="병목 후보 설명" style={{ margin: 0 }}>
            {simulation.bottlenecks.map((item) => (
              <li key={item.id}>
                <strong>{item.label}</strong>: {item.reason}
              </li>
            ))}
          </ul>
        ) : (
          <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "6px", color: "#64748b", fontSize: "0.85rem", textAlign: "center" }}>
            {simulation.hour}:00 시점에는 행안부 관리 기준을 초과하는 고위험 병목 구역이 감지되지 않았습니다.
          </div>
        )}
      </div>
    </section>
  );
}
