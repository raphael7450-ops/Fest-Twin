/**
 * 파일 : src/components/FestivalSearchModal.tsx
 * 내용 : 전국 대표/인기 축제 통합 실시간 검색 모달 컴포넌트
 */

import { useState, useMemo } from "react";
import { FESTIVAL_PRESETS, type FestivalPreset } from "../data/festivalPresets";
import { getRepresentativeFestivalImage } from "../services/festivalImageProvider";

interface FestivalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (preset: FestivalPreset) => void;
}

export function FestivalSearchModal({
  isOpen,
  onClose,
  onSelectPreset,
}: FestivalSearchModalProps) {
  const [query, setQuery] = useState("");

  const filteredPresets = useMemo(() => {
    if (!query.trim()) {
      return FESTIVAL_PRESETS;
    }
    const q = query.trim().toLowerCase();
    return FESTIVAL_PRESETS.filter((preset) => {
      const titleMatch = preset.name.toLowerCase().includes(q) || preset.basis.title.toLowerCase().includes(q);
      const regionMatch = preset.region.toLowerCase().includes(q) || preset.plan.venueAddress.toLowerCase().includes(q);
      const keywordMatch = preset.plan.keywords.some((kw) => kw.toLowerCase().includes(q));
      const descriptionMatch = preset.description.toLowerCase().includes(q);
      return titleMatch || regionMatch || keywordMatch || descriptionMatch;
    });
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="candidate-drawer-layer">
      <button
        aria-label="축제 검색 창 닫기"
        className="candidate-drawer-backdrop"
        type="button"
        onClick={onClose}
      />
      <div
        aria-label="전국 대표 및 인기 축제 실시간 검색"
        aria-modal="true"
        className="candidate-drawer"
        role="dialog"
        style={{ width: "min(640px, 92vw)" }}
      >
        <div className="candidate-drawer-heading">
          <div>
            <p className="eyebrow">NATIONAL FESTIVAL DATABASE</p>
            <h2 style={{ fontSize: "1.25rem", margin: 0 }}>전국 대표 축제 실시간 검색</h2>
          </div>
          <button className="text-button" type="button" onClick={onClose}>
            닫기
          </button>
        </div>

        <div style={{ padding: "0 0 16px 0" }}>
          <div style={{ position: "relative" }}>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="축제명, 지역(보령, 부산, 대전, 서울, 세종...), 키워드(불꽃, 머드, 유등...) 검색"
              aria-label="축제 검색어 입력"
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #94a3b8",
                fontSize: "0.95rem",
                background: "#f8fafc",
                color: "#0f172a",
              }}
              autoFocus
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
          <span style={{ fontSize: "0.78rem", color: "#64748b", alignSelf: "center" }}>인기 순위:</span>
          {["보령 머드", "부산 불꽃", "진주 유등", "대전 0시", "서울 등빛", "세종", "전주 야행"].map((kw) => (
            <button
              key={kw}
              type="button"
              className="text-button"
              style={{ fontSize: "0.76rem", padding: "3px 10px", borderRadius: "20px", minHeight: "28px" }}
              onClick={() => setQuery(kw)}
            >
              #{kw}
            </button>
          ))}
        </div>

        <div className="candidate-list" style={{ maxHeight: "calc(100vh - 230px)", overflowY: "auto" }}>
          {filteredPresets.length === 0 ? (
            <div className="candidate-drawer-state">
              <strong>검색 결과가 없습니다.</strong>
              <span>'{query}' 검색어와 일치하는 프리셋 축제가 없습니다. 상단 주소 및 지역 입력으로 기획을 계속할 수 있습니다.</span>
            </div>
          ) : (
            filteredPresets.map((preset) => {
              const imgUrl = getRepresentativeFestivalImage({
                title: preset.name,
                region: preset.region,
                address: preset.plan.venueAddress,
                existingImageUrl: preset.basis.imageUrl,
              });

              return (
                <article
                  key={preset.id}
                  className="candidate-card"
                  style={{
                    display: "flex",
                    gap: "14px",
                    alignItems: "flex-start",
                    padding: "14px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    marginBottom: "10px",
                  }}
                >
                  <div style={{ width: "100px", height: "72px", borderRadius: "6px", overflow: "hidden", flexShrink: 0, border: "1px solid #e2e8f0" }}>
                    <img src={imgUrl} alt={preset.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                      <span className="badge badge-primary" style={{ fontSize: "0.72rem" }}>
                        {preset.badgeLabel}
                      </span>
                      <span style={{ fontSize: "0.78rem", color: "#64748b" }}>{preset.region}</span>
                    </div>

                    <h3 style={{ margin: "0 0 4px 0", fontSize: "1.05rem", color: "#0f172a" }}>
                      {preset.name}
                    </h3>
                    <p style={{ margin: "0 0 6px 0", fontSize: "0.82rem", color: "#475569" }}>
                      {preset.tagline}
                    </p>
                    <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                      목표 방문객: {(preset.targetVisitors / 10000).toLocaleString()}만 명 | 예산: {(preset.totalBudgetMillionKrw / 10).toLocaleString()}억 원
                    </div>
                  </div>

                  <button
                    className="secondary-button"
                    type="button"
                    data-testid="apply-preset-btn"
                    style={{ alignSelf: "center", flexShrink: 0, whiteSpace: "nowrap" }}
                    onClick={(e) => {
                      e.preventDefault();
                      onSelectPreset(preset);
                      onClose();
                    }}
                  >
                    이 축제로 기획 적용
                  </button>
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
