# Fest-Twin 문서 체계 안내 (Documentation Sitemap)

본 디렉터리는 **Fest-Twin(페스트트윈)** 프로젝트의 제출 서류, 개발/운영 가이드, 서비스 및 데이터 산출 명세를 관리합니다.

---

## 디렉터리 구성

```text
docs/
├── contest/    # 공모전 제출 및 평가 심사 관련 서류
├── guides/     # 개발자, 배포자 및 운영 시연 가이드
└── specs/      # 기능 명세, 데이터 분석 방법론 및 플로우
```

---

## 1. 공모전 제출 관련 문서 (`docs/contest/`)

평가위원 및 제출용 최종 패키지 서류입니다.

* **[final-submission-package.md](contest/final-submission-package.md)**: Fest-Twin 최종 제출 패키지 메인 명세서
* **[final-submission-checklist.md](contest/final-submission-checklist.md)**: 최종 제출 항목 체크리스트
* **[submission-summary.md](contest/submission-summary.md)**: 공모전 1차/2차 제출 요약서
* **[contest-notice-response-matrix.md](contest/contest-notice-response-matrix.md)**: 지정과제 9번 공고 대응 매트릭스
* **[contest-submission-copy.md](contest/contest-submission-copy.md)**: 제출 시스템 입력용 요약 카피문
* **[final-rehearsal-checklist.md](contest/final-rehearsal-checklist.md)**: 제출 직전 최종 리허설 체크리스트

---

## 2. 개발 및 운영 가이드 (`docs/guides/`)

개발자 및 데모 시연자, 운영자를 위한 가이드입니다.

* **[submission-demo-guide.md](guides/submission-demo-guide.md)**: 공모전 심사 시연 가이드 및 동선
* **[demo-operations-runbook.md](guides/demo-operations-runbook.md)**: 공개 데모(Tailscale Funnel, Docker) 운영 런북
* **[internal-docker-deploy.md](guides/internal-docker-deploy.md)**: Docker 컨테이너 생성 및 내부 배포 가이드
* **[local-continuation-guide.md](guides/local-continuation-guide.md)**: 로컬 개발 환경 구축 및 이어하기 가이드
* **[naver-map-api-setup.md](guides/naver-map-api-setup.md)**: 행사장 지도 연동용 Naver Map API 설정법
* **[demo-verification.md](guides/demo-verification.md)**: 데모 환경 검증 체크서

---

## 3. 기능 및 데이터 명세 (`docs/specs/`)

서비스 핵심 산출 알고리즘, 데이터 처리 및 서비스 아키텍처 흐름입니다.

* **[service-flows.md](specs/service-flows.md)**: 통합 서비스 아키텍처 흐름 (대시보드, 시나리오 저장, 리포트 출력, 공개 데모 퍼널)
* **[data-methodology.md](specs/data-methodology.md)**: 축제 수요예측 및 리스크 진단 데이터 산출 방법론
* **[extended-data-sources.md](specs/extended-data-sources.md)**: 확장 공공 및 빅데이터셋 연동 명세 (관광데이터랩, ITS, 기상청, 행안부)
* **[forecast-simulation-report-method.md](specs/forecast-simulation-report-method.md)**: 혼잡 시뮬레이션 및 기획 보완 리포트 생성 로직
* **[tourapi-recent-festival-example.md](specs/tourapi-recent-festival-example.md)**: 한국관광공사 TourAPI 실제 조회 예시 근거 (강남 미디어 윈터페스타)
* **[government-readiness-checklist.md](specs/government-readiness-checklist.md)**: 정부 가이드라인(전자정부, CSAP, 개인정보보호) 준수 체크리스트
* **[public-data-and-privacy-policy.md](specs/public-data-and-privacy-policy.md)**: 공공데이터 활용 및 비식별 개인정보 정책
