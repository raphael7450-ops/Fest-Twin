# Fest-Twin 2026-09-21 서비스 완성 로드맵

## 제출 기준

- 1차 심사 자료 제출 마감: 2026년 9월 21일 월요일 16:00
- 제출 대상: 한국관광공사 OpenAPI를 필수 활용하여 개발 완료한 웹 서비스
- 제출 방식: 최종 서비스 URL과 기능설명서 제출
- 핵심 유의사항: OpenAPI 형태만 인정되며 파일 데이터만 사용한 구현은 인정되지 않음

## 제품화 목표

Fest-Twin은 지자체 축제 담당자가 지역과 기간을 선택해 한국관광공사 TourAPI 축제 후보를 조회하고, 선택한 축제를 기준으로 수요 예측, 혼잡도 시뮬레이션, 안전·물류 권고, 예산 대비 경제효과, 검색량 기반 사전 관심도 보정, 공유 링크, 제출용 보고서를 생성하는 B2G SaaS로 제출한다.

## 제출판 v1.0 기준선

| 구분 | 제출판 포함 여부 | 완료 기준 |
| :--- | :--- | :--- |
| TourAPI 축제 후보 조회 | 필수, 완료 | 지역·기간 선택 후 후보 목록 또는 Fallback 사유 표시 |
| TourAPI 상세·좌표 활용 | 필수, 완료 | 후보 선택 시 기획안과 지도 근거에 반영 |
| 선택 후보 기반 데이터 갱신 | 필수, 완료 | 후보 선택 시 TourAPI, 검색 관심도, 교통, 소비, KPI 근거가 같은 후보 계획 기준으로 갱신 |
| KPI 근거 매트릭스 | 필수, 완료 | KPI별 원본 데이터, 사용자 입력값, 산출값, 데이터 상태가 분리 표시 |
| Naver DataLab 검색량 | 필수 보조, 완료 | 사전 관심도 지수와 보정 계수 표시 |
| YouTube 검색 반응 | 제외 | v2 확장 후보로만 문서화, 제출판 완료 기능으로 표현하지 않음 |
| Instagram/X | 제외 | v2.0 확장 예정으로만 문서화 |
| 보고서 출력 | 필수, 완료 | 활용 API, 산출 근거, 한계, Fallback 상태 포함 |
| 공유 링크 복원 | 필수, 완료 | 저장된 시나리오가 `share_token`으로 복원되고 선택 TourAPI 기준을 보존 |
| 공개 URL | 필수 | 심사자가 별도 승인 없이 접속 가능 |

## 현재 진행 상태

| 단계 | 상태 | 산출물 |
| :--- | :--- | :--- |
| 1. KPI Evidence Matrix | 완료 | `docs/specs/kpi-evidence-matrix.md`, 데이터 상태 요약 UI, KPI 근거 테스트 |
| 2. Candidate-Driven Context Refresh | 완료 | `docs/specs/selected-festival-data-flow.md`, App/adapter 갱신 테스트 |
| 3. Public-Review Report Structure | 완료 | 심사용 보고서 섹션 재정렬, 출력/인쇄 품질 보강 |
| 4. Scenario Share Preservation | 완료 | 공유 링크 복원 시 선택 TourAPI 기준 유지 |
| 5. Health Check and Deploy Verification | 완료 | 배포 스모크 테스트와 공개 URL 검증 강화 |
| 6. Submission Package Refresh | 진행 중 | 기능설명서, 이미지, 제출 체크리스트 최종 동기화 |

## 주차별 일정

| 기간 | 목표 | 완료 기준 |
| :--- | :--- | :--- |
| 2026-07-28 - 2026-08-04 | 제출 기준 정렬 및 핵심 플로우 안정화 | 지역/기간 기반 TourAPI 조회, 후보 선택, KPI 갱신 정상 동작 |
| 2026-08-05 - 2026-08-18 | OpenAPI 활용 증빙과 검색량 지표 강화 | TourAPI 활용 내역, Naver DataLab 관심도, Fallback 상태가 화면과 문서에 표시 |
| 2026-08-19 - 2026-09-01 | 보고서·공유·운영 안정화 | 보고서 출력, `share_token` 복원, Docker 배포, 헬스체크 자동화 통과 |
| 2026-09-02 - 2026-09-14 | 제출 패키지 완성 | 기능설명서, 화면 이미지, URL, API 활용 증빙 문서 완료 |
| 2026-09-15 - 2026-09-21 | 최종 리허설 및 동결 | 공개 URL, TourAPI, Naver DataLab, 모바일/데스크톱, 장애 Fallback 최종 점검 |

## 최종 동결 체크

- 공개 URL 접속 가능
- TourAPI 실제 조회 또는 명확한 Fallback 상태 확인
- Naver DataLab 검색량 실제 조회 또는 명확한 Fallback 상태 확인
- 기능설명서 최신 화면 이미지 반영
- API 신청정보는 제출 양식에만 기재
- Git 저장소와 PDF에 비밀키 미포함
- 제출 전 `npm test`, `npm run build`, `npm run test:load`, `npm run deploy:check` 실행
