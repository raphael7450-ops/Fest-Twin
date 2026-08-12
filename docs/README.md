# Fest-Twin 프로젝트 기술 문서 종합 안내 (Technical Documentation Index)

지자체 축제 기획 사전 진단 및 디지털 트윈 시뮬레이션 B2G SaaS Fest-Twin의 시스템 명세, 아키텍처, 배포/운영 가이드 및 공모전 제출 서류 통합 인덱스 문서입니다.

---

## 1. 문서 전체 체계도 (Documentation Directory)

```
docs/
|-- README.md                              # [본 문서] 기술 문서 종합 인덱스 가이드
|-- CHANGELOG.md                           # v2.2.0 변경 내역 및 해결 갭 정리
|-- HANDOVER_SUMMARY.md                    # 인수인계 및 최신 작업 내역 정리
|-- LOAD_TEST_REPORT.md                    # 부하 테스트(k6-style) 성과 및 안정성 보고서
|-- PROJECT_COMPREHENSIVE_AUDIT.md         # 시스템 전수 진단 및 고도화 보고서 (v2.2.0 반영)
|-- PROJECT_GAP_ANALYSIS_REPORT.md         # B2G 갭 분석 및 이행 현황 보고서
|-- UI_UX_EVALUATION_REPORT.md             # UI/UX 및 디자인 시스템 종합 감리 보고서
|-- DATA_RELIABILITY_REPORT.md             # 공공데이터 연동 신뢰성 및 Fallback 진단서
|-- PHASE2_ROADMAP_PLAN.md                 # 2단계 기능 고도화 로드맵
|
|-- specs/                                 # 시스템 명세 및 아키텍처 스펙
|   |-- architecture-and-api.md            # 시스템 블록 아키텍처, 계층 설계 및 REST API 명세서
|   |-- data-and-simulation-methodology.md # 3대 공공데이터 연동 수식, 디지털 트윈 시뮬레이션 및 보안 정책
|   |-- kpi-evidence-matrix.md             # KPI 지표 근거 매트릭스
|   |-- selected-festival-data-flow.md     # 선택 축제 데이터 흐름, 중복 제거 및 TourAPI 연동 명세
|   |-- hourly-demand-profile.md           # 시간대별 수요 프로파일 산출 명세
|   |-- demand-backdata-relevance.md       # 지역 수요 백데이터 관련성 진단
|   `-- viewt-od-traffic-evidence.md       # View-T OD 교통량 근거 명세
|
|-- guides/                                # 개발, 배포 및 시연 운영 가이드
|   |-- deployment-and-cicd.md             # 로컬 구동, 원격 Docker 배포 스크립트 및 GitHub Actions CI/CD
|   `-- demo-and-operations.md             # 3분 핵심 시연 시나리오 스크립트 및 운영 런북
|
|-- compliance/                            # B2G 규정 준수 및 보안 인증 서류
|   |-- DATA_LINEAGE_AND_GLOSSARY.md       # 데이터 라인지 및 행정 표준용어집
|   |-- OWASP_TOP10_CHECKLIST.md           # OWASP Top 10 보안 점검표
|   |-- PII_ZERO_INVENTORY.md              # 개인정보 미수집(PII Zero) 증빙표
|   `-- SECURITY_REMEDIATION_LOG.md        # 보안 취약점 조치 결과서
|
|-- operations/                            # 운영 및 관리 런북
|   |-- AIR_GAP_RUNBOOK.md                 # 완전 폐쇄망(Air-Gap) 구동 런북
|   `-- BACKUP_RESTORE_POLICY.md           # DB 및 감사로그 백업/복구 정책
|
`-- contest/                               # 공모전 제출 서류 및 최종 검증
    |-- submission-package.md              # 공모전 제출 요약, 카피라이팅 및 공고 대응 매트릭스
    |-- submission-checklist.md            # 빌드, 테스트, 배포 헬스체크 및 시연 통합 체크리스트
    |-- feature-description.md             # 핵심 기능 상세 설명서
    |-- openapi-usage-evidence.md          # 공공 OpenAPI 활용 증빙서
    |-- selected-festival-evidence.md      # 선택 축제 공공데이터 증빙서
    `-- september-service-roadmap.md       # 서비스 확장 로드맵
```

---

## 2. 카테고리별 주요 문서 안내

### 2.1 시스템 명세 및 아키텍처 (`docs/specs/`)

- [architecture-and-api.md](specs/architecture-and-api.md)
  - React 18 / Vite 6 SPA 프론트엔드 및 Express 백엔드 전체 시스템 블록 다이어그램 기술
  - OWASP CSP 보안 헤더 및 2단계 계층형 Rate Limiter(분당 300회/120회) 설계
  - 현재 시나리오 저장은 `JSON ?뚯씪 ??μ냼`(JSON 파일 저장소)이며 PostgreSQL은 Phase 2 전환 계획

