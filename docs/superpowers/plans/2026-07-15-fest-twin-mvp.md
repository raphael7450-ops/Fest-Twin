# Fest-Twin Government-Guided MVP Implementation Plan

## Goal

정부 지침을 설계 기준으로 삼아, 지자체가 검토하기 쉬운 축제 수요 예측·군중 안전 진단 B2G SaaS MVP를 만든다.

## Architecture

먼저 공공 디지털서비스 지침 기준선, 접근성·품질·개인정보·공공데이터·SaaS 보안 준비성 체크리스트를 정의한다. 그 위에 Vite + React + TypeScript 단일 페이지 앱을 구축하고, 예측·시뮬레이션·리포트 로직은 순수 TypeScript 서비스로 분리한다.

## Government Guideline Baseline

- 디지털 정부서비스 UI/UX 가이드라인(KRDS): 공공 서비스의 일관된 화면 구조, 명확한 업무 흐름, 디지털 포용 관점 반영
- 전자정부 웹사이트 품질관리 지침: 호환성, 접근성, 개방성, 접속성, 편의성, 효율성, 신뢰성 관점 반영
- 한국형 웹 콘텐츠 접근성 지침 2.2(KWCAG 2.2): 레이블, 키보드 운용, 명도 대비, 오류 정정, 반복 입력, 접근 가능한 인증 관점 반영
- 공공부문 SaaS 이용 가이드라인: 공공기관의 SaaS 도입 검토, 계약, 운영, 보안 검토 흐름 고려
- 클라우드 보안인증제(CSAP) 준비성: 기관 분리, 권한, 감사 로그, 데이터 보관 정책으로 확장 가능하게 설계
- 개인정보 보호 및 개인정보 영향평가: 개인정보 최소수집, 목적 명확화, 보관 기간, 영향평가 대상 여부 판단 근거 반영
- 공공데이터 이용정책: TourAPI 출처, API 장애 시 대체 흐름, 데이터 기준 시점과 샘플 사용 여부 표시

## MVP Flow

1. 기획안 입력
2. 공공데이터·트렌드 근거 확인
3. 수요 예측
4. 혼잡 시뮬레이션
5. 리스크 점수화
6. 기획 보완 리포트
7. 정부 지침 반영 현황

## Global Constraints

- 모든 사용자 노출 문구는 한국어로 작성한다.
- 서비스명은 `페스트트윈(Fest-Twin)`으로 표기한다.
- 첫 화면은 홍보용 랜딩페이지가 아니라 공공 실무자가 바로 쓰는 업무형 진단 대시보드다.
- 웹 기반 군중 기능은 정밀 물리 엔진이 아니라 혼잡도 시뮬레이션 및 안전 리스크 진단으로 표현한다.
- 실제 TourAPI 키가 없어도 샘플·캐시 대체 흐름으로 데모가 가능해야 한다.
- 개인정보는 MVP에서 수집하지 않는다. 담당자 실명, 연락처, 주민등록번호, 개인 위치 이력, 결제정보 입력란을 만들지 않는다.
- 정부 지침은 기능 마지막에 붙이는 장식이 아니라 화면 구조, 데이터 구조, 테스트 기준, 문서 산출물의 출발점으로 삼는다.

## Planned File Structure

- `package.json`: npm scripts and dependencies
- `index.html`: Korean document language and Vite entry
- `src/main.tsx`: React mount entry
- `src/App.tsx`: government-guided dashboard composition
- `src/styles.css`: public-service style, accessibility, responsive layout
- `src/domain/types.ts`: domain, guideline, provenance, risk, report types
- `src/government/guidelines.ts`: government guideline checklist
- `src/government/readiness.ts`: readiness scoring and public-sector adoption notes
- `src/data/sampleFestivalPlan.ts`: demo festival plan with no personal data
- `src/data/sampleTourApi.ts`: TourAPI-like sample public tourism data
- `src/data/sampleTrends.ts`: non-personal trend sample data
- `src/services/tourApiAdapter.ts`: public data provenance and fallback adapter
- `src/services/trendAdapter.ts`: trend fallback adapter
- `src/services/forecast.ts`: explainable demand forecast
- `src/services/simulation.ts`: grid-based crowd safety diagnosis
- `src/services/report.ts`: planning improvement report and government review summary
- `src/components/*`: dashboard, form, evidence, heatmap, report, guideline panels
- `docs/government-readiness-checklist.md`: government guideline mapping document
- `docs/public-data-and-privacy-policy.md`: public data and privacy-minimization note
- `docs/demo-verification.md`: manual demo verification checklist

