/**
 * 파일 : src/components/ScenarioLibrary.tsx
 * 내용 : 저장된 축제 기획안 시나리오 목록 조회, 선택 복원 및 삭제 컨트롤 컴포넌트
 * 수정 : 2026-07-24. 브라우저 LocalStorage 기반 시나리오 저장/불러오기 인터랙션 구현
 */

// React 훅 및 타입 불러오기
import { useEffect, useState } from "react";
// 핵심 도메인 축제 기획안 타입 불러오기
import type { FestivalPlan, SelectedFestivalBasis } from "../domain/types";
// 서버 REST API 및 로컬 저장소 하이브리드 시나리오 저장소 서비스 불러오기
import {
  clearScenarios,
  deleteServerScenario,
  fetchServerScenarios,
  getShareUrl,
  loadScenarios,
  saveServerScenario,
  type SavedScenario,
} from "../services/scenarioStorage";
import { ScenarioComparisonModal } from "./ScenarioComparisonModal";

// ScenarioLibrary 입력 프로퍼티(Props) 명세
interface ScenarioLibraryProps {
  plan: FestivalPlan; // 현재 축제 기획안
  selectedHour: number; // 선택된 피크 시간대
  selectedFestivalBasis?: SelectedFestivalBasis | null; // 선택 TourAPI 축제 기준
  onLoadScenario: (scenario: SavedScenario) => void; // 시나리오 불러오기 콜백
}

