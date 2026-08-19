import type { DwellProfile, FestivalPlan } from "../domain/types";
import type { TourApiAreaCode } from "../services/tourApiAdapter";
import { VenueAreaReference } from "./VenueAreaReference";

interface PlanFormProps {
  plan: FestivalPlan;
  onPlanChange: (plan: FestivalPlan) => void;
  areaCodes: TourApiAreaCode[];
  isAreaLoading: boolean;
  isCandidateLoading: boolean;
  candidateCount: number;
  selectedCandidateTitle?: string;
  onOpenCandidates: () => void;
  onOpenSearchModal?: () => void;
  dwellProfile: DwellProfile;
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
  onOpenSearchModal,
  dwellProfile,
}: PlanFormProps) {
  const regionOptions = areaCodes.some((area) => area.name === plan.region)
    ? areaCodes
    : [{ code: "selected-current-region", name: plan.region }, ...areaCodes];

  const candidateStatus = isCandidateLoading
    ? "TourAPI 후보 조회 중"
    : candidateCount > 0
      ? `TourAPI 후보 ${candidateCount}건`
      : "조회된 후보 없음";

  const hasOverrides =
    plan.averageDwellMinutes !== undefined ||
    plan.parkingCapacityVehicles !== undefined ||
    plan.restroomFixtureCount !== undefined;

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>축제 기획안 입력</h2>
        <span>지역 우선 조회</span>
      </div>

      <div className="tourapi-example-note" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
        <div>
          <strong>TourAPI 지역 기반 후보 조회</strong>
          <span>
            지역과 기간을 먼저 선택하거나, 전체 축제를 실시간 검색하여 기획안에 불러옵니다.
          </span>
        </div>
        {onOpenSearchModal && (
          <button
            type="button"
            className="secondary-button"
            style={{ whiteSpace: "nowrap", flexShrink: 0 }}
            onClick={onOpenSearchModal}
            aria-label="전체 축제 검색"
          >
            전체 축제 검색
          </button>
        )}
      </div>

      <div className="form-grid">
        <label>
          개최 지역
          {regionOptions.length > 0 ? (
            <select
              value={plan.region}
              onChange={(event) =>
                onPlanChange({ ...plan, region: event.target.value })
              }
            >
              {regionOptions.map((area) => (
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
              onPlanChange({
                ...plan,
                venueAddress: event.target.value,
                venueAreaSquareMeters: undefined,
                venueAreaProvenance: undefined,
              })
            }
          />
        </label>

        <VenueAreaReference plan={plan} onPlanChange={onPlanChange} />

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

      <div className="panel-heading" style={{ marginTop: "16px" }}>
        <h3>체류·시설 가정</h3>
      </div>
      <div className="form-grid">
        <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span>체류 프로필:</span>
          <strong>{dwellProfile.label}</strong>
          <span style={{ fontSize: "0.85em", color: "var(--text-secondary, #888)" }}>
            ({dwellProfile.sourceName})
          </span>
          {hasOverrides && (
            <button
              type="button"
              className="secondary-button"
              aria-label="자동값 복원"
              onClick={() =>
                onPlanChange({
                  ...plan,
                  averageDwellMinutes: undefined,
                  parkingCapacityVehicles: undefined,
                  restroomFixtureCount: undefined,
                })
              }
            >
              자동값 복원
            </button>
          )}
        </div>

        <label htmlFor="plan-dwell-minutes">
          평균 체류시간 (분)
          <input
            id="plan-dwell-minutes"
            type="number"
            min={30}
            max={720}
            step={30}
            value={plan.averageDwellMinutes ?? ""}
            placeholder={String(dwellProfile.averageMinutes)}
            onChange={(event) => {
              const raw = event.target.value;
              onPlanChange({
                ...plan,
                averageDwellMinutes: raw === "" ? undefined : Number(raw),
              });
            }}
          />
        </label>

        <label htmlFor="plan-parking-capacity">
          주차 수용 차량 수
          <input
            id="plan-parking-capacity"
            type="number"
            min={1}
            step={1}
            value={plan.parkingCapacityVehicles ?? ""}
            placeholder="미입력 시 기획 입력 필요"
            onChange={(event) => {
              const raw = event.target.value;
              onPlanChange({
                ...plan,
                parkingCapacityVehicles: raw === "" ? undefined : Number(raw),
              });
            }}
          />
        </label>

        <label htmlFor="plan-restroom-count">
          화장실 변기 수
          <input
            id="plan-restroom-count"
            type="number"
            min={1}
            step={1}
            value={plan.restroomFixtureCount ?? ""}
            placeholder="미입력 시 기획 입력 필요"
            onChange={(event) => {
              const raw = event.target.value;
              onPlanChange({
                ...plan,
                restroomFixtureCount: raw === "" ? undefined : Number(raw),
              });
            }}
          />
        </label>
      </div>
    </section>
  );
}
