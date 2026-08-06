/**
 * 파일 : src/components/SelectedFestivalCard.tsx
 * 내용 : 선택된 TourAPI 축제 기본 정보 및 사진(대표 이미지) 대시보드 표출 컴포넌트
 * 수정 : 2026-08-05. 한국관광공사 TourAPI 4.0 기반 이미지, 주소, 기간, 운영시간 시각화
 */

import type { SelectedFestivalBasis } from "../domain/types";
import { getRepresentativeFestivalImage } from "../services/festivalImageProvider";

interface SelectedFestivalCardProps {
  selectedFestivalBasis?: SelectedFestivalBasis | null;
  onClearSelection?: () => void;
}

export function SelectedFestivalCard({
  selectedFestivalBasis,
  onClearSelection,
}: SelectedFestivalCardProps) {
  if (!selectedFestivalBasis) return null;

  return (
    <div
      className="selected-festival-card panel"
      style={{
        margin: "16px 24px 0 24px",
        padding: "16px",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        color: "#f8fafc",
        borderRadius: "10px",
        border: "1px solid #334155",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="badge badge-success" style={{ fontSize: "0.78rem" }}>
            한국관광공사 TourAPI 4.0 연동
          </span>
          <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#38bdf8" }}>
            [선택 축제] {selectedFestivalBasis.title}
          </h3>
        </div>
        {onClearSelection && (
          <button
            type="button"
            className="text-button"
            onClick={onClearSelection}
            style={{ color: "#cbd5e1", fontSize: "0.82rem", cursor: "pointer" }}
          >
            기본 기획안으로 변경
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-start" }}>
        {(() => {
          const displayImgUrl = getRepresentativeFestivalImage({
            title: selectedFestivalBasis.title,
            address: selectedFestivalBasis.address,
            existingImageUrl: selectedFestivalBasis.imageUrl,
          });

          return (
            <div style={{ flexShrink: 0, width: "160px", height: "110px", borderRadius: "6px", overflow: "hidden", border: "1px solid #475569" }}>
              <img
                src={displayImgUrl}
                alt={selectedFestivalBasis.title}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          );
        })()}

        <div style={{ flex: 1, minWidth: "260px" }}>
          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "8px 16px",
              margin: 0,
              fontSize: "0.88rem",
            }}
          >
            <div>
              <dt style={{ color: "#cbd5e1", fontSize: "0.78rem" }}>주최 / 주관</dt>
              <dd style={{ margin: 0, fontWeight: 600, color: "#38bdf8" }}>
                {selectedFestivalBasis.organizer || "해당 지자체 / 문화재단"}
              </dd>
            </div>
            <div>
              <dt style={{ color: "#cbd5e1", fontSize: "0.78rem" }}>축제 시간 (운영시간)</dt>
              <dd style={{ margin: 0, fontWeight: 600, color: "#facc15" }}>
                {selectedFestivalBasis.operatingTimeText || "10:00 ~ 22:00 (주간 및 야간 운영)"}
              </dd>
            </div>
            <div>
              <dt style={{ color: "#cbd5e1", fontSize: "0.78rem" }}>개최 기간</dt>
              <dd style={{ margin: 0, fontWeight: 600 }}>
                {selectedFestivalBasis.startDate} ~ {selectedFestivalBasis.endDate}
              </dd>
            </div>
            <div>
              <dt style={{ color: "#cbd5e1", fontSize: "0.78rem" }}>개최 장소 / 주소</dt>
              <dd style={{ margin: 0, fontWeight: 600 }}>{selectedFestivalBasis.address || "주소 미기재"}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
