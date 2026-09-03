/**
 * 파일 : src/services/simulation.ts
 * 내용 : 실제 행사장 면적 및 시설 배치 기반 군중 밀집도(명/m²) 시뮬레이션 엔진
 * 수정 : 2026-09-03. 실제 행사장 면적(m²) 기반 행안부 물리 밀도 및 시설 연계 병목 진단
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
import { occupancySeries } from "./visitorOccupancy";

const MAX_RELATIVE_DENSITY_SCORE = 100;
const DEFAULT_VENUE_AREA_SQM = 35000;

export function riskLevelFromRelativeDensityScore(relativeDensityScore: number): RiskLevel {
  if (relativeDensityScore >= 85) return "critical";
  if (relativeDensityScore >= 60) return "high";
  if (relativeDensityScore >= 30) return "medium";
  return "low";
}

export function riskLevelFromDensityPerSqm(densityPerSqm: number): RiskLevel {
  if (densityPerSqm >= 5.0) return "critical";
  if (densityPerSqm >= 3.0) return "high";
  if (densityPerSqm >= 1.5) return "medium";
  return "low";
}

function distanceToFacility(x: number, y: number, facility: VenueFacility) {
  const dx = x - facility.x;
  const dy = y - facility.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function findNearestFacility(x: number, y: number, facilities: VenueFacility[]): VenueFacility | undefined {
  if (facilities.length === 0) return undefined;
  let nearest = facilities[0];
  let minDistance = distanceToFacility(x, y, nearest);

  for (let i = 1; i < facilities.length; i += 1) {
    const dist = distanceToFacility(x, y, facilities[i]);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = facilities[i];
    }
  }
  return nearest;
}

export function createSimulation(
  plan: FestivalPlan,
  forecast: ForecastResult,
  hour: number,
): SimulationResult {
  const occupancyByHour = occupancySeries(forecast);
  const selectedHour = occupancyByHour.find((item) => item.hour === hour);
  const visitors = Math.max(selectedHour?.visitors ?? occupancyByHour[0]?.visitors ?? 0, 0);
  const expectedCapacity = Math.max(
    Number.isFinite(plan.expectedCapacity) ? plan.expectedCapacity : 0,
    1,
  );
  const gridWidth = Math.max(Number.isFinite(plan.gridWidth) ? Math.round(plan.gridWidth) : 0, 1);
  const gridHeight = Math.max(Number.isFinite(plan.gridHeight) ? Math.round(plan.gridHeight) : 0, 1);
  const totalCells = gridWidth * gridHeight;

  // 실제 행사장 면적(m²) 산출 및 셀당 단위 면적 계산
  const totalVenueAreaSqm =
    Number.isFinite(plan.venueAreaSquareMeters) && (plan.venueAreaSquareMeters ?? 0) > 0
      ? plan.venueAreaSquareMeters!
      : DEFAULT_VENUE_AREA_SQM;
  const cellAreaSquareMeters = totalVenueAreaSqm / totalCells;

  const activeProgramDraw = plan.programs
    .filter((program) => hour >= program.startHour && hour <= program.endHour)
    .reduce(
      (sum, program) => sum + (Number.isFinite(program.expectedDraw) ? program.expectedDraw : 0),
      0,
    );

  // 1단계: 각 셀의 시설 유인 가중치 계산
  const cellWeights: number[] = [];
  for (let y = 0; y < gridHeight; y += 1) {
    for (let x = 0; x < gridWidth; x += 1) {
      const attraction = plan.facilities.reduce((sum, facility) => {
        const distance = Math.max(distanceToFacility(x, y, facility), 0.8);
        const stageBoost = facility.type === "stage" ? 1 + activeProgramDraw / 220 : 1;
        return sum + (facility.weight * stageBoost) / (distance * distance);
      }, 0);
      cellWeights.push(1 + attraction);
    }
  }

  const totalWeight = cellWeights.reduce((sum, w) => sum + w, 0);

  // 2단계: 각 셀의 실제 인원 및 물리 밀도(명/m²) 산출
  const cells: HeatmapCell[] = [];
  let cellIndex = 0;

  for (let y = 0; y < gridHeight; y += 1) {
    for (let x = 0; x < gridWidth; x += 1) {
      const weight = cellWeights[cellIndex];
      cellIndex += 1;

      const cellVisitors = totalWeight > 0 ? (visitors * weight) / totalWeight : visitors / totalCells;
      const densityPerSqm = Number((cellVisitors / cellAreaSquareMeters).toFixed(2));

      // 행안부 기준 밀도 점수 (5명/m² 도달 시 85점 이상 critical)
      const densityScore = (densityPerSqm / 5.0) * 85;
      const capacityRatioScore = (visitors / expectedCapacity) * 42;

      const relativeDensityScore = clamp(
        Math.round(densityScore * 0.65 + capacityRatioScore * 0.35),
        0,
        MAX_RELATIVE_DENSITY_SCORE,
      );

      const level =
        densityPerSqm >= 5.0
          ? "critical"
          : densityPerSqm >= 3.0
            ? "high"
            : riskLevelFromRelativeDensityScore(relativeDensityScore);

      cells.push({
        x,
        y,
        relativeDensityScore,
        level,
        densityPerSqm,
      });
    }
  }

  // 3단계: 시설 명칭과 연계된 주요 병목 지점 도출
  const bottlenecks: Bottleneck[] = cells
    .filter((cell) => cell.level === "high" || cell.level === "critical")
    .sort((a, b) => b.relativeDensityScore - a.relativeDensityScore)
    .slice(0, 5)
    .map((cell, index) => {
      const nearest = findNearestFacility(cell.x, cell.y, plan.facilities);
      const facilityLabel = nearest ? `${nearest.name} 인근` : `${cell.x + 1}열 ${cell.y + 1}행`;

      return {
        id: `bn-${index + 1}`,
        label: facilityLabel,
        x: cell.x,
        y: cell.y,
        level: cell.level,
        reason: `${hour}:00 기준 예상 밀도 ${cell.densityPerSqm}명/m² (상대 혼잡 점수 ${cell.relativeDensityScore}점)로 인파 집중 주의가 필요합니다.`,
      };
    });

  const maxDensityPerSqm = cells.length > 0 ? Math.max(...cells.map((c) => c.densityPerSqm ?? 0)) : 0;
  const averageDensityPerSqm = Number((visitors / totalVenueAreaSqm).toFixed(2));

  return {
    hour,
    cells,
    bottlenecks,
    congestionScore: Math.round(
      cells.reduce((sum, cell) => sum + cell.relativeDensityScore, 0) / cells.length,
    ),
    maxDensityPerSqm,
    averageDensityPerSqm,
    cellAreaSquareMeters: Math.round(cellAreaSquareMeters),
  };
}
