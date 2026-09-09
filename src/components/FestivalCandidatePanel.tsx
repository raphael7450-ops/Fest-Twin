import type { FestivalCandidate } from "../services/tourApiAdapter";
import { sortFestivalCandidatesByDateAsc } from "../services/tourApiAdapter";
import { useEffect, useRef, useState } from "react";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";

interface FestivalCandidatePanelProps {
  isOpen: boolean;
  candidates: FestivalCandidate[];
  isLoading: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  selectedCandidateId?: string;
  applyingCandidateId?: string | null;
  onClose: () => void;
  onSelectCandidate: (candidate: FestivalCandidate) => void;
}

function periodLabel(candidate: FestivalCandidate) {
  if (candidate.dateStatus === "needs-review") return candidate.periodLabel ?? "일정 확인 필요";
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
  onRetry,
  selectedCandidateId,
  applyingCandidateId,
  onClose,
  onSelectCandidate,
}: FestivalCandidatePanelProps) {
  useBodyScrollLock(isOpen);
  const [query, setQuery] = useState("");
  const [reviewOnly, setReviewOnly] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement as HTMLElement | null;
    setQuery("");
    setReviewOnly(false);
    searchRef.current?.focus();
    return () => { if (opener?.isConnected) opener.focus(); };
  }, [isOpen]);

  if (!isOpen) return null;
  const reviewCount = candidates.filter((item) => item.dateStatus === "needs-review").length;
  const search = query.trim().toLocaleLowerCase();
  const visibleCandidates = sortFestivalCandidatesByDateAsc(candidates.filter((item) =>
    (item.dateStatus === "needs-review") === reviewOnly &&
    `${item.title} ${item.address}`.toLocaleLowerCase().includes(search),
  ));

  return (
    <div className="candidate-drawer-layer">
      <button
        aria-label="TourAPI 후보 패널 닫기"
        className="candidate-drawer-backdrop"
        tabIndex={-1}
        type="button"
        onClick={onClose}
      />
      <aside
        aria-label="TourAPI 축제 후보"
        aria-modal="true"
        className="candidate-drawer"
        role="dialog"
        onKeyDown={(event) => {
          if (event.key === "Escape") { event.preventDefault(); onClose(); }
          if (event.key !== "Tab") return;
          const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), a[href], [tabindex="0"]',
          ));
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }}
      >
        <div className="candidate-drawer-heading">
          <div>
            <h2>축제 후보</h2>
          </div>
          <button className="text-button" type="button" onClick={onClose}>
            닫기
          </button>
        </div>
        <div className="candidate-toolbar">
          <input ref={searchRef} type="search" aria-label="축제명 또는 장소 검색"
            placeholder="축제명 또는 장소 검색" value={query} onChange={(event) => setQuery(event.target.value)} />
          <div className="candidate-filters" role="group" aria-label="일정 확인 상태">
            <button type="button" aria-pressed={!reviewOnly} onClick={() => setReviewOnly(false)}>선택 가능 {candidates.length - reviewCount}</button>
            <button type="button" aria-pressed={reviewOnly} onClick={() => setReviewOnly(true)}>일정 확인 필요 {reviewCount}</button>
          </div>
        </div>
        <div className="candidate-results" aria-busy={isLoading}>

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
            {onRetry ? <button type="button" onClick={onRetry}>다시 조회</button> : null}
          </div>
        ) : null}

        {!isLoading && !errorMessage && candidates.length === 0 ? (
          <div className="candidate-drawer-state">
            <strong>해당 조건의 후보가 없습니다.</strong>
            <span>현재 지역과 기간을 기준으로 신규 기획안을 계속 작성할 수 있습니다.</span>
          </div>
        ) : null}

        {!isLoading && !errorMessage && candidates.length > 0 && visibleCandidates.length === 0 ? (
          <p role="status">{search ? "검색 결과가 없습니다." : reviewOnly ? "일정 확인이 필요한 후보가 없습니다." : "선택 가능한 후보가 없습니다."}</p>
        ) : null}
        {!isLoading && !errorMessage && visibleCandidates.length > 0 ? (
          <div className="candidate-list">
            {visibleCandidates.map((candidate) => {
              const isSelected = selectedCandidateId === candidate.id;
              const isApplying = applyingCandidateId === candidate.id;

              return (
                <article
                  className={`candidate-card${isSelected ? " candidate-card-selected" : ""}`}
                  key={candidate.id}
                >
                  <div className="candidate-card-content">
                    {candidate.imageUrl?.startsWith("http") ? <img className="candidate-photo" src={candidate.imageUrl} alt="" loading="lazy" /> : null}
                    <span>{scopeLabel(candidate)}</span>
                    <h3>{candidate.title}</h3>
                    <p>{candidate.address}</p>
                    <small>{periodLabel(candidate)}</small>
                    {candidate.scheduleSourceUrl ? <p><a href={candidate.scheduleSourceUrl} target="_blank" rel="noopener noreferrer">공식 일정 출처</a></p> : null}
                  </div>
                  <button
                    className="secondary-button"
                    disabled={Boolean(applyingCandidateId) || candidate.dateStatus === "needs-review"}
                    type="button"
                    onClick={() => candidate.dateStatus !== "needs-review" && onSelectCandidate(candidate)}
                  >
                    {isApplying ? "적용 중" : candidate.dateStatus === "needs-review" ? "일정 확인 필요" : "이 축제 선택"}
                  </button>
                </article>
              );
            })}
          </div>
        ) : null}
        </div>
      </aside>
    </div>
  );
}