## Implementation Tasks

### Task 1: Government Baseline Scaffold

Create the Vite + React + TypeScript project shell. The first visible UI must already communicate that this is a government-guided B2G SaaS MVP. It should show:

- `페스트트윈(Fest-Twin)`
- `정부 지침 기반 B2G SaaS MVP`
- KRDS
- 전자정부 웹 품질
- KWCAG 2.2
- 공공 SaaS
- 공공데이터
- 개인정보 최소수집

Verification:

- `npm install`
- `npm run test`
- `npm run build`

### Task 2: Government Readiness Model and Documents

Create government-readiness domain types and guideline data before building feature logic. This makes the government guidance part of the product model, not a late UI decoration.

Required outputs:

- `GovernmentStandard`
- `GovernmentReadinessItem`
- `governmentStandards`
- `evaluateGovernmentReadiness()`
- `docs/government-readiness-checklist.md`
- `docs/public-data-and-privacy-policy.md`

The readiness model should cover:

- KRDS
- 전자정부 웹사이트 품질관리
- KWCAG 2.2
- 공공부문 SaaS 이용
- CSAP 준비성
- 개인정보 보호 및 영향평가
- 공공데이터 이용정책

### Task 3: Public Data and Non-Personal Sample Inputs

Create sample data with provenance metadata.

The MVP must show that it uses:

- 한국관광공사 TourAPI 형태의 공공 관광 데이터
- 비식별 소셜 트렌드 샘플
- 사용자 입력 축제 기획 데이터

The sample plan must not include personal data. The data provenance model should include:

- source name
- source type
- basis text
- fallback text
- collected personal data = false

### Task 4: Explainable Forecast, Simulation, and Report Services

Create pure TypeScript services:

- `createForecast(plan, tourism, trends)`
- `createSimulation(plan, forecast, hour)`
- `createPlanningReport(plan, forecast, simulation)`

Forecast must return:

- expected visitors
- visitors by hour
- peak hour
- success score
- confidence
- explainable reasons including TourAPI and social trend factors

Simulation must return:

- heatmap cells
- bottlenecks
- congestion score

Report must return:

- summary
- scores
- findings
- recommendations
- government review note explaining this is for pre-budget execution review

### Task 5: Government-Guided Dashboard UI

Build the full dashboard around government review needs.

Required UI sections:

- Government header
- Government readiness panel
- Summary cards
- Festival plan form
- Scenario/time controls
- Data basis panel
- Forecast chart
- Congestion heatmap
- Risk panel
- Planning improvement report

The UI must use visible form labels, keyboard-operable native controls, text status labels, responsive layout, and no personal-data fields.

### Task 6: Government Quality and Demo Verification

Create `docs/demo-verification.md` with manual checks for:

- government-readiness visibility
- TourAPI and trend evidence visibility
- privacy-minimization visibility
- forecast chart visibility
- heatmap visibility
- report visibility
- mobile layout
- keyboard-operable input/select controls
- public data fallback explanation

Verification commands:

- `npm run test`
- `npm run build`
- `npm run dev -- --port 5173`

## Demo Success Criteria

- A judge can understand why TourAPI is used.
- A judge can see how the service forecasts demand.
- A judge can see a visible congestion simulation.
- A judge can read actionable planning improvements.
- The product clearly serves local governments before budget execution.
- The UI visibly reflects government digital-service expectations.
- The MVP explicitly states that it does not collect personal data.

## Non-Goals for MVP

- CCTV or sensor-based real-time crowd monitoring
- legally binding safety certification
- full GIS-grade venue modeling
- production-grade ML demand model
- public procurement or budget approval workflow
- CSAP certification implementation
- account and tenant administration

These are future extensions, not contest MVP requirements.
