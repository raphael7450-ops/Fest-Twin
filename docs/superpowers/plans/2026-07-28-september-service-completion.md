# September Service Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 2026년 9월 21일 16:00 1차 심사 제출 마감까지 Fest-Twin을 데모가 아닌 안정적으로 접속 가능한 완제품 웹 서비스로 완성한다.

**Architecture:** 현재 React/Vite 대시보드, Express OpenAPI 프록시, SQLite 시나리오 저장소, Docker 배포 구조를 유지하되, 심사 요구사항에 맞춰 실 OpenAPI 호출 증빙, 기능설명서, 운영 안정성, 서비스 URL 검증을 제품화 범위로 승격한다. 신규 대형 기능보다 제출 인정 기준과 서비스 완성도에 직접 연결되는 기능을 우선한다.

**Tech Stack:** React 18, TypeScript, Vite 6, Express, SQLite, Docker, GitHub Actions, 한국관광공사 TourAPI 4.0, 관광데이터랩 지출 데이터, KTDB/View-T 교통량 프록시.

## Global Constraints

- OT 자료 기준 1차 심사 자료 제출 마감은 2026년 9월 21일 월요일 16:00 정각이다.
- 심사 대상은 한국관광공사 OpenAPI를 필수 활용하여 개발 완료한 웹·앱 서비스다.
- OpenAPI 형태만 인정되며 파일 데이터 활용만으로는 인정되지 않는다.
- 웹 서비스는 별도 승인 절차 없이 최종 서비스 URL을 제출한다.
- 1차 심사자료 제출 시 한국관광공사 OpenAPI 신청정보와 서비스 내 OpenAPI 활용 내역 확인이 요구된다.
- 기능설명서에는 서비스명, 서비스 설명, 서비스 유형, 상세 기능, 활용 API 정보, 관련 이미지가 포함되어야 한다.
- 최종 완성 서비스에는 한국관광공사 OpenAPI가 반드시 활용되어야 한다.
- 공사를 지칭하는 단어 또는 로고를 서비스 소유권처럼 오해되게 사용하지 않는다.
- 비밀값은 Git, PDF, 제출 문서에 기록하지 않는다.

---

## Product Cut Line

9월 21일 제출판은 다음 네 가지가 모두 가능해야 한다.

1. 공개 URL 접속
2. TourAPI 실제 호출 성공 및 화면 내 활용 내역 확인
3. 축제 기획안 입력, 후보 선택, 수요 예측, 혼잡 시뮬레이션, 보고서 출력, 공유 링크 복원이 하나의 사용자 흐름으로 동작
4. 기능설명서와 제출 증빙에서 OpenAPI 활용, 데이터 출처, Fallback 한계, 보안·안정성 검증을 설명

## File Structure

- Modify: `src/components/PlanForm.tsx` - 지역/기간 기반 TourAPI 후보 조회 시작점
- Modify: `src/components/FestivalCandidatePanel.tsx` - 후보 선택 UI와 실제/보완 데이터 상태 노출
- Modify: `src/components/DataBasisPanel.tsx` - 활용 API, 호출 상태, 추정 프록시 한계 표시
- Modify: `src/components/MetricEvidenceDrawer.tsx` - KPI별 수식, 계수, 원천 API 근거 강화
- Modify: `src/components/ReportView.tsx` - 제출용 보고서에 활용 API와 산출 근거 포함
- Modify: `src/services/tourApiAdapter.ts` - TourAPI 호출 증빙과 기간 완화 검색 상태 표준화
- Modify: `src/services/spendingAdapter.ts` - 관광데이터랩 객단가 기준과 Fallback 상태 표준화
- Modify: `src/services/trafficAdapter.ts` - View-T 샘플/실조회 상태와 링크 매핑 한계 표준화
- Modify: `server/tourProxy.js` - TourAPI 호출 로그, 허용 파라미터, 오류 메시지 점검
- Modify: `server/spendingProxy.js` - 지출 데이터 호출 로그와 실패 응답 점검
- Modify: `server/trafficProxy.js` - KTDB/View-T 호출 로그와 실패 응답 점검
- Modify: `docs/contest/submission-package.md` - OT 기준 제출 설명서로 확장
- Modify: `docs/contest/submission-checklist.md` - 9월 21일 기준 검증 체크리스트로 확장
- Create: `docs/contest/openapi-usage-evidence.md` - TourAPI 활용 증빙 정리
- Create: `docs/contest/feature-description.md` - 기능설명서 제출 초안
- Create: `docs/contest/september-service-roadmap.md` - 주차별 제품화 일정

