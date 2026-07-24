/**
 * 파일 : src/services/simulation.ts
 * 내용 : 96개 격자 공간 기반 군중 밀집 위험 시뮬레이션 및 병목 구역 진단 엔진
 * 수정 : 2026-07-24. 피크 시간대 수용 인원 밀집도(명/m²) 및 밀집 위험 등급 계산
 */

import type {
  Bottleneck,
  FestivalPlan,
  ForecastResult,
  HeatmapCell,
  RiskLevel,
  SimulationResult,
  VenueFacility,
} from "../domain/types";
import { clamp } from "./forecast";

export function riskLevelFromDensity(density: number): RiskLevel {
  if (density >= 85) return "critical";
  if (density >= 60) return "high";
  if (density >= 30) return "medium";
  return "low";
}

function distanceToFacility(x: number, y: number, facility: VenueFacility) {
  const dx = x - facility.x;
  const dy = y - facility.y;

  return Math.sqrt(dx * dx + dy * dy);
}

export function createSimulation(
  plan: FestivalPlan,
  forecast: ForecastResult,
  hour: number,
): SimulationResult {
  const selectedHour = forecast.visitorsByHour.find((item) => item.hour === hour);
  const visitors = selectedHour?.visitors ?? forecast.visitorsByHour[0]?.visitors ?? 0;
  const activeProgramDraw = plan.programs
    .filter((program) => hour >= program.startHour && hour <= program.endHour)
    .reduce((sum, program) => sum + program.expectedDraw, 0);
  const cells: HeatmapCell[] = [];

  for (let y = 0; y < plan.gridHeight; y += 1) {
    for (let x = 0; x < plan.gridWidth; x += 1) {
      const attraction = plan.facilities.reduce((sum, facility) => {
        const distance = Math.max(distanceToFacility(x, y, facility), 0.8);
        const stageBoost = facility.type === "stage" ? 1 + activeProgramDraw / 220 : 1;

        return sum + (facility.weight * stageBoost) / (distance * distance);
      }, 0);
      const density = clamp(
        (visitors / plan.expectedCapacity) * 42 + attraction * 19,
        0,
        100,
      );

      cells.push({
        x,
        y,
        density: Math.round(density),
        level: riskLevelFromDensity(density),
      });
    }
  }

  const bottlenecks: Bottleneck[] = cells
    .filter((cell) => cell.level === "high" || cell.level === "critical")
    .sort((a, b) => b.density - a.density)
    .slice(0, 5)
    .map((cell, index) => ({
      id: `bn-${index + 1}`,
      label: `${cell.x + 1}열 ${cell.y + 1}행`,
      x: cell.x,
      y: cell.y,
      level: cell.level,
      reason: `${hour}:00 기준 밀집도 ${cell.density}로 병목 가능성이 높습니다.`,
    }));

  return {
    hour,
    cells,
    bottlenecks,
    congestionScore: Math.round(
      cells.reduce((sum, cell) => sum + cell.density, 0) / cells.length,
    ),
  };
}
