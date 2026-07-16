import type { GovernmentStandard } from "../domain/types";

export const governmentStandards: GovernmentStandard[] = [
  {
    id: "krds",
    title: "디지털 정부서비스 UI/UX 가이드라인(KRDS)",
    source: "https://www.krds.go.kr",
    purpose:
      "공공서비스 이용자가 업무 흐름을 쉽게 이해하고 일관된 화면에서 과업을 완료하도록 한다.",
    designRule:
      "첫 화면은 업무형 대시보드로 구성하고, 입력-진단-리포트 흐름을 명확히 노출한다.",
  },
  {
    id: "egov-quality",
    title: "전자정부 웹사이트 품질관리 지침",
    source: "https://www.mois.go.kr",
    purpose:
      "전자정부 웹사이트의 접근성, 호환성, 개방성, 접속성, 편의성, 효율성, 신뢰성을 관리한다.",
    designRule:
      "반응형 UI, API 장애 대체 흐름, 명확한 데이터 기준 시점과 품질 상태를 표시한다.",
  },
  {
    id: "kwcag-22",
    title: "한국형 웹 콘텐츠 접근성 지침 2.2",
    source: "https://a11ykr.github.io/kwcag22/",
    purpose:
      "장애인과 고령자를 포함한 사용자가 동등하게 콘텐츠를 인식하고 조작하도록 한다.",
    designRule:
      "모든 입력에 레이블을 제공하고, 키보드 조작 가능한 기본 컨트롤과 텍스트 기반 상태 정보를 사용한다.",
  },
  {
    id: "public-saas",
    title: "공공부문 SaaS 이용 가이드라인",
    source: "https://www.digitalmarket.kr",
    purpose:
      "국가기관, 지자체, 공공기관이 SaaS를 안전하고 효율적으로 이용하도록 한다.",
    designRule:
      "기관 도입 검토에 필요한 권한, 로그, 데이터 보관, 계약·운영 검토 항목을 문서화한다.",
  },
  {
    id: "csap",
    title: "클라우드 보안인증제(CSAP) 준비성",
    source: "https://saas.go.kr",
    purpose: "공공 클라우드 서비스의 보안 통제와 인증 가능성을 검토한다.",
    designRule:
      "MVP에서는 인증을 구현하지 않되, 기관 분리, 감사 로그, 권한, 데이터 삭제 정책을 확장 설계에 포함한다.",
  },
  {
    id: "privacy",
    title: "개인정보 보호 및 개인정보 영향평가",
    source: "https://www.pipc.go.kr",
    purpose:
      "개인정보 수집을 최소화하고 공공서비스 영향평가 필요성을 판단한다.",
    designRule:
      "MVP는 개인정보를 수집하지 않고 축제 기획 데이터와 비식별 공공·트렌드 데이터만 사용한다.",
  },
  {
    id: "public-data",
    title: "공공데이터 이용정책",
    source: "https://www.data.go.kr",
    purpose:
      "공공데이터 활용 출처, 기준 시점, API 장애 대응을 투명하게 제공한다.",
    designRule:
      "TourAPI 사용 위치, 샘플/캐시 대체 여부, 데이터 출처를 화면과 리포트에 표시한다.",
  },
];
