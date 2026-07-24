/**
 * 파일 : src/components/FestivalCandidatePanel.tsx
 * 내용 : TourAPI 지역 기반 축제 검색 결과 및 후보 선택 슬라이딩 패널 컴포넌트
 * 수정 : 2026-07-24. 후보 선택 시 위치 좌표 및 기간 자동 적용 인터랙션 구현
 */

// TourAPI 축제 후보 모델 타입 불러오기
import type { FestivalCandidate } from "../services/tourApiAdapter";

// FestivalCandidatePanel 입력 프로퍼티(Props) 명세
interface FestivalCandidatePanelProps {
  isOpen: boolean; // 드로어 열림 상태 여부
  candidates: FestivalCandidate[]; // 조치된 TourAPI 축제 후보 배열
  isLoading: boolean; // 로딩 진행 중 여부
  errorMessage?: string; // 에러 메시지 (선택적)
  selectedCandidateId?: string; // 현재 선택된 후보 ID
  onClose: () => void; // 드로어 닫기 콜백
  onSelectCandidate: (candidate: FestivalCandidate) => void; // 후보 선택 이벤트 핸들러
}

// 축제 후보의 개최 기간 텍스트(시작일 ~ 종료일)를 포맷팅하는 헬퍼 함수
function periodLabel(candidate: FestivalCandidate) {
  if (candidate.startDate && candidate.endDate) {
    return `${candidate.startDate} ~ ${candidate.endDate}`;
  }

  return "기간 정보 없음";
}

// TourAPI 축제 후보 탐색 및 선택 슬라이딩 패널 컴포넌트
export function FestivalCandidatePanel({
  isOpen,
  candidates,
  isLoading,
  errorMessage,
  selectedCandidateId,
  onClose,
  onSelectCandidate,
}: FestivalCandidatePanelProps) {
  if (!isOpen) return null;

  return (
    <div className="candidate-drawer-layer">
      <button
        aria-label="TourAPI 후보 패널 닫기"
        className="candidate-drawer-backdrop"
        type="button"
        onClick={onClose}
      />
      <aside
        aria-label="TourAPI 축제 후보"
        aria-modal="true"
        className="candidate-drawer"
        role="dialog"
      >
        <div className="candidate-drawer-heading">
          <div>
            <p className="eyebrow">TourAPI</p>
            <h2>TourAPI 축제 후보</h2>
          </div>
          <button className="text-button" type="button" onClick={onClose}>
            닫기
          </button>
        </div>

        {isLoading ? (
          <div className="candidate-drawer-state">
            <strong>후보를 조회하고 있습니다.</strong>
            <span>지역과 기간 기준으로 실제 TourAPI 축제 데이터를 불러옵니다.</span>
          </div>
        ) : null}

        {!isLoading && errorMessage ? (
          <div className="candidate-drawer-state">
            <strong>후보 조회에 실패했습니다.</strong>
            <span>{errorMessage}</span>
          </div>
        ) : null}

        {!isLoading && !errorMessage && candidates.length === 0 ? (
          <div className="candidate-drawer-state">
            <strong>해당 조건의 후보가 없습니다.</strong>
            <span>현재 지역과 기간을 유지한 채 신규 기획안으로 계속 작성할 수 있습니다.</span>
          </div>
        ) : null}

        {!isLoading && candidates.length > 0 ? (
          <div className="candidate-list">
            {candidates.map((candidate) => {
              const isSelected = selectedCandidateId === candidate.id;

              return (
                <article
                  className={`candidate-card${isSelected ? " candidate-card-selected" : ""}`}
                  key={candidate.id}
                >
                  <div>
                    <span>
                      {candidate.searchScope === "annual-region"
                        ? "연간 지역 후보"
                        : "기간 일치 후보"}
                    </span>
                    <h3>{candidate.title}</h3>
                    <p>{candidate.address}</p>
                    <small>{periodLabel(candidate)}</small>
                  </div>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => onSelectCandidate(candidate)}
                  >
                    이 축제 선택
                  </button>
                </article>
              );
            })}
          </div>
        ) : null}
      </aside>
    </div>
  );
}
