/**
 * 파일 : src/services/simulation.ts
 * 내용 : 96개 격자 공간 기반 군중 밀집 위험 시뮬레이션 및 병목 구역 진단 엔진
 * 수정 : 2026-07-24. 피크 시간대 수용 인원 밀집도(명/m²) 및 밀집 위험 등급 계산
 */

// 96격자 시뮬레이션 관련 도메인 타입 정의 불러오기
import type {
  Bottleneck, // 병목 위험 구역 모델
  FestivalPlan, // 축제 기획안 모델
  ForecastResult, // 수요 예측 결과 모델
  HeatmapCell, // 히트맵 격자 셀 모델
  RiskLevel, // 위험 수준 등급 (low/medium/high/critical)
  SimulationResult, // 시뮬레이션 종합 결과 DTO
  VenueFacility, // 행사장 주요 시설 배치 모델
} from "../domain/types";
// 수치 범주 제한 클램프 헬퍼 함수 불러오기
import { clamp } from "./forecast";

const MAX_CELL_DENSITY_SCORE = 160;

// 격자 밀집 수치(명/m²)를 기준으로 위험 등급을 분류하는 헬퍼 함수
export function riskLevelFromDensity(density: number): RiskLevel {
  if (density >= 85) return "critical";
  if (density >= 60) return "high";
  if (density >= 30) return "medium";
  return "low";
}

// 특정 격자 셀(x, y)과 주요 행사장 시설간의 유클리드 거리를 계산하는 함수
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
        MAX_CELL_DENSITY_SCORE,
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
