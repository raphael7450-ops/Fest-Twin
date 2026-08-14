import type { FestivalPlan } from "../domain/types";

export const OPERATING_BOUNDARY_WARNING =
  "공원 전체면적은 행사 운영 경계가 아니므로 보행로, 수면, 식재, 구조물, 제한구역 및 비행사 구역을 현장 또는 도면으로 확인해야 합니다. 실제 행사 운영구역 검증 필요";

export function describeVenueArea(plan: FestivalPlan): {
  label: string;
  note: string;
  sourceParkName?: string;
  referenceDate?: string;
} {
  const provenance = plan.venueAreaProvenance;
  const label =
    provenance?.origin === "public-data"
      ? "전국도시공원정보표준데이터 참고값 적용"
      : provenance?.origin === "user-adjusted"
        ? "공공데이터 참고 후 사용자 조정"
        : "사용자 입력";

  return {
    label,
    note: OPERATING_BOUNDARY_WARNING,
    sourceParkName: provenance?.sourceParkName,
    referenceDate: provenance?.referenceDate,
  };
}
