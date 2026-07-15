import type { FestivalPlan } from "../domain/types";

interface PlanFormProps {
  plan: FestivalPlan;
  onPlanChange: (plan: FestivalPlan) => void;
}

export function PlanForm({ plan, onPlanChange }: PlanFormProps) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>축제 기획안 입력</h2>
        <span>개인정보 미수집</span>
      </div>
      <div className="form-grid">
        <label>
          축제명
          <input
            value={plan.name}
            onChange={(event) => onPlanChange({ ...plan, name: event.target.value })}
          />
        </label>
        <label>
          개최 지역
          <input
            value={plan.region}
            onChange={(event) =>
              onPlanChange({ ...plan, region: event.target.value })
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
