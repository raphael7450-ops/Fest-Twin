# Social Trends Service Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 2026년 9월 21일 제출판 Fest-Twin에 TourAPI 필수 활용 흐름과 Naver DataLab 검색량 기반 사전 관심도 지표를 안정적으로 포함한다.

**Architecture:** 기존 React/Vite, Express 프록시, SQLite 저장소 구조를 유지한다. Trend 기능은 서버 프록시, 클라이언트 어댑터, 예측 보정, 근거 UI, 보고서 출력으로 나누며, Naver DataLab은 제출판 필수 보조 지표로, YouTube는 선택 보조 지표로, Instagram/X는 v2.0 확장으로 분리한다.

**Tech Stack:** React 18, TypeScript, Vite 6, Express, SQLite, Docker, GitHub Actions, 한국관광공사 TourAPI 4.0, Naver DataLab 통합검색어 트렌드 API, 선택적 YouTube Data API.

## Global Constraints

- 2026년 9월 21일 16:00까지 최종 서비스 URL과 기능설명서를 제출할 수 있어야 한다.
- 한국관광공사 OpenAPI 활용은 필수이며, 파일 데이터만 활용한 구현은 인정되지 않는다.
- Naver DataLab 검색량은 실제 방문객 집계값이 아니라 사전 관심도 보정 지표로만 사용한다.
- 브라우저에는 TourAPI, Naver DataLab, YouTube API 비밀키를 노출하지 않는다.
- API 실패, 키 미설정, 응답 부족 상황에서도 대시보드와 보고서가 깨지지 않아야 한다.
- 화면과 보고서에는 실제 조회, 검증 스냅샷, 샘플 대체 상태가 명확히 표시되어야 한다.
- Instagram/X 실시간 연동은 제출판 완료 기능으로 표현하지 않고 v2.0 확장 예정으로 문서화한다.

---

## File Structure

- Create: `docs/contest/september-service-roadmap.md` - 9월 21일 제출까지의 제품화 일정
- Create: `docs/contest/openapi-usage-evidence.md` - TourAPI와 검색량 보조 API 활용 증빙
- Create: `docs/contest/feature-description.md` - 기능설명서 제출 초안
- Modify: `docs/contest/submission-checklist.md` - 제출 전 필수 검증 항목 추가
- Modify: `server/index.js` - trend 프록시 라우터 연결
- Create: `server/trendProxy.js` - Naver DataLab 서버 프록시
- Create: `server/trendProxy.test.ts` - 프록시 보안, Fallback, 응답 정규화 테스트
- Modify: `src/domain/types.ts` - TrendContext 확장
- Modify: `src/data/sampleTrends.ts` - 검색량 Fallback 샘플 구조 정리
- Modify: `src/services/trendAdapter.ts` - Naver DataLab 우선 조회와 Fallback 정규화
- Modify: `src/services/forecast.ts` - 검색량 보정 계수 적용
- Modify: `src/services/metricEvidence.ts` - 검색량 보정 근거와 한계 표시
- Modify: `src/components/DataBasisPanel.tsx` - 검색량 데이터 상태 표시
- Modify: `src/components/MetricEvidenceDrawer.tsx` - 관심도 근거 단계 표시
- Modify: `src/components/ReportView.tsx` - 활용 API와 사전 관심도 근거 출력
- Modify: `scripts/deploy-check.js` - Trend API 헬스체크 추가

---

### Task 1: 제출 문서 안정화

**Files:**
- Create: `docs/contest/september-service-roadmap.md`
- Create: `docs/contest/openapi-usage-evidence.md`
- Create: `docs/contest/feature-description.md`
- Modify: `docs/contest/submission-checklist.md`

**Interfaces:**
- Consumes: OT 자료 제출 기준, social trends design spec
- Produces: 구현과 제출 검증의 기준 문서

- [ ] **Step 1: Create roadmap document**

