import type { FestivalPlan } from "../domain/types";
import type { TourApiAreaCode } from "../services/tourApiAdapter";

interface PlanFormProps {
  plan: FestivalPlan;
  onPlanChange: (plan: FestivalPlan) => void;
  areaCodes: TourApiAreaCode[];
  isAreaLoading: boolean;
  isCandidateLoading: boolean;
  candidateCount: number;
  selectedCandidateTitle?: string;
  onOpenCandidates: () => void;
}

export function PlanForm({
  plan,
  onPlanChange,
  areaCodes,
  isAreaLoading,
  isCandidateLoading,
  candidateCount,
  selectedCandidateTitle,
  onOpenCandidates,
}: PlanFormProps) {
  const candidateStatus = isCandidateLoading
    ? "TourAPI 후보 조회 중"
    : candidateCount > 0
      ? `TourAPI 후보 ${candidateCount}건`
      : "조회된 후보 없음";

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>축제 기획안 입력</h2>
        <span>지역 우선 조회</span>
      </div>

      <div className="tourapi-example-note">
        <strong>TourAPI 지역 기반 후보 조회</strong>
        <span>
          지역과 기간을 먼저 선택한 뒤 실제 TourAPI 축제 후보를 확인합니다.
        </span>
      </div>

      <div className="form-grid">
        <label>
          개최 지역
          {areaCodes.length > 0 ? (
            <select
              value={plan.region}
              onChange={(event) =>
                onPlanChange({ ...plan, region: event.target.value })
              }
            >
              {areaCodes.map((area) => (
                <option key={area.code} value={area.name}>
                  {area.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={plan.region}
              onChange={(event) =>
                onPlanChange({ ...plan, region: event.target.value })
              }
            />
          )}
        </label>

        <label>
          시작일
          <input
            type="date"
            value={plan.startDate}
            onChange={(event) =>
              onPlanChange({ ...plan, startDate: event.target.value })
            }
          />
        </label>

        <label>
          종료일
          <input
            type="date"
            value={plan.endDate}
            onChange={(event) =>
              onPlanChange({ ...plan, endDate: event.target.value })
            }
          />
        </label>

        <div className="candidate-lookup-card">
          <span>{isAreaLoading ? "지역 코드 조회 중" : candidateStatus}</span>
          <strong>{selectedCandidateTitle ?? plan.name}</strong>
          <button className="secondary-button" type="button" onClick={onOpenCandidates}>
            TourAPI 후보 보기
          </button>
        </div>

        <label>
          신규/선택 축제명
          <input
            value={plan.name}
            onChange={(event) => onPlanChange({ ...plan, name: event.target.value })}
          />
        </label>

        <label>
          행사장 주소
          <input
            value={plan.venueAddress}
            onChange={(event) =>
              onPlanChange({ ...plan, venueAddress: event.target.value })
            }
          />
        </label>

        <label>
          총 예산(백만원)
          <input
            min="1"
            type="number"
            value={plan.totalBudgetMillionKrw}
            onChange={(event) =>
              onPlanChange({
                ...plan,
                totalBudgetMillionKrw: Number(event.target.value),
              })
            }
          />
        </label>

        <label>
          예상 수용 인원
          <input
            min="1"
            type="number"
            value={plan.expectedCapacity}
            onChange={(event) =>
              onPlanChange({ ...plan, expectedCapacity: Number(event.target.value) })
            }
          />
        </label>
      </div>
    </section>
  );
}