// B2G 시나리오 서버 영속 관리 및 부서 공유 링크 복사 UI 컴포넌트
export function ScenarioLibrary({
  plan,
  selectedHour,
  selectedFestivalBasis,
  onLoadScenario,
}: ScenarioLibraryProps) {
  const [scenarios, setScenarios] = useState<SavedScenario[]>(() => loadScenarios());
  const [copyNotice, setCopyNotice] = useState<{ text: string; url?: string } | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  // 컴포넌트 마운트 시 서버 REST API 시나리오 목록 조회
  useEffect(() => {
    let active = true;
    fetchServerScenarios().then((list) => {
      if (active) {
        setScenarios((current) => [...list, ...current.filter((item) => !item.shareToken && !list.some((remote) => remote.id === item.id))]);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // 시나리오 저장 처리
  async function handleSave() {
    try {
      const saving = saveServerScenario(plan, selectedHour, selectedFestivalBasis);
      const local = loadScenarios();
      setScenarios((current) => [...local, ...current.filter((item) => item.shareToken && !local.some((saved) => saved.id === item.id))]);
      setCopyNotice({ text: "서버 저장 확인 중" });
      const saved = await saving;
      const updated = loadScenarios();
      setScenarios((current) => [...updated, ...current.filter((item) => item.shareToken && !updated.some((record) => record.id === item.id))]);
      setCopyNotice({ text: saved.shareToken
        ? "서버에 저장되었습니다. 공유 링크를 사용할 수 있습니다."
        : "서버 저장에 실패하여 이 브라우저에만 저장했습니다. 연결을 확인하고 다시 저장하세요." });
    } catch {
      setCopyNotice({ text: "저장하지 못했습니다. 브라우저 저장 공간과 연결 상태를 확인하세요." });
    }
  }

  // 시나리오 삭제 처리
  async function handleDelete(id: string, event: React.MouseEvent) {
    event.stopPropagation();
    if (!await deleteServerScenario(id)) {
      setCopyNotice({ text: "서버에서 삭제하지 못했습니다. 목록을 유지합니다. 다시 시도하세요." });
      return;
    }
    setScenarios((current) => current.filter((item) => item.id !== id));
    setCompareIds((current) => current.filter((item) => item !== id));
  }

  // 비교 선택 체인지 처리
  function handleToggleCompare(id: string) {
    setCompareIds((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }
      if (current.length >= 2) {
        return [current[1], id];
      }
      return [...current, id];
    });
  }

  // 공유 링크 클립보드 복사 및 즉시 이동 지원
  async function handleCopyShareLink(scenario: SavedScenario, event: React.MouseEvent) {
    event.stopPropagation();
    if (!scenario.shareToken) {
      setCopyNotice({ text: "이 브라우저 전용 기획안입니다. 서버 저장 후 공유할 수 있습니다." });
      return;
    }
    const url = getShareUrl(scenario);
    try {
      await navigator.clipboard.writeText(url);
      setCopyNotice({
        text: `부서 공유 링크가 클립보드에 복사되었습니다! (클릭 시 새 탭 이동)`,
        url,
      });
    } catch {
      setCopyNotice({
        text: `공유 링크 주소:`,
        url,
      });
    }
    setTimeout(() => setCopyNotice(null), 7000);
  }

  // 전체 지우기
  function handleClear() {
    clearScenarios();
    setScenarios((current) => current.filter((item) => item.shareToken));
    setCopyNotice({ text: "브라우저 저장본을 지웠습니다. 서버 기획안은 삭제하지 않았습니다." });
    setCompareIds([]);
    setIsCompareOpen(false);
  }

  const scenarioA = scenarios.find((s) => s.id === compareIds[0]);
  const scenarioB = scenarios.find((s) => s.id === compareIds[1]);

  return (
    <section className="panel scenario-library-panel">
      <div className="panel-heading">
        <div>
          <h2>시나리오 저장 및 부서 공유</h2>
          <span className="badge">서버 저장 및 브라우저 임시 보관</span>
        </div>
      </div>

      <div className="scenario-actions" style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <button className="primary-button" type="button" onClick={handleSave}>
          시나리오 저장
        </button>
        <button
          className="secondary-button"
          type="button"
          disabled={compareIds.length < 2}
          onClick={() => setIsCompareOpen(true)}
        >
          시나리오 A/B 비교 ({compareIds.length}/2)
        </button>
        <button
          className="text-button"
          type="button"
          onClick={handleClear}
          disabled={scenarios.length === 0}
        >
          브라우저 저장본 지우기
        </button>
      </div>

      {copyNotice && (
        <div
          className="notice-banner"
          style={{
            marginTop: "8px",
            padding: "8px 12px",
            background: "#e0f2fe",
            color: "#0369a1",
            borderRadius: "6px",
            fontSize: "0.85rem",
            wordBreak: "break-all",
          }}
        >
          <div>{copyNotice.text}</div>
          {copyNotice.url && (
            <div style={{ marginTop: "4px", fontWeight: "600" }}>
              링크:{" "}
              <a
                href={copyNotice.url}
                target="_blank"
                rel="noreferrer"
                style={{ color: "#0284c7", textDecoration: "underline" }}
              >
                {copyNotice.url} (새 탭에서 테스트 열기)
              </a>
            </div>
          )}
        </div>
      )}

      {isCompareOpen && scenarioA && scenarioB && (
        <ScenarioComparisonModal
          scenarioA={scenarioA}
          scenarioB={scenarioB}
          isOpen={isCompareOpen}
          onClose={() => setIsCompareOpen(false)}
          onApplyScenario={(scenario) => {
            onLoadScenario(scenario);
            setIsCompareOpen(false);
          }}
        />
      )}

      {scenarios.length === 0 ? (
        <p className="muted scenario-empty">저장된 시나리오가 없습니다.</p>
      ) : (
        <ul className="scenario-list">
          {scenarios.map((scenario) => (
            <li key={scenario.id} className="scenario-item">
              <div className="scenario-item-content">
                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    aria-label={`비교 선택 ${scenario.name}`}
                    checked={compareIds.includes(scenario.id)}
                    onChange={() => handleToggleCompare(scenario.id)}
                  />
                </label>
                <button type="button" className="scenario-load-btn" onClick={() => onLoadScenario(scenario)}>
                  <strong>{scenario.name}</strong>
                  <small>{scenario.selectedHour}:00 기준</small>
                </button>
                <div className="scenario-item-actions">
                  <button
                    className="secondary-button compact-btn"
                    type="button"
                    title="부서 공유 링크 복사"
                    onClick={(e) => handleCopyShareLink(scenario, e)}
                  >
                    공유 링크
                  </button>
                  <button
                    className="text-button danger-text"
                    type="button"
                    title="삭제"
                    onClick={(e) => handleDelete(scenario.id, e)}
                  >
                    삭제
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