---

### Task 1: OT 기준 제출 범위 문서화

**Files:**
- Create: `docs/contest/september-service-roadmap.md`
- Create: `docs/contest/openapi-usage-evidence.md`
- Create: `docs/contest/feature-description.md`
- Modify: `docs/contest/submission-checklist.md`

**Interfaces:**
- Consumes: OT 자료의 제출 마감, OpenAPI 필수 활용, 기능설명서 요구사항
- Produces: 이후 기능 구현과 검증의 기준 문서

- [ ] **Step 1: 제출 마감 기준 문서 작성**

Create `docs/contest/september-service-roadmap.md` with these sections:

```markdown
# Fest-Twin 2026-09-21 서비스 완성 로드맵

## 제출 기준

- 1차 심사 자료 제출 마감: 2026년 9월 21일 16:00
- 제출 대상: 한국관광공사 OpenAPI를 필수 활용하여 개발 완료한 웹 서비스
- 제출 방식: 최종 서비스 URL과 기능설명서 제출
- 핵심 유의사항: OpenAPI 형태만 인정되며 파일 데이터만 사용한 구현은 인정되지 않음

## 제품화 목표

Fest-Twin은 지자체 축제 담당자가 지역과 기간을 선택해 TourAPI 축제 후보를 조회하고, 후보 축제를 기준으로 수요 예측, 혼잡도 시뮬레이션, 안전·물류 권고, 예산 대비 경제효과, 공유 링크, 제출용 보고서를 생성하는 B2G SaaS로 제출한다.

## 주차별 일정

| 기간 | 목표 | 완료 기준 |
| :--- | :--- | :--- |
| 2026-07-28 - 2026-08-04 | 제출 기준 정렬 및 핵심 플로우 안정화 | 지역/기간 기반 TourAPI 조회, 후보 선택, KPI 갱신 정상 동작 |
| 2026-08-05 - 2026-08-18 | OpenAPI 활용 증빙 강화 | 화면과 문서에서 TourAPI 호출 내역, 활용 API명, 신청정보 입력 위치 확인 가능 |
| 2026-08-19 - 2026-09-01 | 보고서·공유·운영 안정화 | 보고서 출력, share_token 복원, Docker 배포, 헬스체크 자동화 통과 |
| 2026-09-02 - 2026-09-14 | 제출 패키지 완성 | 기능설명서, 이미지, URL, API 활용 증빙 문서 완료 |
| 2026-09-15 - 2026-09-21 | 최종 리허설 및 동결 | 공개 URL, OpenAPI, 모바일/데스크톱, 장애 Fallback 최종 점검 |
```

- [ ] **Step 2: OpenAPI 증빙 문서 작성**

Create `docs/contest/openapi-usage-evidence.md` with a table:

```markdown
# Fest-Twin OpenAPI 활용 증빙

| API | 서비스 내 활용 위치 | 제출 증빙 |
| :--- | :--- | :--- |
| 한국관광공사 TourAPI 4.0 areaCode2 | 지역 선택 시 시도/시군구 코드 매핑 | 축제 기획안 입력 화면, 서버 `/api/tour/area-code` |
| 한국관광공사 TourAPI 4.0 searchFestival2 | 지역/기간 기반 축제 후보 조회 | 후보 선택 팝업, 데이터 근거 패널 |
| 한국관광공사 TourAPI 4.0 detailCommon2 | 선택 축제 상세 좌표와 개요 조회 | 행사장 지도, 기획안 자동 채움 |
| 한국관광공사 TourAPI 4.0 locationBasedList2 | 주변 관광지 매력도 산출 | 수요 예측 근거 Drawer |
```

- [ ] **Step 3: 기능설명서 초안 작성**

Create `docs/contest/feature-description.md` with these headings:

