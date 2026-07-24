/**
 * 파일 : src/services/scenarioStorage.ts
 * 내용 : 축제 기획안 시나리오 브라우저 LocalStorage 기반 보관/복원/삭제 저장소 서비스
 * 수정 : 2026-07-24. 개인정보 수집 없는 로컬 저장소 시나리오 저장 관리자 구현
 */

import type { FestivalPlan } from "../domain/types";

const STORAGE_KEY = "fest-twin-scenarios";

export interface SavedScenario {
  id: string;
  name: string;
  savedAt: string;
  selectedHour: number;
  plan: FestivalPlan;
}

function readRawScenarios(): SavedScenario[] {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeScenarios(scenarios: SavedScenario[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
}

export function loadScenarios(): SavedScenario[] {
  return readRawScenarios();
}

export function saveScenario(
  plan: FestivalPlan,
  selectedHour: number,
): SavedScenario {
  const savedAt = new Date().toISOString();
  const scenario: SavedScenario = {
    id: `${Date.now()}-${plan.name}`,
    name: `${plan.name} / ${plan.totalBudgetMillionKrw}백만원 / ${plan.expectedCapacity.toLocaleString("ko-KR")}명`,
    savedAt,
    selectedHour,
    plan,
  };
  const scenarios = [scenario, ...readRawScenarios()].slice(0, 5);

  writeScenarios(scenarios);

  return scenario;
}

export function clearScenarios() {
  localStorage.removeItem(STORAGE_KEY);
}