Create `docs/contest/september-service-roadmap.md` with service cut line, week-by-week milestones, and final freeze checklist.

- [ ] **Step 2: Create OpenAPI evidence document**

Create `docs/contest/openapi-usage-evidence.md` with exact API names, service usage position, evidence screenshot target, and secret handling rule.

- [ ] **Step 3: Create feature description draft**

Create `docs/contest/feature-description.md` with service name, type, target users, key functions, TourAPI usage, Naver DataLab usage, and limitations.

- [ ] **Step 4: Extend submission checklist**

Append a September 21 final submission section to `docs/contest/submission-checklist.md`.

- [ ] **Step 5: Verify documents**

Run: `rg -n "<agent-defined-placeholder-pattern>" docs/contest`

Expected: no placeholder wording in the new submission documents.

- [ ] **Step 6: Commit**

```bash
git add docs/contest/september-service-roadmap.md docs/contest/openapi-usage-evidence.md docs/contest/feature-description.md docs/contest/submission-checklist.md docs/superpowers/plans/2026-07-28-social-trends-service-stabilization.md
git commit -m "docs: add social trends service stabilization plan"
```

---

### Task 2: Naver DataLab 서버 프록시

**Files:**
- Create: `server/trendProxy.js`
- Create: `server/trendProxy.test.ts`
- Modify: `server/index.js`

**Interfaces:**
- Consumes: `NAVER_DATALAB_CLIENT_ID`, `NAVER_DATALAB_CLIENT_SECRET`
- Produces: `POST /api/trends/naver-search`

- [ ] **Step 1: Write failing proxy tests**

Add tests that verify missing credentials return a safe fallback response, unsupported body fields are rejected, and response JSON never includes client secret fields.

- [ ] **Step 2: Run failing tests**

Run: `npm run test -- server/trendProxy.test.ts`

Expected: FAIL because `server/trendProxy.js` does not exist.

- [ ] **Step 3: Implement proxy**

Create an Express router that accepts `startDate`, `endDate`, `timeUnit`, and `keywordGroups`, forwards to Naver DataLab with server-side credentials, normalizes result points, and returns a safe Fallback response when credentials are missing.

- [ ] **Step 4: Mount router**

Mount `app.use("/api/trends", openApiRateLimiter, createTrendProxyRouter(...))` in `server/index.js`.

- [ ] **Step 5: Verify**

Run: `npm run test -- server/trendProxy.test.ts server/index.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/trendProxy.js server/trendProxy.test.ts server/index.js
git commit -m "feat: add Naver DataLab trend proxy"
```

---

