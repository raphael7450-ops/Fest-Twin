# 페스트트윈(Fest-Twin)

2026 관광데이터 활용 공모전 지정과제 9번을 위한 B2G SaaS 기획 프로젝트입니다.

## 제출 바로가기

- 공개 데모: https://cwserver.tail97dbc3.ts.net/
- GitHub 저장소: https://github.com/raphael7450-ops/Fest-Twin
- 전체 문서 목차: [문서 체계 안내 (docs/README.md)](docs/README.md)
- 최종 제출 패키지: [페스트트윈 최종 제출 패키지](docs/contest/final-submission-package.md)
- 제출 체크리스트: [페스트트윈 최종 제출 체크리스트](docs/contest/final-submission-checklist.md)
- 제출 zip: [fest-twin-submission-package.zip](artifacts/fest-twin-submission-package.zip)
- GitHub Release: [Fest-Twin 제출 최종 패키지 v0.1.1](https://github.com/raphael7450-ops/Fest-Twin/releases/tag/v0.1.1-submission-final)
- Release zip 다운로드: [fest-twin-submission-package.zip](https://github.com/raphael7450-ops/Fest-Twin/releases/download/v0.1.1-submission-final/fest-twin-submission-package.zip)
- 제출 요약: [제출 요약서](docs/contest/submission-summary.md)
- 공고 대응: [공고 대응 매트릭스](docs/contest/contest-notice-response-matrix.md)
- 제출 문구: [공모전 제출용 문구](docs/contest/contest-submission-copy.md)
- TourAPI 실제 예시: [강남 미디어 윈터페스타 조회 근거](docs/specs/tourapi-recent-festival-example.md)
- 네이버 지도 설정: [네이버 지도 API 설정](docs/guides/naver-map-api-setup.md)
- 시연 순서: [제출 시연 가이드](docs/guides/submission-demo-guide.md)
- 운영 안내: [공개 데모 운영 안내](docs/guides/demo-operations-runbook.md)
- 최종 리허설: [최종 리허설 체크리스트](docs/contest/final-rehearsal-checklist.md)

## 현재 공개 검증 상태

- 공개 데모 HTTP 200 확인
- TourAPI `festivals`, `detail` 프록시 응답 `resultCode=0000` 확인
- 기본 데모 축제를 TourAPI 실제 조회 예시인 `강남 미디어 윈터페스타`로 갱신
- 실제 행사장 지도 패널 추가, 네이버 지도 API 키 미설정 시 TourAPI 좌표 fallback 표시
- Docker 이미지: `fest-twin-demo:20260717092936`
- 최종 제출 zip은 `docs/...`와 `docs/assets/submission/...` 경로 구조 유지
- GitHub 저장소 공개 접근 확인
- 공고문 기준 ②-2 웹·앱 구현 부문, 9번 과제, 공사 OpenAPI 필수 활용 대응 정리 완료

## 병합된 PR 이력

- [PR #1: TourAPI 서버 프록시와 내부 Docker 배포](https://github.com/raphael7450-ops/Fest-Twin/pull/1)
- [PR #2: 공개 데모 Funnel 문서화](https://github.com/raphael7450-ops/Fest-Twin/pull/2)
- [PR #3: 제출 데모 검증 현황 패널](https://github.com/raphael7450-ops/Fest-Twin/pull/3)
- [PR #4: 최종 제출 패키지](https://github.com/raphael7450-ops/Fest-Twin/pull/4)
- [PR #5: 최종 제출 PR 이력 갱신](https://github.com/raphael7450-ops/Fest-Twin/pull/5)

심사자는 첫 화면에서 정부 지침 기반 대시보드, 데이터 근거, 수요 예측, 혼잡 히트맵, 기획 보완 리포트를 순서대로 확인하면 됩니다.

현재 기본 기획안은 공개 데모 TourAPI 프록시에서 확인한 `강남 미디어 윈터페스타`를 기준으로 구성했습니다. 조회 조건과 값은 [TourAPI 실제 축제 예시](docs/specs/tourapi-recent-festival-example.md)에 정리되어 있습니다.

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

## 네이버 지도 표시

실제 행사장 지도 패널은 NAVER Maps JavaScript API v3를 사용합니다. 로컬에서 실제 지도를 보려면 `.env.local`에 `VITE_NAVER_MAP_NCP_KEY_ID`를 설정합니다. 키가 없으면 앱은 지도를 요청하지 않고 TourAPI 좌표 기준 fallback 정보를 표시합니다.

자세한 설정은 [네이버 지도 API 설정](docs/guides/naver-map-api-setup.md)을 확인합니다.

## 정부 지침 기반 설계

MVP는 기능을 먼저 만들고 공공성을 나중에 붙이는 방식이 아니라, 다음 정부·공공 기준을 설계 출발점으로 둡니다.

- 디지털 정부서비스 UI/UX 가이드라인(KRDS)
- 전자정부 웹사이트 품질관리 지침
- 한국형 웹 콘텐츠 접근성 지침 2.2(KWCAG 2.2)
- 공공부문 SaaS 이용 가이드라인
- 클라우드 보안인증제(CSAP) 준비성
- 개인정보 보호 및 개인정보 영향평가
- 공공데이터 이용정책

## 문서 체계 (Documentation Structure)

모든 세부 문서는 **[docs/README.md](docs/README.md)**에서 한눈에 확인하실 수 있습니다.

### 🏆 공모전 제출 서류 (`docs/contest/`)
- [페스트트윈 최종 제출 패키지](docs/contest/final-submission-package.md)
- [페스트트윈 최종 제출 체크리스트](docs/contest/final-submission-checklist.md)
- [제출 요약서](docs/contest/submission-summary.md)
- [공고 대응 매트릭스](docs/contest/contest-notice-response-matrix.md)
- [공모전 제출용 문구](docs/contest/contest-submission-copy.md)
- [최종 리허설 체크리스트](docs/contest/final-rehearsal-checklist.md)

### 🛠️ 개발 및 운영 가이드 (`docs/guides/`)
- [제출 시연 가이드](docs/guides/submission-demo-guide.md)
- [공개 데모 운영 안내](docs/guides/demo-operations-runbook.md)
- [내부 Docker 배포](docs/guides/internal-docker-deploy.md)
- [로컬 작업 이어가기](docs/guides/local-continuation-guide.md)
- [네이버 지도 API 설정](docs/guides/naver-map-api-setup.md)
- [데모 검증 체크리스트](docs/guides/demo-verification.md)

### 🔬 기능 및 데이터 명세 (`docs/specs/`)
- [통합 서비스 아키텍처 및 흐름](docs/specs/service-flows.md)
- [데이터 산출 방법론](docs/specs/data-methodology.md)
- [수요 예측·혼잡 진단·리포트 산정 기준](docs/specs/forecast-simulation-report-method.md)
- [TourAPI 실제 축제 예시](docs/specs/tourapi-recent-festival-example.md)
- [정부 지침 기반 설계 체크리스트](docs/specs/government-readiness-checklist.md)
- [공공데이터 및 개인정보 최소수집 정책](docs/specs/public-data-and-privacy-policy.md)

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
