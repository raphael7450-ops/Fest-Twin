# 2026 관광데이터 활용 공모전 공고 대응 매트릭스

## 지원 부문 및 과제 적합성

| 공고 요건 | Fest-Twin 대응 |
| --- | --- |
| 공모전명 | 2026 관광데이터 활용 공모전 |
| 지원 부문 | ②-2 웹·앱 구현 부문 |
| 공모 대상 | 지정과제 10개 중 택1, 한국관광공사 OpenAPI를 필수 활용하여 구현 및 고도화한 관광 서비스 |
| 선택 과제 | 9번: 축제 수요 예측 실패 및 주관적 경험 의존형 기획으로 인한 예산 낭비 리스크 존재 및 대규모 관광객 쏠림에 따른 축제 만족도 저하 |
| 서비스명 | 페스트트윈(Fest-Twin) |
| 서비스 정의 | 축제 예산 집행 전 TourAPI 기반 유사 축제·주변 관광지 근거와 혼잡 시뮬레이션으로 흥행·안전·예산 리스크를 사전 진단하는 B2G SaaS MVP |
| 공개 데모 | https://cwserver.tail97dbc3.ts.net/ |
| GitHub 저장소 | https://github.com/raphael7450-ops/Fest-Twin |
| 최종 Release | https://github.com/raphael7450-ops/Fest-Twin/releases/tag/v0.1.1-submission-final |

## 필수 준수사항 대응

| 필수 준수사항 | 대응 상태 | 증빙 |
| --- | --- | --- |
| 과제에 부합하는 관광 서비스 기획 | 충족 | 서비스는 9번 과제의 수요 예측 실패, 주관적 기획, 예산 낭비, 관광객 쏠림, 만족도 저하 문제를 직접 해결 대상으로 삼는다. |
| 한국관광공사 OpenAPI 필수 활용 | 충족 | 서버 프록시가 `areaCode2`, `searchFestival2`, `detailCommon2`, `locationBasedList2`를 호출한다. |
| 개발 완료 서비스 | 충족 | 공개 URL에서 대시보드가 동작하고, Docker 배포 및 Tailscale Funnel로 외부 접속 가능하다. |
| 동일 서비스 중복 제출 금지 | 확인 필요 | 제출자는 ① 웹·앱 개발 부문 또는 다른 부문에 동일 서비스를 중복 제출하지 않아야 한다. |
| 마감 전 접수 완료 | 제출 완료 | 사용자가 한국관광 콘텐츠랩 접수를 완료했다고 확인했다. |
| 실제 비밀값 미기록 | 충족 | TourAPI 키, SSH 비밀번호, Tailscale 인증 정보는 Git, 문서, Release zip에 기록하지 않는다. |

## 1차 심사 기준 대응

| 심사항목 | 배점 | Fest-Twin 대응 | 제출 시 강조 문구 |
| --- | ---: | --- | --- |
| 서비스 구현성 | 30 | React/Vite 대시보드, Express TourAPI 프록시, Docker 배포, 공개 HTTPS 데모, 모바일 렌더링, 시나리오 저장, 리포트 인쇄 흐름 구현 | “개발 완료 서비스로 공개 데모에서 입력-진단-리포트 흐름을 직접 확인할 수 있습니다.” |
| 서비스 기획력 | 30 | 지자체와 축제 위탁사의 사전 검토 업무를 대상으로 예산 집행 전 수요·혼잡·만족도 리스크를 진단한다. | “9번 과제의 핵심 문제를 축제 예산 집행 전 의사결정 대시보드로 전환했습니다.” |
| 데이터 활용 적절성 | 20 | TourAPI로 지역 코드, 유사 축제, 축제 상세 좌표, 주변 관광지를 조회하고, 결과 부족 시 샘플 보완 상태와 사유를 화면에 표시한다. | “공사 OpenAPI 호출 경로와 응답 상태를 공개 데모 상단과 데이터 근거 패널에서 확인할 수 있습니다.” |
| 서비스 발전성 | 20 | 축제 예산 검토, 혼잡 안전 운영, 관광지 연계 코스, 공공기관 보고 자동화로 확장 가능하다. | “지자체·RTO·축제 위탁사의 반복 검토 업무를 SaaS로 확장할 수 있습니다.” |

## 최종 심사 기준 대응

| 심사항목 | 배점 | 대응 방향 |
| --- | ---: | --- |
| 서비스 적정성 | 30 | 과제 9번 문제와 타깃 사용자를 첫 화면, 제출 문서, 발표 도입부에서 명확히 연결한다. |
| 서비스 완성도 | 30 | 데모 URL, GitHub Release, Docker 운영 안내, 재시작 검증 결과를 제시한다. |
| 서비스 실용성 | 25 | 지자체 담당자가 실제로 수행하는 입력-예측-리스크 확인-리포트 출력 흐름을 시연한다. |
| 발표 점수 | 15 | 3분 설명 순서를 `docs/guides/final-rehearsal-checklist.md` 기준으로 준비한다. |

## 제출 자료 매핑

| 제출/증빙 항목 | 준비된 자료 |
| --- | --- |
| 공개 데모 URL | https://cwserver.tail97dbc3.ts.net/ |
| 저장소 URL | https://github.com/raphael7450-ops/Fest-Twin |
| Release zip | https://github.com/raphael7450-ops/Fest-Twin/releases/download/v0.1.1-submission-final/fest-twin-submission-package.zip |
| 제출 문구 | `docs/contest/final-submission-package.md`, `docs/contest/contest-submission-copy.md` |
| 심사 기준 대응표 | `docs/contest/contest-notice-response-matrix.md` |
| 시연 순서 | `docs/guides/submission-demo-guide.md`, `docs/contest/final-rehearsal-checklist.md` |
| 운영 안정성 | `docs/guides/demo-operations-runbook.md` |
| 화면 증빙 | `docs/assets/submission/*.png` |

## 남은 주의사항

- 제출 이후 공개 URL, GitHub 저장소, Release zip의 내용을 불필요하게 변경하지 않는다.
- 기능 추가보다 데모 안정 유지가 우선이다.
- 심사 기간 중 서버 전체 재부팅이나 Tailscale Funnel 해제는 피한다.
- 동일 서비스로 다른 부문에 중복 제출하지 않는다.