### Task 3: TrendContext 어댑터와 예측 보정

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/data/sampleTrends.ts`
- Modify: `src/services/trendAdapter.ts`
- Modify: `src/services/forecast.ts`
- Test: `src/services/forecast.test.ts`

**Interfaces:**
- Consumes: `POST /api/trends/naver-search`
- Produces: `TrendContext.searchInterestScore`, `TrendContext.trendAcceleration`, forecast trend correction

- [ ] **Step 1: Write failing forecast tests**

Add tests that verify high search interest increases expected visitors within the cap and low search interest does not reduce visitors below the floor.

- [ ] **Step 2: Run failing tests**

Run: `npm run test -- src/services/forecast.test.ts`

Expected: FAIL until TrendContext fields and correction are implemented.

- [ ] **Step 3: Extend TrendContext**

Add `sourceStatus`, `sourceName`, `basisLabel`, `keywordGroups`, `searchInterestScore`, `trendAcceleration`, `points`, `fallbackReason`, and `sourceDetails`.

- [ ] **Step 4: Update adapter**

Make `getTrendContext(plan)` call `/api/trends/naver-search` when running in a browser and fall back to `sampleTrendContext` on failure.

- [ ] **Step 5: Apply correction**

Apply this bounded correction in `createForecast`:

```ts
const trendBoost = clamp((trends.searchInterestScore - 50) / 100 * 0.18, -0.08, 0.18);
const accelerationBoost = clamp(trends.trendAcceleration / 100 * 0.12, -0.05, 0.12);
```

- [ ] **Step 6: Verify**

Run: `npm run test -- src/services/forecast.test.ts src/services/dataAdapters.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/domain/types.ts src/data/sampleTrends.ts src/services/trendAdapter.ts src/services/forecast.ts src/services/forecast.test.ts
git commit -m "feat: apply search trend correction to forecast"
```

---

### Task 4: 화면과 보고서 근거 표시

**Files:**
- Modify: `src/components/DataBasisPanel.tsx`
- Modify: `src/components/MetricEvidenceDrawer.tsx`
- Modify: `src/components/ReportView.tsx`
- Modify: `src/services/metricEvidence.ts`
- Test: `src/services/metricEvidence.test.ts`
- Test: `src/components/ReportView.test.tsx`

**Interfaces:**
- Consumes: `TrendContext` from Task 3
- Produces: KPI/evidence/report에서 검색량 근거와 한계 문구 표시

- [ ] **Step 1: Write failing evidence tests**

Add a test requiring evidence text to include `Naver DataLab`, `사전 관심도`, and `실제 방문객 집계값이 아닌 보정 지표`.

- [ ] **Step 2: Run failing tests**

Run: `npm run test -- src/services/metricEvidence.test.ts src/components/ReportView.test.tsx`

Expected: FAIL until UI/report evidence is wired.

- [ ] **Step 3: Update metric evidence**

Add search interest and trend acceleration as contributors to expected visitor evidence.

- [ ] **Step 4: Update UI**

Render trend status in `DataBasisPanel` and detailed steps in `MetricEvidenceDrawer`.

- [ ] **Step 5: Update report**

Add “사전 관심도 및 검색량 근거” section to `ReportView`.

- [ ] **Step 6: Verify**

Run: `npm run test -- src/services/metricEvidence.test.ts src/components/ReportView.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/DataBasisPanel.tsx src/components/MetricEvidenceDrawer.tsx src/components/ReportView.tsx src/services/metricEvidence.ts src/services/metricEvidence.test.ts src/components/ReportView.test.tsx
git commit -m "feat: show search trend evidence in dashboard"
```

---

### Task 5: 배포 검증과 최종 제출 패키지

**Files:**
- Modify: `scripts/deploy-check.js`
- Modify: `docs/guides/demo-and-operations.md`
- Modify: `docs/contest/submission-checklist.md`

**Interfaces:**
- Consumes: deployed public URL
- Produces: submit-ready verification checklist

- [ ] **Step 1: Add deploy check**

Add checks for `/api/trends/naver-search` fallback-safe response and public homepage.

- [ ] **Step 2: Update demo script**

Add a 5-minute final rehearsal script covering TourAPI candidate lookup and Naver DataLab interest evidence.

- [ ] **Step 3: Run full verification**

Run:

```bash
npm test
npm run build
npm run test:load
npm run deploy:check
```

Expected: PASS.

- [ ] **Step 4: Deploy**

Run: `npm run deploy:remote`

Expected: remote Docker site updates and public URL serves the new build.

- [ ] **Step 5: Commit and push**

```bash
git add scripts/deploy-check.js docs/guides/demo-and-operations.md docs/contest/submission-checklist.md
git commit -m "chore: verify social trend submission readiness"
git push origin main
```

---

## Self-Review

- Spec coverage: 제출 안정화, TourAPI 필수 활용, Naver DataLab 검색량, YouTube 선택, Instagram/X v2.0 분리, Fallback 표시, 보고서 증빙을 모두 포함했다.
- Placeholder scan: 미작성 항목을 의미하는 placeholder 문구는 계획 본문에 없다.
- Type consistency: `TrendContext`, `TrendSourceStatus`, `searchInterestScore`, `trendAcceleration`, `sourceDetails` 이름을 일관되게 사용한다.