- [data-and-simulation-methodology.md](specs/data-and-simulation-methodology.md)
  - 한국관광공사 TourAPI 4.0, 관광데이터랩 지출 객단가, 국가교통DB(KTDB View-T) 연동 방법론
  - 예상 방문객 수, 예상 경제 효과, 피크 시간대 혼잡 밀도(명/m²) 수식 및 시뮬레이션 알고리즘
  - 비식별화 개인정보 보호 정책 및 시스템 4단계 감사 로드맵

- [selected-festival-data-flow.md](specs/selected-festival-data-flow.md)
  - 전국 대표 축제 베이스 키 정규화 및 연도별 중복 데이터 제거 파이프라인
  - 지역별 맞춤 주변 관광지 보강 데이터 생성기 연동 명세

### 2.2 배포 및 운영 가이드 (`docs/guides/`)

- [deployment-and-cicd.md](guides/deployment-and-cicd.md)
  - 로컬 개발 환경 실행 및 네이버 지도 API Client ID 설정법
  - 원격 Docker 서버(100.104.94.112:18080) 원클릭 무중단 배포 스크립트 (`npm run deploy:remote`) 사용법
  - GitHub Actions 파이프라인 (`.github/workflows/deploy.yml`) 구성 및 헬스체크 타임아웃 재시도 처리

- [demo-and-operations.md](guides/demo-and-operations.md)
  - 3분 이내에 기획안 입력부터 수치 근거 확인, 피크 시간대 시뮬레이션, 공유 및 보고서 출력까지 보여주는 시연 스크립트
  - 지자체 시연 시 외부 API 지연 및 DB 오류 발생에 대비한 오버레이/LRU 캐시 Fallback 런북

### 2.3 공모전 제출 서류 및 검증 (`docs/contest/`)

- [submission-package.md](contest/submission-package.md)
  - 공모전 참가 요약 정보 및 핵심 서비스 소개 카피
  - 공모전 평가 항목별 Fest-Twin 구현 내용 1:1 대응 매트릭스

- [submission-checklist.md](contest/submission-checklist.md)
  - 빌드, 테스트, 배포 헬스체크 및 시연 준비 검증 목록
  - 5대 REST API 엔드포인트 헬스체크 및 시연 준비 종합 체크리스트

### 2.4 진단 및 변경 내역 (`docs/CHANGELOG.md` 등)

- [CHANGELOG.md](CHANGELOG.md)
  - v2.2.0 신규 기능 및 개선 사항 (전국 5,700여 건 축제 DB 연동, 중복 데이터 제거, 지역별 맞춤 관광지 Fallback, 상태 반응성 자동화 테스트)

- [DATA_RELIABILITY_REPORT.md](DATA_RELIABILITY_REPORT.md)
  - 단일 분석 스냅샷, 출력 수치 일관성, 데이터셋 상태, 물리 지표 산출 조건 점검

- [PROJECT_COMPREHENSIVE_AUDIT.md](PROJECT_COMPREHENSIVE_AUDIT.md)
  - 시스템 전수 진단 및 우선순위별 고도화 과제 통합 보고서 (v2.2.0 반영)

- [PROJECT_GAP_ANALYSIS_REPORT.md](PROJECT_GAP_ANALYSIS_REPORT.md)
  - B2G 갭 분석 보고서 및 이행 현황 정리

- [UI_UX_EVALUATION_REPORT.md](UI_UX_EVALUATION_REPORT.md)
  - UI/UX 디자인 시스템 종합 감리 보고서

---

## 3. 빠른 시작 안내 (Quick Links)

- 원격 배포 실행: `npm run deploy:remote`
- 배포 헬스체크 실행: `npm run deploy:check`
- 단위 및 통합 테스트: `npm test`
- 축제 전환 반응성 테스트: `npx vitest run tests/festivalSwitch.test.ts`
- 부하 테스트 실행: `npm run test:load`
- OpenAPI 신뢰도 진단: `node --experimental-vm-modules scripts/api-reliability-check.js`
- 문서 로컬 링크 검사: `npm run test:docs`

현재 구현의 저장소는 JSON 파일 저장소입니다. PostgreSQL은 Phase 2 고도화 범위이며 현재 운영 저장소로 설명하지 않습니다. 물리 밀도는 행사장 면적이 없으면, 대피 시간은 총 출구 폭 또는 피난 거리가 없으면 `산출 불가`입니다.
