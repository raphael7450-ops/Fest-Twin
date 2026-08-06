import { useState } from "react";
import { FESTIVAL_PRESETS, type FestivalPreset } from "../data/festivalPresets";

interface GovernmentHeaderProps {
  onSelectPreset?: (preset: FestivalPreset) => void;
  onTogglePresentationMode?: () => void;
  isPresentationMode?: boolean;
}

export function GovernmentHeader({
  onSelectPreset,
  onTogglePresentationMode,
  isPresentationMode = false,
}: GovernmentHeaderProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedPresetId(id);
    const found = FESTIVAL_PRESETS.find((p) => p.id === id);
    if (found && onSelectPreset) {
      onSelectPreset(found);
    }
  };

  return (
    <header className="government-header">
      <div className="government-header__brand">
        <span className="government-header__mark" aria-hidden="true">FT</span>
        <div className="government-header__content">
          <p className="eyebrow">B2G SaaS Control Center</p>
          <h1>페스트트윈(Fest-Twin)</h1>
          <p>
            지자체가 축제 예산 집행 전에 수요, 혼잡, 안전, 만족도 리스크를
            공공데이터와 시뮬레이션으로 검토하는 사전 진단 플랫폼입니다.
          </p>
        </div>
      </div>
      <div className="government-header__meta" aria-label="데모 검토 상태">
        <span className="status-pill">공공 검토 대시보드</span>
        <span>실데이터 우선</span>
        <div className="preset-selector-group">
          <label htmlFor="festival-preset-select" className="preset-select-label">
            대표 축제 프리셋:
          </label>
          <select
            id="festival-preset-select"
            className="preset-select-dropdown"
            value={selectedPresetId}
            onChange={handlePresetChange}
            aria-label="지자체 대표 축제 데이터 프리셋 선택"
          >
            <option value="" disabled>
              축제 프리셋 원클릭 로딩...
            </option>
            {FESTIVAL_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                [{preset.badgeLabel}] {preset.name} ({preset.region})
              </option>
            ))}
          </select>
        </div>

        <button
          className={`presentation-toggle-button ${isPresentationMode ? "presentation-toggle-button--active" : ""}`}
          type="button"
          onClick={onTogglePresentationMode}
          aria-label="관제 및 발표용 전체화면 프레젠테이션 모드 토글"
        >
          {isPresentationMode ? "관제 모드 종료" : "발표 모드 (전체화면)"}
        </button>

        <button
          className="print-button b2g-pdf-button"
          type="button"
          onClick={() => window.print()}
          aria-label="PDF 보고서 출력 및 다운로드"
        >
          PDF 보고서 출력
        </button>
      </div>
    </header>
  );
}
