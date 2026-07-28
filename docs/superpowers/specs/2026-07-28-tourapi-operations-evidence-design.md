# TourAPI 운영계정 신청 증빙 보강 설계

## 목적

한국관광공사 TourAPI 4.0 활용 신청 매뉴얼 v3.3의 운영계정 승인 기준을 Fest-Twin 제출 데모와 문서에 반영한다. 심사위원과 API 제공기관 담당자가 공개 URL, 실제 호출 흐름, 출처 표기, 개발계정 제한, 운영계정 전환 준비 상태를 바로 확인할 수 있게 한다.

## 매뉴얼에서 반영할 기준

- 개발계정은 각 오퍼레이션별 일 1,000건 트래픽을 제공한다.
- 개발계정은 활용 신청 후 약 10~30분 뒤 사용 가능하다.
- 운영계정은 한국관광공사 담당자 승인이 필요하며 약 1~3일 소요된다.
- 운영계정 승인 시 활용 어플 URL, TourAPI 호출 이력, App/Web 정상 동작을 확인한다.
- 활용목적, 상세기능, 라이선스 표시 동의는 필수 작성 항목이다.
- 운영계정 승인 후 활용기간은 승인일로부터 24개월이며 만료 시 연장신청이 필요하다.

## 적용 범위

### 대시보드 데이터 근거 패널

`DataBasisPanel`에 TourAPI 운영 준비 항목을 추가한다.

- 활용 어플 URL: `https://cwserver.tail97dbc3.ts.net/`
- 사용 API: `areaCode2`, `searchFestival2`, `detailCommon2`, `locationBasedList2`
- 호출 상태: 실제 조회, 일부 보완, 샘플 대체 중 현재 상태
- 비밀키 처리: 서비스키는 서버 환경변수로만 보관하고 브라우저, Git, 보고서에는 노출하지 않음
- 출처/라이선스: 한국관광공사 TourAPI 4.0 활용 및 라이선스 표시 동의 필요

### KPI 근거 Drawer

`demand-index` 근거에 운영계정 신청용 source detail을 추가한다.

- 공개 URL
- 호출 오퍼레이션 목록
- 호출 이력 확인 대상 화면
- 개발계정 일 1,000건 제한
- 운영계정 승인 1~3일 및 승인 후 24개월 활용

### 제출용 리포트

`ReportView`에 “OpenAPI 운영계정 신청 증빙” 섹션을 추가한다.

- 서비스명: Fest-Twin
- 서비스 유형: B2G SaaS Web
- 공개 URL
- 활용 목적: 축제 후보 조회, 행사장 위치 보강, 주변 관광지 기반 수요 예측 근거 산출
- TourAPI 호출 흐름: 지역 선택 → 축제 후보 → 상세 좌표 → 주변 관광지
- 주의 문구: 개발계정 제한과 운영계정 승인 필요

### 문서

`docs/contest/openapi-usage-evidence.md`와 `docs/contest/submission-checklist.md`에 운영계정 신청 기준을 추가한다.

## 오류 및 Fallback

- TourAPI 호출 실패 시 화면은 중단되지 않고 샘플 또는 부분 보완 상태를 표시한다.
- 운영계정 신청용 증빙은 실제 조회 여부와 별도로 “현재 상태”를 명확히 보여준다.
- 서비스키, Naver Client Secret, 인증 헤더, 쿠키는 어떤 근거 화면에도 노출하지 않는다.

## 테스트

- `DataBasisPanel` 렌더링 테스트: 공개 URL, 오퍼레이션명, 개발계정 제한, 비밀키 미노출 확인
- `metricEvidence` 테스트: `demand-index` sourceDetails에 TourAPI 운영 신청 근거 포함 확인
- `ReportView` 테스트: OpenAPI 운영계정 신청 증빙 섹션 렌더링 확인
- 서버/빌드 검증: 기존 테스트와 `npm run build` 통과

## 승인 상태

사용자가 매뉴얼 검토 후 “진행해줘”라고 승인했으므로 위 범위로 구현한다.
