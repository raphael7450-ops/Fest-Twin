import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { FestivalPlan, VenueAreaProvenance } from "../domain/types";
import {
  lookupCityParkCandidates,
  type CityParkCandidate,
} from "../services/cityParkAdapter";

interface VenueAreaReferenceProps {
  plan: FestivalPlan;
  onPlanChange: (plan: FestivalPlan) => void;
}

const sourceDataset = "전국도시공원정보표준데이터" as const;
const operatingBoundaryWarning =
  "공원 전체면적은 행사 운영 경계가 아니므로 보행로, 수면, 식재, 구조물, 제한구역 및 비행사 구역을 현장 또는 도면으로 확인해야 합니다.";

function isAbortError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "name" in error && error.name === "AbortError";
}

function createAppliedProvenance(candidate: CityParkCandidate): VenueAreaProvenance {
  return {
    origin: "public-data",
    sourceDataset,
    sourceRecordId: candidate.id,
    sourceParkName: candidate.name,
    referenceAreaSquareMeters: candidate.areaSquareMeters,
    managementOrganization: candidate.managementOrganization,
    referenceDate: candidate.referenceDate,
    appliedAt: new Date().toISOString(),
  };
}

function provenanceForManualValue(plan: FestivalPlan): VenueAreaProvenance {
  const existing = plan.venueAreaProvenance;
  if (existing?.origin === "public-data" || existing?.origin === "user-adjusted") {
    return { ...existing, origin: "user-adjusted", appliedAt: new Date().toISOString() };
  }
  return { origin: "user-input" };
}

export function VenueAreaReference({ plan, onPlanChange }: VenueAreaReferenceProps) {
  const [candidates, setCandidates] = useState<CityParkCandidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>();
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [retryToken, setRetryToken] = useState(0);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = ++requestIdRef.current;
    setStatus("loading");
    setCandidates([]);
    setSelectedCandidateId(undefined);

    lookupCityParkCandidates(
      {
        venueName: plan.name,
        venueAddress: plan.venueAddress,
        region: plan.region,
        coordinates: plan.venueCoordinates
          ? {
              latitude: plan.venueCoordinates.latitude,
              longitude: plan.venueCoordinates.longitude,
            }
          : undefined,
      },
      { signal: controller.signal },
    )
      .then((nextCandidates) => {
        if (controller.signal.aborted || requestIdRef.current !== requestId) return;
        setCandidates(nextCandidates);
        setSelectedCandidateId(nextCandidates[0]?.id);
        setStatus(nextCandidates.length > 0 ? "ready" : "empty");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || requestIdRef.current !== requestId || isAbortError(error)) return;
        setStatus("error");
      });

    return () => {
      controller.abort();
      if (requestIdRef.current === requestId) requestIdRef.current += 1;
    };
  }, [plan.name, plan.region, plan.venueAddress, plan.venueCoordinates?.latitude, plan.venueCoordinates?.longitude, retryToken]);

  const selectedCandidate = candidates.find((candidate) => candidate.id === selectedCandidateId) ?? candidates[0];

  const handleAreaChange = (value: string) => {
    if (!value.trim()) {
      onPlanChange({ ...plan, venueAreaSquareMeters: undefined, venueAreaProvenance: undefined });
      return;
    }

    const nextArea = Number(value);
    if (!Number.isFinite(nextArea) || nextArea <= 0) return;

    onPlanChange({
      ...plan,
      venueAreaSquareMeters: nextArea,
      venueAreaProvenance: provenanceForManualValue(plan),
    });
  };

  const handleApply = () => {
    if (!selectedCandidate) return;
    onPlanChange({
      ...plan,
      venueAreaSquareMeters: selectedCandidate.areaSquareMeters,
      venueAreaProvenance: createAppliedProvenance(selectedCandidate),
    });
  };

  return (
    <section className="venue-area-reference" aria-labelledby="venue-area-reference-title">
      <div className="venue-area-reference__heading">
        <div>
          <h3 id="venue-area-reference-title">행사장 면적</h3>
          <p>도시공원 전체면적을 참고하고 행사 운영 면적은 담당자가 확정합니다.</p>
        </div>
        <span className="venue-area-reference__status" aria-live="polite">
          {status === "loading" && "도시공원 조회 중"}
          {status === "ready" && `후보 ${candidates.length}건`}
          {status === "empty" && "일치하는 도시공원 정보 없음"}
          {status === "error" && "도시공원 조회에 실패했습니다."}
        </span>
      </div>

      <label>
        행사장 면적 (m²)
        <input
          type="number"
          min="1"
          value={plan.venueAreaSquareMeters ?? ""}
          onChange={(event) => handleAreaChange(event.target.value)}
        />
      </label>

      {status === "error" && (
        <button
          className="text-button venue-area-reference__retry"
          type="button"
          onClick={() => setRetryToken((value) => value + 1)}
          aria-label="도시공원 조회 다시 시도"
          title="도시공원 조회 다시 시도"
        >
          <RefreshCw size={15} aria-hidden="true" />
          다시 시도
        </button>
      )}

      {selectedCandidate && status === "ready" && (
        <div className="venue-area-reference__candidate">
          {candidates.length > 1 && (
            <label>
              도시공원 후보
              <select
                aria-label="도시공원 후보"
                value={selectedCandidate.id}
                onChange={(event) => setSelectedCandidateId(event.target.value)}
              >
                {candidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name} ({candidate.areaSquareMeters.toLocaleString("ko-KR")}m²)
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="venue-area-reference__candidate-summary">
            <strong>{selectedCandidate.name}</strong>
            <span>{selectedCandidate.type ?? "도시공원"}</span>
            {selectedCandidate.roadAddress && <span>{selectedCandidate.roadAddress}</span>}
            {selectedCandidate.lotAddress && <span>{selectedCandidate.lotAddress}</span>}
          </div>

          <dl className="venue-area-reference__metadata">
            <div>
              <dt>공원 전체면적 참고값</dt>
              <dd>{selectedCandidate.areaSquareMeters.toLocaleString("ko-KR")}m²</dd>
            </div>
            {selectedCandidate.managementOrganization && (
              <div>
                <dt>관리기관</dt>
                <dd>{selectedCandidate.managementOrganization}</dd>
              </div>
            )}
            {selectedCandidate.referenceDate && (
              <div>
                <dt>자료 기준일</dt>
                <dd>{selectedCandidate.referenceDate}</dd>
              </div>
            )}
            <div>
              <dt>출처 레코드</dt>
              <dd>{selectedCandidate.id}</dd>
            </div>
            <div>
              <dt>출처 데이터셋</dt>
              <dd>{sourceDataset}</dd>
            </div>
          </dl>

          <button className="secondary-button venue-area-reference__apply" type="button" onClick={handleApply}>
            행사장 면적으로 적용
          </button>
        </div>
      )}

      <p className="venue-area-reference__warning">{operatingBoundaryWarning}</p>
    </section>
  );
}
