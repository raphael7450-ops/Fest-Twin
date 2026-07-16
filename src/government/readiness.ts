import type { GovernmentReadinessItem } from "../domain/types";
import { governmentStandards } from "./guidelines";

const evidenceByStandard: Record<
  string,
  Omit<GovernmentReadinessItem, "standardId" | "title">
> = {
  krds: {
    status: "반영",
    evidence:
      "업무형 대시보드와 입력-진단-시뮬레이션-리포트 흐름을 첫 화면에 배치합니다.",
    nextAction:
      "실제 KRDS 컴포넌트 적용 가능 여부를 디자인 단계에서 추가 검토합니다.",
  },
  "egov-quality": {
    status: "준비",
    evidence:
      "반응형 레이아웃, API 대체 흐름, 데이터 출처 표시를 구현 범위에 포함합니다.",
    nextAction:
      "브라우저 호환성, 접속성, 개방성 점검표를 실증 전 추가합니다.",
  },
  "kwcag-22": {
    status: "준비",
    evidence:
      "레이블이 있는 입력, 기본 select/input, 텍스트 상태 표시, 모바일 겹침 방지를 구현합니다.",
    nextAction: "키보드 탐색과 명도 대비 수동 점검을 데모 검증에 포함합니다.",
  },
  "public-saas": {
    status: "향후",
    evidence:
      "MVP는 단일 사용자 데모이며, 기관 계정·계약·운영 절차는 문서화합니다.",
    nextAction:
      "기관별 테넌트, 권한, 이용 로그, 운영 SLA를 실증 단계에서 설계합니다.",
  },
  csap: {
    status: "향후",
    evidence: "CSAP 인증 구현 전 단계이나 보안 확장 항목을 문서에 명시합니다.",
    nextAction:
      "공공 클라우드 배포 전 등급, 통제 항목, 보안 운영 절차를 검토합니다.",
  },
  privacy: {
    status: "반영",
    evidence:
      "MVP 입력 항목에서 실명, 연락처, 개인 위치 이력 등 개인정보를 제외합니다.",
    nextAction:
      "실증 단계에서 계정 기능 추가 시 개인정보 영향평가 대상 여부를 판단합니다.",
  },
  "public-data": {
    status: "반영",
    evidence:
      "TourAPI 출처와 샘플/캐시 대체 흐름을 데이터 근거 패널에 표시합니다.",
    nextAction: "실제 API 키 적용 시 호출 이력, 오류, 갱신 시점을 함께 기록합니다.",
  },
};

export function evaluateGovernmentReadiness(): GovernmentReadinessItem[] {
  return governmentStandards.map((standard) => ({
    standardId: standard.id,
    title: standard.title,
    ...evidenceByStandard[standard.id],
  }));
}
