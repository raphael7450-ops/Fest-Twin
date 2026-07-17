# 페스트트윈(Fest-Twin)

2026 관광데이터 활용 공모전 지정과제 9번을 위한 B2G SaaS 기획 프로젝트입니다.

## 빠른 데모 확인

- 공개 데모: https://cwserver.tail97dbc3.ts.net/
- 내부 데모: http://192.168.55.223:18080/
- GitHub 저장소: https://github.com/raphael7450-ops/Fest-Twin
- 병합된 PR: https://github.com/raphael7450-ops/Fest-Twin/pull/1
- 제출 요약: [제출 요약서](docs/submission-summary.md)
- 제출 문구: [공모전 제출용 문구](docs/contest-submission-copy.md)
- 시연 순서: [제출 시연 가이드](docs/submission-demo-guide.md)
- 공개 데모 운영: [Tailscale Funnel 운영 문서](docs/public-demo-funnel.md)

심사자는 첫 화면에서 정부 지침 기반 대시보드, 데이터 근거, 수요 예측, 혼잡 히트맵, 기획 보완 리포트를 순서대로 확인하면 됩니다.

## 한 줄 정의

페스트트윈은 한국관광공사 TourAPI의 축제·관광지 데이터를 실제 조회하고, 호출할 수 없을 때는 샘플 데이터로 대체합니다. 현재 MVP의 소셜 관심도는 실시간 연동이 아닌 비개인 사전 정의 샘플이며, 이 근거로 축제 수요와 혼잡·안전 리스크를 사전 진단하는 정부용 SaaS입니다.

## 문제 정의

지정과제 9번:

> 축제 수요 예측 실패 및 주관적 경험 의존형 기획으로 인한 예산 낭비 리스크 존재 및 대규모 관광객 쏠림에 따른 축제 만족도 저하

## 제품 방향

**축제 흥행 예보 + 군중 안전 디지털 트윈 B2G SaaS**

지자체 담당자나 축제 위탁사가 축제 예산을 집행하기 전에 기획안을 입력하면 다음 결과를 제공합니다.

- 예상 방문객 수
- 피크 시간대
- 흥행 가능성
- 혼잡 위험도
- 예산 낭비 위험도
- 만족도 저하 위험도
- 행사장 혼잡 히트맵
- 기획 보완 리포트

## 집에서 이어서 작업하기

작업 기준 브랜치는 `main`입니다.

```powershell
git clone https://github.com/raphael7450-ops/Fest-Twin.git
cd Fest-Twin
npm install
npm run dev
```

브라우저에서 `http://127.0.0.1:5173/`을 열면 현재 정부용 대시보드를 볼 수 있습니다.

검증 명령은 다음과 같습니다.

```powershell
npm run test
npm run build
```

권장 환경은 Node.js 20 이상입니다. 현재 개발 PC에서는 Node.js `v24.18.0`, npm `11.16.0`으로 검증했습니다.

## TourAPI 실제 연동

서버 배포와 실제 시연에서는 브라우저용 `VITE_TOUR_API_KEY`를 사용하지 않습니다. TourAPI 인증키는 서버 런타임 환경변수 `TOUR_API_KEY`로만 제공합니다.

```env
TOUR_API_KEY=발급받은_일반_인증키_Decoding_값
```

React 앱은 같은 origin의 `/api/tour/*` 프록시만 호출합니다. 프록시 서버가 `serviceKey`를 붙여 한국관광공사 TourAPI의 `areaCode2`, `searchFestival2`, `detailCommon2`, `locationBasedList2`를 호출합니다. 인증키가 없거나 호출·응답 검증에 실패하면 기존 TourAPI 형태의 샘플 데이터로 자동 대체됩니다.

로컬에서 Vite 개발 서버만 실행하면 프록시가 없으므로 sample fallback으로 동작합니다. 실제 TourAPI를 로컬에서 검증하려면 `npm run build` 후 `TOUR_API_KEY`와 함께 `npm start`를 실행합니다.

## 정부 지침 기반 설계

MVP는 기능을 먼저 만들고 공공성을 나중에 붙이는 방식이 아니라, 다음 정부·공공 기준을 설계 출발점으로 둡니다.

- 디지털 정부서비스 UI/UX 가이드라인(KRDS)
- 전자정부 웹사이트 품질관리 지침
- 한국형 웹 콘텐츠 접근성 지침 2.2(KWCAG 2.2)
- 공공부문 SaaS 이용 가이드라인
- 클라우드 보안인증제(CSAP) 준비성
- 개인정보 보호 및 개인정보 영향평가
- 공공데이터 이용정책

## 현재 문서

- [설계 문서](docs/superpowers/specs/2026-07-15-fest-twin-design.md)
- [정부 지침 기반 MVP 구현 계획](docs/superpowers/plans/2026-07-15-fest-twin-mvp.md)
- [정부 지침 기반 설계 체크리스트](docs/government-readiness-checklist.md)
- [공공데이터 및 개인정보 최소수집 정책](docs/public-data-and-privacy-policy.md)
- [수요 예측·혼잡 진단·리포트 산정 기준](docs/forecast-simulation-report-method.md)
- [정부용 대시보드 화면 흐름](docs/dashboard-service-flow.md)
- [공모전 제출용 문구](docs/contest-submission-copy.md)
- [제출 요약서](docs/submission-summary.md)
- [제출 시연 가이드](docs/submission-demo-guide.md)
- [리포트 출력 흐름](docs/report-export-flow.md)
- [시나리오 저장 흐름](docs/scenario-save-flow.md)
- [데모 검증 체크리스트](docs/demo-verification.md)
- [로컬 작업 이어가기](docs/local-continuation-guide.md)
- [내부 Docker 배포](docs/internal-docker-deploy.md)

## MVP 흐름

1. 축제 기획안 입력
2. TourAPI 실제 조회·샘플 대체 상태와 비개인 트렌드 샘플 근거 확인
3. 수요 예측
4. 혼잡 시뮬레이션
5. 리스크 점수화
6. 기획 보완 리포트
7. 정부 지침 반영 현황 확인

## 개인정보 원칙

MVP는 개인정보를 수집하지 않습니다.

수집하지 않는 항목:

- 담당자 실명
- 휴대전화번호
- 이메일
- 주민등록번호
- 결제정보
- 개인별 위치 이력

## 현재 구현 상태

- Vite + React + TypeScript 기반 단일 페이지 앱
- 정부 지침 반영 현황 패널
- TourAPI 실제 조회와 오류·응답 부족 시 샘플 공공데이터 대체
- 실시간 연동이 아닌 비개인 사전 정의 트렌드 샘플
- 설명 가능한 수요 예측 서비스
- 격자 기반 혼잡도 시뮬레이션
- 기획 보완 리포트
- 브라우저 인쇄 기반 리포트 출력
- 브라우저 로컬 저장소 기반 시나리오 저장·불러오기
- 테스트 및 빌드 스크립트
