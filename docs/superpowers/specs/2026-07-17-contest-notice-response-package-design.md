# 공고문 대응 제출 패키지 보강 설계

## 목표

2026 관광데이터 활용 공모전 ②-2 웹·앱 구현 부문 공고문 기준으로 Fest-Twin 제출 자료가 심사 기준과 필수 요건을 직접적으로 설명하도록 보강한다.

## 배경

공개 데모, GitHub 저장소, 제출 zip, 운영 안내는 이미 준비되어 있다. 공고문 확인 결과, 심사자는 ②-2 웹·앱 구현 부문에서 지정과제 적합성, 한국관광공사 OpenAPI 활용, 개발 완료 서비스 여부, 1차 심사 기준 4개 항목을 본다. 따라서 기존 제출 패키지에 공고 기준 대응표를 추가하고, 최종 Release 링크를 `v0.1.1-submission-final`로 갱신한다.

## 범위

- `docs/contest-notice-response-matrix.md`를 추가한다.
- `docs/final-submission-package.md`에 공고문 기준 대응 요약과 1차 심사 기준 대응표를 추가한다.
- `docs/final-submission-checklist.md`에 ②-2 부문, 9번 과제, OpenAPI 활용, 최종 Release URL 확인 항목을 추가한다.
- `README.md`의 Release 링크를 최종 제출용 `v0.1.1-submission-final`로 갱신한다.
- `artifacts/fest-twin-submission-package.zip`을 최신 문서 구조로 재생성한다.

## 비범위

- 제출 포털 접수 자체는 이미 완료된 것으로 본다.
- 앱 UI, 서버 코드, Docker 이미지, Tailscale Funnel 설정은 변경하지 않는다.
- 공고문 원본 PDF나 렌더링 임시 이미지는 저장소에 포함하지 않는다.

## 검증

- zip에 README, 최종 제출 패키지, 체크리스트, 공고 대응 매트릭스, 운영 안내, 리허설 문서, 화면 증빙이 포함되는지 확인한다.
- 공개 데모 URL이 HTTP 200을 반환하는지 확인한다.
- TourAPI detail 프록시가 `resultCode=0000`을 반환하는지 확인한다.
- 실제 TourAPI 키, SSH 비밀번호, Tailscale 인증 정보가 문서와 zip에 포함되지 않았는지 확인한다.
