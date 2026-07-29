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
  saveScenario,
  saveServerScenario,
  type SavedScenario,
} from "../services/scenarioStorage";

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

  // 컴포넌트 마운트 시 서버 REST API 시나리오 목록 조회
  useEffect(() => {
    let active = true;
    fetchServerScenarios().then((list) => {
      if (active) {
        setScenarios(list);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // 시나리오 저장 처리
  async function handleSave() {
    const localSaved = saveScenario(plan, selectedHour, selectedFestivalBasis);
    setScenarios((current) => [localSaved, ...current.filter((item) => item.id !== localSaved.id)].slice(0, 10));
    setCopyNotice({ text: "시나리오가 저장되었습니다. 하단 목록의 [공유 링크]를 눌러 URL을 복사하거나 열 수 있습니다." });
    setTimeout(() => setCopyNotice(null), 4000);

    saveServerScenario(plan, selectedHour, selectedFestivalBasis).then((serverSaved) => {
      setScenarios((current) =>
        [serverSaved, ...current.filter((item) => item.id !== serverSaved.id && item.id !== localSaved.id)].slice(0, 10),
      );
    }).catch(() => {});
  }

  // 시나리오 삭제 처리
  async function handleDelete(id: string, event: React.MouseEvent) {
    event.stopPropagation();
    await deleteServerScenario(id);
    setScenarios((current) => current.filter((item) => item.id !== id));
  }

  // 공유 링크 클립보드 복사 및 즉시 이동 지원
  async function handleCopyShareLink(scenario: SavedScenario, event: React.MouseEvent) {
    event.stopPropagation();
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
    setScenarios([]);
  }

  return (
    <section className="panel scenario-library-panel">
      <div className="panel-heading">
        <div>
          <h2>시나리오 저장 및 부서 공유</h2>
          <span className="badge badge-success">SQLite 서버 영속 동기화</span>
        </div>
      </div>

      <div className="scenario-actions">
        <button className="primary-button" type="button" onClick={handleSave}>
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

      {scenarios.length === 0 ? (
        <p className="muted scenario-empty">저장된 시나리오가 없습니다.</p>
      ) : (
        <ul className="scenario-list">
          {scenarios.map((scenario) => (
            <li key={scenario.id} className="scenario-item">
              <div className="scenario-item-content">
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
