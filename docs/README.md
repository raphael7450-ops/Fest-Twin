# Fest-Twin 프로젝트 기술 문서 종합 안내 (Technical Documentation Index)

지자체 축제 기획 사전 진단 및 디지털 트윈 시뮬레이션 B2G SaaS **Fest-Twin**의 시스템 명세, 아키텍처, 배포/운영 가이드 및 공모전 제출 서류 통합 인덱스 문서입니다.

---

## 1. 문서 전체 체계도 (Documentation Directory)

```
docs/
├── README.md                              # [본 문서] 기술 문서 종합 인덱스 가이드
├── LOAD_TEST_REPORT.md                    # 부하 테스트(k6-style) 성과 및 안정성 보고서
│
├── specs/                                 # 시스템 명세 및 아키텍처 스펙
│   ├── architecture-and-api.md            # 시스템 블록 아키텍처, 계층 설계 및 REST API 명세서
│   └── data-and-simulation-methodology.md # 3대 공공데이터 연동 수식, 디지털 트윈 시뮬레이션 및 보안 정책
│
├── guides/                                # 개발, 배포 및 시연 운영 가이드
│   ├── deployment-and-cicd.md             # 로컬 구동, 원격 Docker 배포 스크립트 및 GitHub Actions CI/CD
│   └── demo-and-operations.md             # 3분 핵심 시연 시나리오 스크립트 및 운영 런북
│
└── contest/                               # 공모전 제출 서류 및 최종 검증
    ├── submission-package.md              # 공모전 제출 요약, 카피라이팅 및 공고 대응 매트릭스
    └── submission-checklist.md            # 빌드, 테스트, 배포 헬스체크 및 시연 통합 체크리스트
```

---

## 2. 카테고리별 주요 문서 안내

### 2.1 시스템 명세 및 아키텍처 (`docs/specs/`)

- **[architecture-and-api.md](specs/architecture-and-api.md)**
  - React 18 / Vite 6 SPA 프론트엔드 및 Express 백엔드 전체 시스템 블록 다이어그램 기술
  - OWASP CSP 보안 헤더 및 2단계 계층형 Rate Limiter(분당 100회/30회) 설계
  - SQLite 시나리오 보관 및 공유 토큰(`share_token`) RESTful API 상세 규격 명세

- **[data-and-simulation-methodology.md](specs/data-and-simulation-methodology.md)**
  - 한국관광공사 TourAPI 4.0, 관광데이터랩 지출 객단가, 국가교통DB(KTDB View-T) 연동 방법론
  - 예상 방문객 수, 예상 경제 효과($E_{impact}$), 피크 시간대 혼잡 밀도($명/m^2$) 수식 및 시뮬레이션 알고리즘
  - 비식별화 개인정보 보호 정책 및 시스템 4단계 감사 로드맵

### 2.2 배포 및 운영 가이드 (`docs/guides/`)

- **[deployment-and-cicd.md](guides/deployment-and-cicd.md)**
  - 로컬 개발 환경 실행 및 네이버 지도 API Client ID 설정법
  - 원격 Docker 서버(`192.168.55.223:18080`) 원클릭 무중단 배포 스크립트 (`npm run deploy:remote`) 사용법
  - GitHub Actions 파이프라인 (`.github/workflows/deploy.yml`) 구성 및 헬스체크 타임아웃 재시도 처리

- **[demo-and-operations.md](guides/demo-and-operations.md)**
  - 3분 이내에 기획안 입력부터 수치 근거 확인, 피크 시간대 시뮬레이션, 공유 및 보고서 출력까지 보여주는 시연 스크립트
  - 지자체 시연 시 외부 API 지연 및 DB 오류 발생에 대비한 오버레이/LRU 캐시 Fallback 런북

### 2.3 공모전 제출 서류 및 검증 (`docs/contest/`)

- **[submission-package.md](contest/submission-package.md)**
  - 공모전 참가 요약 정보 및 핵심 서비스 소개 카피
  - 공모전 평가 항목별 Fest-Twin 구현 내용 1:1 대응 매트릭스

- **[submission-checklist.md](contest/submission-checklist.md)**
  - Vitest 84개 단위 테스트 및 빌드 검증 목록
  - 4대 REST API 엔드포인트 헬스체크 및 시연 준비 종합 체크리스트

### 2.4 성능 검증 보고서 (`docs/LOAD_TEST_REPORT.md`)

- **[LOAD_TEST_REPORT.md](LOAD_TEST_REPORT.md)**
  - Node.js 기반 k6-style 부하 테스트 수행 결과
  - 일반 API TPS 1,283.28 req/s 수용 및 429 Rate Limit 초과 차단 100% 방어
  - 인메모리 캐시 적용 시 Cache Hit 평균 응답 시간 0.58ms 달성 증빙

---

## 3. 빠른 시작 안내 (Quick Links)

- **원격 배포 실행**: `npm run deploy:remote`
- **배포 헬스체크 실행**: `npm run deploy:check`
- **단위 및 통합 테스트**: `npm test`
- **부하 테스트 실행**: `npm run test:load`
