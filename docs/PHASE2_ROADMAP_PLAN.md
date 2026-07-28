# Fest-Twin Phase 2 Roadmap Plan

## 목표

2026년 9월 21일까지 Fest-Twin을 “시연용 대시보드”에서 “제출용 실서비스 v1” 단계로 고도화한다. v1의 기준은 지자체 축제 담당자가 공개 URL에서 실제 TourAPI 축제 후보를 선택하고, 수요 예측·혼잡 안전·교통·예산 효과·데이터 근거·보고서를 끝까지 확인할 수 있는 상태다.

## 진행 방식

- 에이전트 A: 기능 구현 및 리팩토링
- 에이전트 B: 실시간 QA 검증
- 코드 변경 후 검증 루프: `npm test`, `npm run test:load`, `npm run deploy:check`, `logs/audit-*.log`
- 런타임 변경은 GitHub 반영 후 원격 Docker 서버에 배포한다.

## Phase 2 작업 현황

| 순서 | 과제 | 상태 | 산출물 |
| --- | --- | --- | --- |
| 1 | KPI 근거 매트릭스 강화 | 완료 | `src/services/metricEvidence.ts`, `src/components/DataBasisPanel.tsx`, `docs/specs/kpi-evidence-matrix.md` |
| 2 | 축제 후보 변경 시 모든 컨텍스트 동기화 | 다음 작업 | TourAPI, 트렌드, 교통, 소비, 지도, 보고서 refresh key 정리 |
| 3 | B2G 공공검토 보고서 구조화 | 예정 | 예측 결과, 혼잡·안전, 예산·경제효과, 데이터 한계, 개선 권고 |
| 4 | 시나리오 저장·공유 보존 | 예정 | 선택 축제 기준이 포함된 scenario save/share restore |
| 5 | 운영 검증 게이트 안정화 | 일부 진행 | 공개 URL 기본 헬스체크 적용, 부하 테스트 설명 보정 필요 |
| 6 | 제출 패키지 갱신 | 예정 | 제출 ZIP, README, 운영가이드, 검증 결과 갱신 |

## 이번 작업 반영 내용

### 1. 배포 헬스체크 기준 수정

기존 `npm run deploy:check`는 내부 IP `192.168.55.223:18080`을 기본 대상으로 사용했다. 현재 실제 확인 URL은 `https://cwserver.tail97dbc3.ts.net/`이므로 기본 헬스체크 대상을 공개 URL로 변경했다. 내부망 검증이 필요한 경우에는 `DEPLOY_TARGET_HOST`, `DEPLOY_TARGET_PORT` 또는 `DEPLOY_TARGET_URL` 환경변수로 별도 지정할 수 있다.

### 2. 대시보드 데이터 근거 패널 강화

`DataBasisPanel`에 다음 데이터 상태 요약을 추가했다.

- TourAPI 축제·관광지
- 검색·소셜 트렌드
- KTDB/View-T 교통
- 관광소비 객단가
- 지역 수요 백데이터

각 항목은 `실데이터`, `부분 보완`, `파일 정규화`, `지역 매핑 샘플`, `샘플 보완`, `미연동` 상태로 표시된다.

### 3. KPI 근거 매트릭스 보강

수요 예측 KPI의 `sourceDetails`에 다음 근거가 함께 들어가도록 보강했다.

- 선택 TourAPI 축제 기준
- 주변 관광지 맥락
- 검색 관심도 보정
- 지역 수요 백데이터
- 사용자 입력값

## 검증 기준

최종 완료 판단은 다음 명령의 최신 실행 결과로만 한다.

```bash
npm test
npm run build
npm run test:load
npm run deploy:check
```

추가로 `logs/audit-*.log`에서 rate limit 차단 이벤트와 오류 로그를 확인한다.

## Task 1 최종 QA 결과

- `npm test`: 26개 파일 / 104개 테스트 통과
- `npm run build`: TypeScript 빌드 및 Vite 번들 생성 성공
- `npm run test:load`: TPS 394.82 req/s, HTTP 429 35회 확인
- `npm run deploy:check`: 공개 URL 4개 헬스체크 모두 HTTP 200
- `logs/audit-2026-07-28.log`: 오류 패턴 0건, rate limit 경고는 정상 방어 동작으로 확인

## 다음 추천 작업

다음 작업은 “축제 후보 변경 시 모든 컨텍스트 동기화”다. 현재 사용자가 축제를 바꿨을 때 TourAPI 기준은 반영되지만, 트렌드·교통·소비·보고서 근거까지 완전히 같은 기준으로 갱신되는지 더 촘촘한 테스트가 필요하다.
