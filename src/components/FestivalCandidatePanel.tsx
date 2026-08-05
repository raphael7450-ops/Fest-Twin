import type { FestivalCandidate } from "../services/tourApiAdapter";
import { sortFestivalCandidatesByDateAsc } from "../services/tourApiAdapter";

interface FestivalCandidatePanelProps {
  isOpen: boolean;
  candidates: FestivalCandidate[];
  isLoading: boolean;
  errorMessage?: string;
  selectedCandidateId?: string;
  onClose: () => void;
  onSelectCandidate: (candidate: FestivalCandidate) => void;
}

function periodLabel(candidate: FestivalCandidate) {
  if (candidate.startDate && candidate.endDate) {
    return `${candidate.startDate} ~ ${candidate.endDate}`;
  }

  return "기간 정보 없음";
}

function scopeLabel(candidate: FestivalCandidate) {
  if (candidate.searchScope === "annual-region") return "연간 지역 후보";
  if (candidate.searchScope === "regional-supplement") return "지역축제 보강 후보";
  return "기간 일치 후보";
}

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
            <span>지역과 기간 기준으로 TourAPI와 지역축제 보강 데이터를 확인합니다.</span>
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
            <span>현재 지역과 기간을 기준으로 신규 기획안을 계속 작성할 수 있습니다.</span>
          </div>
        ) : null}

        {!isLoading && candidates.length > 0 ? (
          <div className="candidate-list">
            {sortFestivalCandidatesByDateAsc(candidates).map((candidate) => {
              const isSelected = selectedCandidateId === candidate.id;

              return (
                <article
                  className={`candidate-card${isSelected ? " candidate-card-selected" : ""}`}
                  key={candidate.id}
                >
                  <div>
                    <span>{scopeLabel(candidate)}</span>
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