```markdown
# Fest-Twin 기능설명서 초안

## 서비스명

Fest-Twin (페스트트윈)

## 서비스 유형

공공데이터 기반 B2G 축제 기획 사전 진단 웹 서비스

## 서비스 설명

지자체 축제 담당자가 축제 개최 전 지역·기간·예산·수용 인원을 입력하면 한국관광공사 TourAPI 기반 축제 후보와 주변 관광지 데이터를 조회하고, 관광 소비 객단가와 교통량 근거를 결합해 수요 예측, 혼잡도, 안전 인력, 경제효과를 사전 진단한다.

## 상세 기능

1. 지역·기간 기반 TourAPI 축제 후보 조회
2. 선택 축제 기반 기획안 자동 채움
3. 예상 방문객, ROI, 안전·물류 KPI 산출
4. 행사장 지도와 혼잡도 히트맵 시뮬레이션
5. 지표 산출 근거 Drawer 제공
6. 시나리오 저장 및 공유 링크 복원
7. 제출용 보고서 출력

## 활용 API 정보

한국관광공사 TourAPI 4.0의 areaCode2, searchFestival2, detailCommon2, locationBasedList2를 서버 프록시로 호출한다.
```

- [ ] **Step 4: 제출 체크리스트 확장**

Add these checks to `docs/contest/submission-checklist.md`:

```markdown
## 9월 21일 제출 전 필수 확인

- [ ] 최종 서비스 URL 접속 가능
- [ ] TourAPI 실제 호출 성공 화면 캡처 확보
- [ ] 기능설명서 내 활용 API명과 서비스 내 활용 위치 작성
- [ ] API 신청정보는 제출 양식에만 기재하고 Git 저장소에는 비밀값 미기록
- [ ] 파일 데이터 단독 활용으로 오해될 표현 제거
- [ ] 공개 URL에서 기획안 입력 -> 후보 조회 -> 예측 -> 보고서 -> 공유 링크 복원 흐름 검증
```

- [ ] **Step 5: 문서 검증**

Run: `rg -n "<agent-worker-defined-placeholder-pattern>" docs/contest`

Expected: no matches in the three newly created files.

- [ ] **Step 6: Commit**

```bash
git add docs/contest/september-service-roadmap.md docs/contest/openapi-usage-evidence.md docs/contest/feature-description.md docs/contest/submission-checklist.md
git commit -m "docs: add September service completion roadmap"
```

---

### Task 2: TourAPI 실제 활용 흐름 안정화

**Files:**
- Modify: `src/components/PlanForm.tsx`
- Modify: `src/components/FestivalCandidatePanel.tsx`
- Modify: `src/services/tourApiAdapter.ts`
- Test: `src/App.test.tsx`
- Test: `src/services/dataAdapters.test.ts`

**Interfaces:**
- Consumes: `TourismContext` from `src/services/tourApiAdapter.ts`
- Produces: 지역/기간 기반 후보 선택 후 `FestivalPlan`과 `TourismContext`가 일관되게 갱신되는 UI

- [ ] **Step 1: 실패 테스트 작성**

Add a test to `src/App.test.tsx`:

```ts
it("queries TourAPI candidates from region and date before forecasting", async () => {
  render(<App />);

  await userEvent.selectOptions(screen.getByLabelText("개최 시도"), "서울");
  await userEvent.selectOptions(screen.getByLabelText("개최 시군구"), "강남구");
  await userEvent.clear(screen.getByLabelText("개최 시작일"));
  await userEvent.type(screen.getByLabelText("개최 시작일"), "2026-12-01");
  await userEvent.click(screen.getByRole("button", { name: /TourAPI 축제 후보 조회/ }));

  expect(await screen.findByText(/TourAPI 축제 후보/)).toBeInTheDocument();
  expect(screen.getByText(/실제 TourAPI/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/App.test.tsx`

Expected: FAIL if labels, status text, or candidate panel behavior are missing.

- [ ] **Step 3: Implement minimal UI behavior**

Ensure `PlanForm.tsx` exposes accessible labels:

```tsx
<label htmlFor="plan-region-sido">개최 시도</label>
<select id="plan-region-sido" value={regionSido} onChange={handleSidoChange}>...</select>

<label htmlFor="plan-region-sigungu">개최 시군구</label>
<select id="plan-region-sigungu" value={regionSigungu} onChange={handleSigunguChange}>...</select>

<label htmlFor="plan-start-date">개최 시작일</label>
<input id="plan-start-date" type="date" value={startDate} onChange={handleStartDateChange} />
```

