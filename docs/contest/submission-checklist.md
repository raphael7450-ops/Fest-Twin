# Fest-Twin 최종 제출 및 시연 리허설 통합 체크리스트

Fest-Twin 프로젝트의 빌드, 단위 테스트, 원격 Docker 배포, API 헬스체크 및 시연 리허설 검증을 위한 통합 체크리스트입니다.

---

## 1. 코드 빌드 및 자동화 테스트 체크리스트

- [x] **단위 및 통합 테스트 통과**: `npm test` 실행 시 Vitest 21개 테스트 파일 84개 테스트 항목 100% 성공
- [x] **TypeScript 및 프로덕션 빌드**: `npm run build` 실행 시 tsc 및 vite bundle 정상 생성 (에러 없음)
- [x] **부하 테스트 검증**: `npm run test:load` 실행 시 일반 API TPS 1,000 req/s 이상, Rate Limiter 429 방어 및 캐시 히트 평균 0.58ms 통과 (`docs/LOAD_TEST_REPORT.md`)
- [x] **이모티콘 제한 준수**: 소스 코드, 스크립트, 배포 로그 및 Markdown 문서 전체 이모티콘 제거 완료 (`.agents/AGENTS.md`)

---

## 2. 배포 및 시스템 헬스체크

- [x] **원격 Docker 컨테이너 재배포**: `npm run deploy:remote` 실행 및 원격 서버(`192.168.55.223:18080`) 정상 구동
- [x] **4대 엔드포인트 헬스체크 (`npm run deploy:check`)**:
  - [x] `/api/scenarios` (HTTP 200)
  - [x] `/api/tour/area-code` (HTTP 200)
  - [x] `/api/scenarios/scen_sample_01` (HTTP 200)
  - [x] `/api/scenarios/share/token_gn_winter_2026` (HTTP 200)
- [x] **OWASP 보안 헤더 확인**: CSP, X-Frame-Options, X-Content-Type-Options 헤더 정상 응답
- [x] **GitHub Actions 파이프라인**: CI 파이프라인(`test-and-build`) 및 CD 구동 준비 완료

---

## 3. 시연 리허설 및 사용자 경험 검증

- [x] **3분 시연 동선 확보**: 기획안 입력 -> 지표 근거 드로어 확인 -> 20:00 피크 시간대 시뮬레이션 -> 시나리오 저장 및 공유 링크 복사 -> 보고서 출력 순서 검증 완료
- [x] **공유 링크 UX 검증**: 저장된 시나리오의 [공유 링크] 클릭 시 클립보드 복사 및 새 탭에서 즉시 열기 하이퍼링크 제공, 접속 시 복원 안내 배너 표시
- [x] **오버레이 렌더러 Fallback**: 네이버 지도 API 정상 오버레이 및 미연결 시 Canvas 렌더러 자동 전환 확인
- [x] **반응형 모바일 뷰어**: 가로 스크롤 넘침 및 텍스트 가림 현상 없음 확인
