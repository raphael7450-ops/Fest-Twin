import type { FestivalPlan } from "../domain/types";

const operatingBoundaryNote =
  "공원 전체면적은 실제 행사 운영 경계가 아니므로 현장 확인 또는 도면 검토가 필요합니다.";

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
    note: operatingBoundaryNote,
    sourceParkName: provenance?.sourceParkName,
    referenceDate: provenance?.referenceDate,
  };
}