- [ ] **Step 4: Standardize TourAPI state labels**

In `tourApiAdapter.ts`, expose one of these source status labels:

```ts
export type TourApiEvidenceStatus =
  | "실제 TourAPI 조회"
  | "실제 TourAPI 일부 조회 및 샘플 보완"
  | "TourAPI 호출 실패로 샘플 사용";
```

- [ ] **Step 5: Run tests**

Run: `npm run test -- src/App.test.tsx src/services/dataAdapters.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/PlanForm.tsx src/components/FestivalCandidatePanel.tsx src/services/tourApiAdapter.ts src/App.test.tsx src/services/dataAdapters.test.ts
git commit -m "feat: stabilize region-first TourAPI candidate flow"
```

---

### Task 3: 산출 근거와 한계 표시 강화

**Files:**
- Modify: `src/components/DataBasisPanel.tsx`
- Modify: `src/components/MetricEvidenceDrawer.tsx`
- Modify: `src/components/ReportEvidenceSummary.tsx`
- Modify: `src/services/metricEvidence.ts`
- Test: `src/services/metricEvidence.test.ts`

**Interfaces:**
- Consumes: `MetricEvidence` entries from `metricEvidence.ts`
- Produces: 화면과 보고서에서 사용 API, 샘플 보완 여부, 추정 프록시 한계를 확인할 수 있는 근거 UI

- [ ] **Step 1: 실패 테스트 작성**

Add to `src/services/metricEvidence.test.ts`:

```ts
it("marks TourAPI visitor estimates as metadata-based proxies", () => {
  const evidence = createMetricEvidence(sampleFestivalPlan, sampleForecast, sampleTourismContext);
  const visitorEvidence = evidence.find((item) => item.metricId === "expected-visitors");

  expect(visitorEvidence?.limitations).toContain(
    "TourAPI는 실제 방문객 집계값을 제공하지 않으므로 메타데이터 기반 추정 프록시입니다.",
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/services/metricEvidence.test.ts`

Expected: FAIL if `limitations` is not present.

- [ ] **Step 3: Add explicit limitation field**

Extend the metric evidence model:

```ts
export interface MetricEvidenceItem {
  metricId: string;
  title: string;
  formula: string;
  sourceDetails: EvidenceSourceDetail[];
  limitations: string[];
}
```

- [ ] **Step 4: Render limitations in UI**

In `MetricEvidenceDrawer.tsx`, render:

```tsx
{item.limitations.length > 0 && (
  <section className="evidence-limitations" aria-label="지표 해석 한계">
    <h4>지표 해석 한계</h4>
    <ul>
      {item.limitations.map((limitation) => (
        <li key={limitation}>{limitation}</li>
      ))}
    </ul>
  </section>
)}
```

- [ ] **Step 5: Run tests**

Run: `npm run test -- src/services/metricEvidence.test.ts src/components/ReportView.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/DataBasisPanel.tsx src/components/MetricEvidenceDrawer.tsx src/components/ReportEvidenceSummary.tsx src/services/metricEvidence.ts src/services/metricEvidence.test.ts
git commit -m "feat: disclose metric evidence limitations"
```

---

### Task 4: 제출용 보고서와 기능설명서 이미지 갱신

**Files:**
- Modify: `src/components/ReportView.tsx`
- Modify: `docs/assets/submission/*.png`
- Modify: `docs/contest/feature-description.md`
- Test: `src/components/ReportView.test.tsx`

**Interfaces:**
- Consumes: final dashboard state and report view
- Produces: 제출 문서에 넣을 수 있는 최신 화면 이미지와 보고서 출력 화면

- [ ] **Step 1: 실패 테스트 작성**

Add to `src/components/ReportView.test.tsx`:

```ts
it("prints used OpenAPI names in the report", () => {
  render(<ReportView plan={sampleFestivalPlan} forecast={sampleForecast} evidence={sampleEvidence} />);

  expect(screen.getByText(/한국관광공사 TourAPI 4.0/)).toBeInTheDocument();
  expect(screen.getByText(/관광데이터랩/)).toBeInTheDocument();
  expect(screen.getByText(/KTDB\\/View-T/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/ReportView.test.tsx`

Expected: FAIL if API names are not printed.

- [ ] **Step 3: Add report section**

Add a report section:

