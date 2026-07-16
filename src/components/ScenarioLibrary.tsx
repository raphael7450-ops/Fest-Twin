import { useState } from "react";
import type { FestivalPlan } from "../domain/types";
import {
  clearScenarios,
  loadScenarios,
  saveScenario,
  type SavedScenario,
} from "../services/scenarioStorage";

interface ScenarioLibraryProps {
  plan: FestivalPlan;
  selectedHour: number;
  onLoadScenario: (scenario: SavedScenario) => void;
}

export function ScenarioLibrary({
  plan,
  selectedHour,
  onLoadScenario,
}: ScenarioLibraryProps) {
  const [scenarios, setScenarios] = useState<SavedScenario[]>(() => loadScenarios());

  function handleSave() {
    const scenario = saveScenario(plan, selectedHour);
    setScenarios((current) => [scenario, ...current].slice(0, 5));
  }

  function handleClear() {
    clearScenarios();
    setScenarios([]);
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>시나리오 저장</h2>
        <span>브라우저 로컬 저장</span>
      </div>
      <div className="scenario-actions">
        <button className="secondary-button" type="button" onClick={handleSave}>
          시나리오 저장
        </button>
        <button
          className="text-button"
          type="button"
          onClick={handleClear}
          disabled={scenarios.length === 0}
        >
          모두 지우기
        </button>
      </div>
      {scenarios.length === 0 ? (
        <p className="muted scenario-empty">저장된 시나리오가 없습니다.</p>
      ) : (
        <ul className="scenario-list">
          {scenarios.map((scenario) => (
            <li key={scenario.id}>
              <button type="button" onClick={() => onLoadScenario(scenario)}>
                <strong>{scenario.name}</strong>
                <small>{scenario.selectedHour}:00 기준</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
