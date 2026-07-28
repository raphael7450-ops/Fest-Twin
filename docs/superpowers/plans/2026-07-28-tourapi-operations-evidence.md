# TourAPI Operations Evidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** TourAPI 운영계정 신청 매뉴얼 기준을 Fest-Twin 대시보드, KPI 근거, 제출용 리포트, 제출 문서에 반영한다.

**Architecture:** 기존 `DataBasisPanel`, `metricEvidence`, `ReportView` 구조를 유지한다. 운영계정 신청 증빙은 새 API 호출을 만들지 않고, 현재 TourAPI 프록시 호출 흐름과 공개 URL, 제한/승인 조건을 화면과 문서에 표시한다.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Express, 한국관광공사 TourAPI 4.0.

## Global Constraints

- 공개 URL은 `https://cwserver.tail97dbc3.ts.net/`로 표시한다.
- TourAPI 서비스키는 서버 환경변수로만 관리하고 브라우저, Git, 보고서에 노출하지 않는다.
- 개발계정 제한은 “오퍼레이션별 일 1,000건”으로 표기한다.
- 운영계정 승인은 “약 1~3일 소요”, 승인 후 “24개월 활용 가능”으로 표기한다.
- 사용 오퍼레이션은 `areaCode2`, `searchFestival2`, `detailCommon2`, `locationBasedList2`로 표기한다.

---

### Task 1: 화면/근거 테스트 추가

**Files:**
- Modify: `src/components/DataBasisPanel.test.tsx`
- Modify: `src/components/ReportView.test.tsx`
- Modify: `src/services/metricEvidence.test.ts`

**Interfaces:**
- Consumes: `DataBasisPanel`, `ReportView`, `createMetricEvidenceSet`
- Produces: 운영계정 증빙 렌더링 요구사항

- [ ] **Step 1: Write failing tests**

Add tests requiring:

```ts
expect(screen.getByText("OpenAPI 운영계정 신청 증빙")).toBeInTheDocument();
expect(screen.getByText("https://cwserver.tail97dbc3.ts.net/")).toBeInTheDocument();
expect(screen.getByText("areaCode2")).toBeInTheDocument();
expect(JSON.stringify(evidence["demand-index"].sourceDetails)).toContain("운영계정 승인");
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm run test -- src/components/DataBasisPanel.test.tsx src/components/ReportView.test.tsx src/services/metricEvidence.test.ts
```

Expected: FAIL because the new operating-account evidence is not rendered yet.

---

### Task 2: 운영계정 증빙 데이터 모델 보강

**Files:**
- Modify: `src/services/metricEvidence.ts`

**Interfaces:**
- Consumes: `TourismContext`, `MetricEvidenceSourceDetail`
- Produces: `demand-index.sourceDetails`에 `tourapi-operations-approval-evidence` 항목

- [ ] **Step 1: Add evidence detail helper**

Add a helper that returns one `MetricEvidenceSourceDetail` with:

```ts
sourceId: "tourapi-operations-approval-evidence",
sourceName: "한국관광공사 TourAPI 4.0 운영계정 신청 증빙",
sourceType: "derived",
statusLabel: "운영계정 신청 준비",
records: [
  { label: "활용 어플 URL", fields: [{ label: "URL", value: "https://cwserver.tail97dbc3.ts.net/" }] },
  { label: "활용 오퍼레이션", fields: [{ label: "API", value: "areaCode2, searchFestival2, detailCommon2, locationBasedList2" }] },
]
```

- [ ] **Step 2: Attach to demand-index evidence**

Append the helper result to `demand-index.sourceDetails`.

- [ ] **Step 3: Run metric evidence test**

Run:

```bash
npm run test -- src/services/metricEvidence.test.ts
```

Expected: PASS.

---

### Task 3: 대시보드와 리포트 UI 보강

**Files:**
- Modify: `src/components/DataBasisPanel.tsx`
- Modify: `src/components/ReportView.tsx`
- Modify: `src/styles.css` or existing stylesheet if needed

**Interfaces:**
- Consumes: `TourismContext`, `TrendContext`
- Produces: 운영계정 신청 증빙 섹션

- [ ] **Step 1: Update DataBasisPanel**

Render a compact section with:

- 공개 URL
- TourAPI 오퍼레이션
- 개발계정 일 1,000건 제한
- 운영계정 승인 1~3일
- 키 비노출 원칙

- [ ] **Step 2: Update ReportView**

Render a section titled `OpenAPI 운영계정 신청 증빙` with service URL, usage purpose, call flow, and license/source note.

- [ ] **Step 3: Run component tests**

Run:

```bash
npm run test -- src/components/DataBasisPanel.test.tsx src/components/ReportView.test.tsx
```

Expected: PASS.

---

### Task 4: 제출 문서 보강, 검증, 배포

**Files:**
- Modify: `docs/contest/openapi-usage-evidence.md`
- Modify: `docs/contest/submission-checklist.md`

**Interfaces:**
- Consumes: TourAPI 활용 신청 매뉴얼 v3.3 요건
- Produces: 집/제출용 운영계정 신청 체크 문서

- [ ] **Step 1: Update docs**

Add a section with public URL, API operation list, development account limit, operating account approval timing, 24-month usage period, and license/source display note.

- [ ] **Step 2: Verify**

Run:

```bash
npm run test -- src/components/DataBasisPanel.test.tsx src/components/ReportView.test.tsx src/services/metricEvidence.test.ts
npm run build
```

Expected: PASS.

- [ ] **Step 3: Commit, push, deploy**

Run:

```bash
git add docs/superpowers/specs/2026-07-28-tourapi-operations-evidence-design.md docs/superpowers/plans/2026-07-28-tourapi-operations-evidence.md src/components/DataBasisPanel.tsx src/components/DataBasisPanel.test.tsx src/components/ReportView.tsx src/components/ReportView.test.tsx src/services/metricEvidence.ts src/services/metricEvidence.test.ts docs/contest/openapi-usage-evidence.md docs/contest/submission-checklist.md
git commit -m "feat: show TourAPI operations evidence"
git push origin main
```

Deploy to `cwuser@100.104.94.112` Docker container `fest-twin-demo` and verify `https://cwserver.tail97dbc3.ts.net/`.

## Self-Review

- Spec coverage: 매뉴얼의 개발계정 제한, 운영계정 승인, 활용 URL, 호출 이력, 라이선스 표기 요건을 모두 포함한다.
- Placeholder scan: 계획 본문에 미정 문구나 추상 작업 없음.
- Type consistency: 기존 `MetricEvidenceSourceDetail`, `DataBasisPanel`, `ReportView` 인터페이스만 사용한다.
