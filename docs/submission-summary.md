# 페스트트윈 제출 요약서

## 한 줄 요약

페스트트윈(Fest-Twin)은 지자체가 축제 예산을 집행하기 전에 TourAPI 기반 수요 근거, 혼잡 시뮬레이션, 예산·만족도 리스크를 한 화면에서 검토하는 정부용 B2G SaaS MVP다.

## 빠른 확인

- 공개 데모: https://cwserver.tail97dbc3.ts.net/
- 내부 데모: http://192.168.55.223:18080/
- GitHub 저장소: https://github.com/raphael7450-ops/Fest-Twin
- 병합된 PR: https://github.com/raphael7450-ops/Fest-Twin/pull/1
- 제출 문구: [공모전 제출용 문구](contest-submission-copy.md)
- 시연 순서: [제출 시연 가이드](submission-demo-guide.md)
- 검증 체크리스트: [데모 검증 체크리스트](demo-verification.md)

## 지정과제 9번 대응

지정과제 9번은 축제 수요 예측 실패, 주관적 경험 의존형 기획, 예산 낭비, 대규모 관광객 쏠림에 따른 만족도 저하를 문제로 둔다. 페스트트윈은 이 문제를 사전 진단 대시보드로 풀어낸다.

- 축제 기획안 입력값을 기반으로 예상 방문객과 피크 시간대를 산정한다.
- 혼잡 히트맵으로 병목 구역과 시간대별 밀집 위험을 보여준다.
- 흥행 가능성, 밀집 위험, 예산 낭비 위험, 만족도 저하 위험을 점수화한다.
- 기획 보완 리포트로 피크 프로그램 분산, 출입구 인력 재배치, 동선 분리, 주변 관광지 연계 코스를 제안한다.

## TourAPI 활용 방식

앱은 브라우저에서 TourAPI 인증키를 직접 사용하지 않는다. React 앱은 같은 origin의 `/api/tour/*` 서버 프록시만 호출하고, 서버가 런타임 환경변수 `TOUR_API_KEY`로 TourAPI에 접근한다.

현재 활용 엔드포인트는 다음과 같다.

- `areaCode2`: 개최 지역을 TourAPI 지역 코드로 매핑
- `searchFestival2`: 유사 축제 후보 조회
- `detailCommon2`: 축제 상세 정보와 좌표 보강
- `locationBasedList2`: 주변 관광지 조회

입력 기간 직접 일치 결과가 0건이면 같은 지역의 연간 축제 데이터를 참고한다. 이 경우 데이터 근거 패널에 `실제 TourAPI 일부 조회 및 샘플 보완`과 기간 완화 사유를 표시한다.

## 개인정보와 공공기관 검토 포인트

MVP는 담당자 실명, 연락처, 결제정보, 개인별 위치 이력을 입력받지 않는다. 시나리오 저장은 브라우저 `localStorage`에 축제 기획안과 진단 시간대만 저장한다.

정부 디지털서비스 검토 관점에서는 다음 항목을 화면과 문서에 반영했다.

- 정부 지침 기반 업무형 대시보드
- TourAPI 출처와 샘플 보완 여부 표시
- 개인정보 최소수집 원칙
- API 장애 시 화면 흐름 유지
- CSAP, SaaS 운영 보안, 기관 계정은 향후 실증 단계 항목으로 분리

## 현재 검증 상태

- 자동 테스트: 10개 파일, 27개 항목 통과
- 프로덕션 빌드: 정상 완료
- 공개 데모: `https://cwserver.tail97dbc3.ts.net/` HTTP 200
- 내부 데모: `http://192.168.55.223:18080/` HTTP 200
- Docker 이미지: `fest-twin-demo:20260717092936`
- 공개 URL TourAPI 프록시: `resultCode=0000`
- 실제 화면 데이터 근거: `실제 TourAPI 일부 조회 및 샘플 보완`
- 모바일 화면: 주요 섹션 텍스트 누락 없음, 가로 넘침 없음, 콘솔 오류 없음
- 비밀값 검사: 실제 TourAPI 키, 서버 비밀번호, SSH 비밀번호 노출 없음

## 화면 증빙

### 전체 대시보드

![전체 대시보드](assets/submission/desktop-full.png)

### 첫 화면

![페스트트윈 첫 화면](assets/submission/header.png)

### 제출 데모 검증 현황

![제출 데모 검증 현황](assets/submission/submission-status.png)

### 데이터 근거

![TourAPI 데이터 근거 패널](assets/submission/dataBasis.png)

### 수요 예측

![시간대별 수요 예측](assets/submission/forecast.png)

### 혼잡도 시뮬레이션

![혼잡도 시뮬레이션 히트맵](assets/submission/heatmap.png)

### 기획 보완 리포트

![기획 보완 리포트](assets/submission/report.png)

### 시나리오 저장

![시나리오 저장](assets/submission/scenario.png)

### 모바일 첫 화면

![모바일 첫 화면](assets/submission/mobile-viewport.png)

## 차별점

페스트트윈은 단순 축제 소개 페이지가 아니라 공공기관 실무자가 예산 집행 전 검토할 수 있는 사전 진단 도구다. TourAPI 실제 조회 결과, 샘플 보완 여부, 개인정보 미수집 원칙, 정부 지침 반영 상태를 함께 보여주기 때문에 심사자가 기능과 공공성을 동시에 확인할 수 있다.