```tsx
<section className="report-section">
  <h3>활용 OpenAPI 및 데이터 근거</h3>
  <ul>
    <li>한국관광공사 TourAPI 4.0: 지역 코드, 축제 후보, 상세 좌표, 주변 관광지 조회</li>
    <li>관광데이터랩 지출 데이터: 방문객 1인당 소비 객단가 및 ROI 산출</li>
    <li>KTDB/View-T: 행사장 접근 교통 및 주차 리스크 추정</li>
  </ul>
</section>
```

- [ ] **Step 4: Capture screenshots**

Run local service and refresh `docs/assets/submission/` screenshots:

```bash
npm run build
npm start
node scripts/capture-submission-screenshots.js
```

- [ ] **Step 5: Run tests**

Run: `npm run test -- src/components/ReportView.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/ReportView.tsx src/components/ReportView.test.tsx docs/assets/submission docs/contest/feature-description.md
git commit -m "feat: add OpenAPI evidence to report output"
```

---

### Task 5: 운영 배포와 제출 전 리허설 자동화

**Files:**
- Modify: `scripts/deploy-check.js`
- Modify: `scripts/load-test.js`
- Modify: `.github/workflows/deploy.yml`
- Modify: `docs/guides/demo-and-operations.md`
- Modify: `docs/contest/submission-checklist.md`

**Interfaces:**
- Consumes: deployed service URL
- Produces: 제출 전 자동 검증 로그와 리허설 체크리스트

- [ ] **Step 1: Add deploy check assertions**

Extend deploy check to verify:

```js
const requiredChecks = [
  { path: "/", mustContain: "Fest-Twin" },
  { path: "/api/scenarios", status: 200 },
  { path: "/api/tour/area-code", status: 200 },
  { path: "/api/tour/festivals?areaCode=1&eventStartDate=20260101&eventEndDate=20261231&numOfRows=1", status: 200 },
];
```

- [ ] **Step 2: Run deploy check locally**

Run: `npm run deploy:check`

Expected: all checks PASS against the configured public URL or local Docker URL.

- [ ] **Step 3: Update CI/CD workflow**

Ensure `.github/workflows/deploy.yml` runs:

```yaml
- run: npm ci
- run: npm test
- run: npm run build
```

- [ ] **Step 4: Update operations guide**

Add a 5-minute final rehearsal script to `docs/guides/demo-and-operations.md`:

```markdown
## 9월 21일 제출 전 5분 리허설

1. 공개 URL 접속
2. 지역/기간 선택 후 TourAPI 축제 후보 조회
3. 후보 선택 후 KPI와 데이터 근거 Drawer 확인
4. 20:00 피크 시간대 혼잡도 히트맵 확인
5. 보고서 출력 화면 확인
6. 시나리오 저장 및 공유 링크 복원 확인
```

- [ ] **Step 5: Run full verification**

Run:

```bash
npm test
npm run build
npm run test:load
npm run deploy:check
```

Expected: all commands PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/deploy-check.js scripts/load-test.js .github/workflows/deploy.yml docs/guides/demo-and-operations.md docs/contest/submission-checklist.md
git commit -m "chore: add September submission readiness checks"
```

---

## Delivery Milestones

| Date | Deliverable |
| :--- | :--- |
| 2026-08-04 | TourAPI 지역/기간 후보 조회와 후보 선택 흐름 고정 |
| 2026-08-18 | 데이터 근거 Drawer와 보고서의 OpenAPI 활용 증빙 완성 |
| 2026-09-01 | 공개 URL, 공유 링크, 보고서 출력, 장애 Fallback 안정화 |
| 2026-09-14 | 기능설명서, 캡처 이미지, OpenAPI 증빙 문서 완료 |
| 2026-09-21 16:00 | 최종 서비스 URL과 심사자료 제출 |

## Self-Review

- Spec coverage: OT 자료의 제출 마감, OpenAPI 필수 활용, 기능설명서, 최종 서비스 URL, 완제품 요구사항을 Task 1~5에 반영했다.
- Placeholder scan: 실행자가 정의한 임시 작성 상태 표현을 사용하지 않았다.
- Type consistency: `TourApiEvidenceStatus`, `MetricEvidenceItem.limitations`, 보고서 OpenAPI 섹션은 각 task 안에서 정의 후 사용한다.
