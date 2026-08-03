# Fest-Twin 최종 제출 및 시연 리허설 통합 체크리스트

Fest-Twin 프로젝트의 빌드, 단위 테스트, 원격 Docker 배포, API 헬스체크 및 시연 리허설 검증을 위한 통합 체크리스트입니다.

---

## 1. 코드 빌드 및 자동화 테스트 체크리스트

- [x] 단위 및 통합 테스트 통과: `npm test` 실행 시 Vitest 28개 테스트 파일 115개 테스트 항목 100% 성공
- [x] TypeScript 및 프로덕션 빌드: `npm run build` 실행 시 tsc 및 vite bundle 정상 생성 (에러 없음)
- [x] 부하 테스트 검증: `npm run test:load` 실행 시 일반 API TPS 571.27 req/s, Rate Limiter 429 방어 35회, 캐시 히트 평균 1.81ms 통과 (`docs/LOAD_TEST_REPORT.md`)
- [x] KPI 근거 매트릭스 검증: KPI별 `sourceDetails`, 데이터 상태 요약, 선택 TourAPI 기준 표시 테스트 통과
- [x] 선택 후보 기반 갱신 검증: TourAPI 후보 선택 후 trend, traffic, spending 로더가 후보 계획 기준으로 재호출되는 테스트 통과
- [x] 운영 검증 게이트 테스트: `scripts/deploy-check.test.js` 기준 공개 루트, 정적 번들, TourAPI 정상/fallback 응답, 시나리오 상세/공유 복원 검증 통과
- [x] 이모티콘 및 강조 제한 준수: 소스 코드, 스크립트, 배포 로그 및 Markdown 문서 전체 이모티콘 및 볼드 표기 제거 완료 (`.agents/AGENTS.md`)

---

## 2. 배포 및 시스템 헬스체크

- [x] 원격 서버 기존 배포 헬스체크: `npm run deploy:check` 기준 원격 서버(`192.168.55.223:18080`) 5개 운영 게이트 정상 응답 확인
- [ ] `codex/kpi-evidence-matrix` 브랜치 병합 후 원격 Docker 컨테이너 재배포 실행
- [x] 5대 운영 헬스체크 (`npm run deploy:check`) 기준:
  - [x] `/` 공개 루트 및 `/assets/*` 정적 번들 참조 asset 응답 확인
  - [x] `/api/scenarios` (HTTP 200)
  - [x] `/api/tour/area-code` (HTTP 200 또는 fallback-compatible error 허용)
  - [x] `/api/scenarios/scen_sample_01` (HTTP 200)
  - [x] `/api/scenarios/share/token_gn_winter_2026` (HTTP 200, legacy selectedFestivalBasis fallback-compatible 상태 확인)
- [x] OWASP 보안 헤더 확인: CSP, X-Frame-Options, X-Content-Type-Options 헤더 정상 응답
- [x] GitHub Actions 파이프라인: CI 파이프라인(`test-and-build`) 및 CD 구동 준비 완료

---

## 3. 시연 리허설 및 사용자 경험 검증

- [x] 3분 시연 동선 확보: 기획안 입력 -> 지표 근거 드로어 확인 -> 20:00 피크 시간대 시뮬레이션 -> 시나리오 저장 및 공유 링크 복사 -> 보고서 출력 순서 검증 완료
- [x] 공유 링크 UX 검증: 저장된 시나리오의 [공유 링크] 클릭 시 클립보드 복사 및 새 탭에서 즉시 열기 하이퍼링크 제공, 접속 시 복원 안내 배너 표시
- [x] 오버레이 렌더러 Fallback: 네이버 지도 API 정상 오버레이 및 미연결 시 Canvas 렌더러 자동 전환 확인
- [x] 반응형 모바일 뷰어: 가로 스크롤 넘침 및 텍스트 가림 현상 없음 확인

---

## 4. 2026년 9월 21일 제출 전 필수 확인

- [ ] 최종 서비스 URL이 별도 승인 절차 없이 접속 가능하다.
- [ ] 지역·기간 선택 후 한국관광공사 TourAPI 축제 후보 조회 흐름이 동작한다.
- [x] 후보 선택 시 기획안, 지도, KPI, 데이터 근거가 함께 갱신된다.
- [x] Naver DataLab 검색량 기반 사전 관심도 지표가 실제 조회 또는 Fallback 상태로 표시된다.
- [x] KPI별 원본 근거, 사용자 입력값, 산출값, 데이터 상태가 분리되어 표시된다.
- [x] 보고서에 활용 API명, 산출 근거, 데이터 해석 한계, Fallback 상태가 포함된다.
- [x] 기능설명서에 서비스명, 서비스 설명, 서비스 유형, 상세 기능, 활용 API, 관련 이미지가 포함되어 있다.
- [ ] TourAPI 신청정보와 인증키는 제출 양식에만 기재하고 Git 저장소와 PDF에는 기록하지 않는다.
- [ ] 파일 데이터만으로 구현된 서비스처럼 오해될 표현을 제거했다.
- [x] Instagram/X 실시간 연동은 v2.0 확장 예정으로만 표현한다.
- [ ] 제출 전 `npm test`, `npm run build`, `npm run test:load`, `npm run deploy:check`를 실행한다.

## TourAPI 운영계정 신청 체크

- [ ] 활용 어플 URL `https://cwserver.tail97dbc3.ts.net/` 접속 가능 여부를 확인한다.
- [ ] TourAPI 개발계정 호출 이력이 `areaCode2`, `searchFestival2`, `detailCommon2`, `locationBasedList2` 흐름으로 남는지 확인한다.
- [ ] 개발계정 제한인 오퍼레이션별 일 1,000건 트래픽을 초과하지 않도록 데모 시나리오를 관리한다.
- [ ] 운영계정은 한국관광공사 담당자 승인에 약 1~3일 소요될 수 있으므로 최종 제출 전 신청 일정을 확보한다.
- [ ] 운영계정 승인 후 활용기간 24개월 및 만료 시 연장신청 필요 문구를 운영 문서에 남긴다.
- [ ] 한국관광공사 TourAPI 4.0 출처 표기와 라이선스 표시 동의 내용을 대시보드/보고서에서 확인한다.
- [ ] TourAPI 서비스키가 Git, 브라우저 번들, 보고서, 화면 근거에 노출되지 않는지 확인한다.
