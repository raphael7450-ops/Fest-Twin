# Fest-Twin 프로젝트 인수인계 및 작업 내역 정리 문서

작성일시: 2026-08-07 (최종 갱신)
작성목적: 외부 환경 또는 팀원 인수인계 시 프로젝트 작업을 원활하게 이어가기 위한 최신 구현 내역, 코드 구조, 배포 환경 및 실행 방법 정리

---

## 1. Git 저장소 및 원격 배포 현황

- 저장소 경로: https://github.com/raphael7450-ops/Fest-Twin.git
- 작업 브랜치: codex/phase2-operational-v1
- 브랜치 상태: 원격 origin 저장소와 100% 동기화 완료 (Working tree clean)
- 원격 서버 배포 대상: Tailscale IP 100.104.94.112:18080 (Docker 컨테이너: fest-twin-demo)
- 공개 데모 URL: https://cwserver.tail97dbc3.ts.net/
- 배포 스크립트: scripts/remote-deploy.js (PuTTY plink/pscp 기반 자동화)
- 헬스체크 검증: 5개 항목 전원 PASSED (deploy-check.js)

---

## 2. 주요 신규 개발 및 개편 내역

### 가. 전국 5,700여 건 축제 DB 연동 및 중복 데이터 제거
- 관련 파일:
  - server/db/regionalFestivalDatabase.js
  - server/regionalFestivalRouter.js
  - src/components/FestivalSearchModal.tsx
- 주요 기능:
  - 전국 5,700여 건의 지역 축제 DB를 통합 검색 API(/api/regional-festivals)로 제공
  - 연도(2022~2026년) 및 회차(제XX회) 수치 표현 정규화를 통한 동일 축제 중복 표출 방지
  - 정규화된 베이스 키당 가장 최신의 연도 데이터만 단일 표출하는 최신 연도 중복 제거 알고리즘 적용

### 나. 지역 맞춤형 주변 관광지 보강 데이터 생성 엔진
- 관련 파일:
  - src/services/tourApiAdapter.ts
- 주요 기능:
  - TourAPI 주변 관광지 실시간 조회 미반환 시 서울 고정 샘플 대신 축제의 위치 및 지역 정보(논산, 보령, 부산, 진주, 대전, 세종, 전주, 화천, 안동, 제주, 수원, 인천, 광주, 대구, 울산 등 16개 지역)와 일치하는 지역 대표 관광지 자동 생성
  - 해당 지역명이 포함된 카테고리 라벨 및 세부 근거 바인딩

### 다. 개최 지역 필터링 엄격화
- 관련 파일:
  - server/db/regionalFestivalDatabase.js
  - src/services/tourApiAdapter.ts
- 주요 기능:
  - 기획안 입력부에서 개최 지역(예: 대전) 선택 시 키워드 검색이나 후보 추천 과정에서 타 지역(충남, 경남 등) 축제가 들어오지 않도록 지역 매칭 필터 강제 적용

### 라. 축제 전환 상태 반응성 자동화 QA 테스트 구축
- 관련 파일:
  - tests/festivalSwitch.test.ts
- 주요 기능:
  - 축제 변경 시 입력 파라미터, 4단계 예측 엔진, Metric Evidence Drawer, CSV 내보내기 데이터 100% 즉시 갱신 검증
  - 연속 빠른 축제 전환(A -> B -> C -> A) 시 비동기 레이스 컨디션 방지 검증

---

## 3. 실행 및 관리 가이드

### 가. Git 저장소 동기화
git fetch origin
git checkout codex/phase2-operational-v1
git pull origin codex/phase2-operational-v1

### 나. 개발 환경 실행 및 빌드/테스트
1. 패키지 설치: npm ci
2. 테스트 수행: npm test (전체 50개 파일, 206개 테스트 100% PASS 확인)
3. 정적 빌드 검증: npm run build
4. 로컬 개발 서버 실행: npm run dev

### 다. 원격 배포 명령어 (Tailscale 접속 환경)
코드 수정 완료 후 아래 명령어로 원격 서버 Docker 컨테이너 재배포 및 헬스체크를 실행합니다:
npm run deploy:remote

---

## 4. 전체 테스트 슈트 상태
- 실행 명령어: npm test
- 검증 결과: 50개 테스트 파일, 206개 단위/통합 테스트 전원 PASS (0 failures, 0 warnings)
