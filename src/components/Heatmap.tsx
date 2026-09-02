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

  return (
    <section className="panel heatmap-panel">
      <div className="panel-heading">
        <div className="panel-heading-title">
          <h2>공간 혼잡도 및 밀도 시뮬레이션</h2>
          <span className="source-tag">공간 격자 감쇠 모델</span>
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
            min={10}
            max={22}
            value={simulation.hour}
            onChange={(e) => onSelectHour(Number(e.target.value))}
            aria-label="시뮬레이션 시간대 변경"
          />
          <strong>{simulation.hour}:00</strong>
        </div>
      )}

      <div className="heatmap-summary-strip">
        <div className="summary-item">
          <span className="label">격자 크기</span>
          <strong className="val">{plan.gridWidth} × {plan.gridHeight}</strong>
        </div>
        <div className="summary-item">
          <span className="label">혼잡도 점수</span>
          <strong className="val">{simulation.congestionScore}점 (피크 상대점수 {maxScore})</strong>
        </div>
        <div className="summary-item">
          <span className="label">병목 지점</span>
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
            title={`상대 혼잡 점수 ${cell.relativeDensityScore}`}
          />
        ))}
      </div>

      <ul className="evidence-list heatmap-bottleneck-list" aria-label="병목 후보 설명">
        {simulation.bottlenecks.map((item) => (
          <li key={item.id}>
            {item.label}: {item.reason}
          </li>
        ))}
      </ul>
    </section>
  );
}

