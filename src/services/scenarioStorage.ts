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
