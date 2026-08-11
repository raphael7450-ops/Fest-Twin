import type { FestivalPlan, SimulationResult } from "../domain/types";

interface HeatmapProps {
  plan: FestivalPlan;
  simulation: SimulationResult;
}

export function Heatmap({ plan, simulation }: HeatmapProps) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>혼잡도 시뮬레이션</h2>
        <span>{simulation.hour}:00 기준</span>
      </div>
      <div
        className="heatmap"
        role="grid"
        aria-label="혼잡도 시뮬레이션 격자"
        style={{ gridTemplateColumns: `repeat(${plan.gridWidth}, 1fr)` }}
      >
        {simulation.cells.map((cell) => (
          <div
            aria-label={`${cell.x + 1}열 ${cell.y + 1}행 밀집도 ${cell.density}, 위험 ${cell.level}`}
            className={`heat-cell heat-${cell.level}`}
            key={`${cell.x}-${cell.y}`}
            title={`밀집도 ${cell.density}`}
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
