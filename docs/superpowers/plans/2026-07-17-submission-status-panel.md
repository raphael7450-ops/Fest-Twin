# Submission Status Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a top-of-dashboard submission demo verification panel that makes the public demo URL, TourAPI proxy verification, secret handling, and submission readiness visible in the app itself.

**Architecture:** Add a focused React component under `src/components/SubmissionStatusPanel.tsx`, render it in `src/App.tsx` immediately below `GovernmentHeader`, and add scoped CSS classes in `src/styles.css`. Extend the existing app render test to assert the new panel text appears without changing the TourAPI loading flow.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Testing Library, CSS.

## Global Constraints

- 공개 데모 URL: `https://cwserver.tail97dbc3.ts.net/`
- 내부 데모 URL: `http://192.168.55.223:18080/`
- TourAPI 프록시는 서버의 `/api/tour/*` 경로에서 동작한다.
- 컴포넌트에는 실제 TourAPI 키, SSH 비밀번호, Tailscale 인증 정보 등 비밀값을 넣지 않는다.
- 상단에 제출 검증 패널이 표시된다.
- 모바일에서도 카드가 한 열로 정리되고 가로 넘침이 없다.
- 기존 정부 지침, 데이터 근거, 예측, 히트맵, 리포트 흐름이 유지된다.

---

## File Structure

- Create: `src/components/SubmissionStatusPanel.tsx`
  - Purpose: Render static submission verification cards and public demo link.
- Modify: `src/App.tsx`
  - Purpose: Import and render the panel below `GovernmentHeader`.
- Modify: `src/styles.css`
  - Purpose: Add responsive grid and card styles for the submission panel.
- Modify: `src/App.test.tsx`
  - Purpose: Assert that the new panel renders on the dashboard.

### Task 1: Add Submission Status Panel Component

**Files:**
- Create: `src/components/SubmissionStatusPanel.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: Existing `App` component layout and global CSS utility classes `panel` and `panel-heading`.
- Produces: `SubmissionStatusPanel(): JSX.Element`, imported by `src/App.tsx`.

- [ ] **Step 1: Add failing render assertions**

Edit `src/App.test.tsx` inside `renders the government-guided Fest-Twin MVP dashboard` and add these assertions after the `정부 지침 반영 현황` assertion:

```tsx
expect(screen.getByText("제출 데모 검증 현황")).toBeInTheDocument();
expect(screen.getByText("공개 데모")).toBeInTheDocument();
expect(screen.getByText("TourAPI 프록시")).toBeInTheDocument();
expect(screen.getByText("인증키는 서버 런타임 환경변수로만 주입")).toBeInTheDocument();
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm test -- src/App.test.tsx
```

Expected: FAIL because `제출 데모 검증 현황` is not rendered yet.

- [ ] **Step 3: Create component**

Create `src/components/SubmissionStatusPanel.tsx`:

```tsx
const submissionStatuses = [
  {
    label: "공개 데모",
    value: "cwserver.tail97dbc3.ts.net",
    detail: "Tailscale Funnel HTTPS 공개 URL",
    href: "https://cwserver.tail97dbc3.ts.net/",
  },
  {
    label: "TourAPI 프록시",
    value: "festivals/detail resultCode=0000",
    detail: "브라우저는 서버의 /api/tour/* 경로만 호출",
  },
  {
    label: "보안",
    value: "인증키는 서버 런타임 환경변수로만 주입",
    detail: "Git, 브라우저 번들, 제출 문서에 비밀값 미기록",
  },
  {
    label: "제출 상태",
    value: "문서·스크린샷·공개 URL 검증 완료",
    detail: "제출 요약서, 시연 가이드, 검증 체크리스트 정리",
  },
];

export function SubmissionStatusPanel() {
  return (
    <section className="panel submission-status-panel" aria-labelledby="submission-status-title">
      <div className="panel-heading">
        <div>
          <h2 id="submission-status-title">제출 데모 검증 현황</h2>
          <span>공개 URL과 공공데이터 연동 상태</span>
        </div>
        <a className="status-link" href="https://cwserver.tail97dbc3.ts.net/" target="_blank" rel="noreferrer">
          공개 데모 열기
        </a>
      </div>
      <div className="submission-status-grid">
        {submissionStatuses.map((item) => (
          <article className="submission-status-card" key={item.label}>
            <span>{item.label}</span>
            {item.href ? (
              <a href={item.href} target="_blank" rel="noreferrer">
                {item.value}
              </a>
            ) : (
              <strong>{item.value}</strong>
            )}
            <small>{item.detail}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Render component in App**

Edit `src/App.tsx` imports:

```tsx
import { SubmissionStatusPanel } from "./components/SubmissionStatusPanel";
```

Render immediately after `GovernmentHeader`:

```tsx
<GovernmentHeader />
<SubmissionStatusPanel />
<GovernmentReadinessPanel />
```

- [ ] **Step 5: Add styles**

Edit `src/styles.css`. Add `.submission-status-card` to the shared card rule:

```css
.government-header,
.panel,
.metric-card,
.recommendation,
.guideline-card,
.submission-status-card {
  background: white;
  border: 1px solid #d9e1ec;
  border-radius: 8px;
}
```

Add after `.status-pill`:

```css
.status-link {
  background: #17456f;
  border-radius: 7px;
  color: white;
  flex: 0 0 auto;
  font-size: 13px;
  font-weight: 800;
  min-height: 36px;
  padding: 8px 12px;
  text-decoration: none;
}

.submission-status-panel {
  margin-bottom: 16px;
}

.submission-status-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.submission-status-card {
  display: grid;
  gap: 7px;
  padding: 14px;
}

.submission-status-card span,
.submission-status-card strong,
.submission-status-card a,
.submission-status-card small {
  display: block;
}

.submission-status-card span {
  color: #5d6b82;
  font-size: 13px;
  font-weight: 800;
}

.submission-status-card strong,
.submission-status-card a {
  color: #172033;
  font-size: 16px;
  font-weight: 850;
  overflow-wrap: anywhere;
  text-decoration: none;
}

.submission-status-card a:hover,
.status-link:hover {
  text-decoration: underline;
}

.submission-status-card small {
  color: #5d6b82;
  line-height: 1.45;
}
```

In `@media (max-width: 1180px)`, include `.submission-status-grid`:

```css
.workspace-grid,
.summary-grid,
.score-table,
.recommendation-grid,
.guideline-grid,
.submission-status-grid {
  grid-template-columns: 1fr 1fr;
}
```

In `@media (max-width: 760px)`, include `.submission-status-grid` and `.status-link`:

```css
.workspace-grid,
.summary-grid,
.score-table,
.recommendation-grid,
.guideline-grid,
.submission-status-grid {
  grid-template-columns: 1fr;
}

.status-link {
  text-align: center;
}
```

In `@media print`, hide the status panel:

```css
.government-header,
.panel:not(.report-panel),
.summary-grid,
.workspace-grid,
.print-button {
  display: none;
}
```

This existing selector already hides `.submission-status-panel` because it has `panel` and is not `report-panel`.

- [ ] **Step 6: Run focused test**

Run:

```powershell
npm test -- src/App.test.tsx
```

Expected: PASS for `src/App.test.tsx`.

- [ ] **Step 7: Commit**

Run:

```powershell
git add src/App.tsx src/App.test.tsx src/components/SubmissionStatusPanel.tsx src/styles.css docs/superpowers/plans/2026-07-17-submission-status-panel.md
git commit -m "feat: add submission status panel"
```

### Task 2: Verify, Deploy, and Document

**Files:**
- Modify: `docs/demo-verification.md`

**Interfaces:**
- Consumes: Built app with `SubmissionStatusPanel`.
- Produces: Updated public Docker demo serving the new panel.

- [ ] **Step 1: Run full tests**

Run:

```powershell
npm test
```

Expected: 10 files and 27 or more tests pass.

- [ ] **Step 2: Run production build**

Run:

```powershell
npm run build
```

Expected: TypeScript and Vite build pass.

- [ ] **Step 3: Build Docker image locally**

Run:

```powershell
$tag = "fest-twin-demo:$(Get-Date -Format yyyyMMddHHmmss)"
docker build -t $tag .
$tag
```

Expected: Docker image build succeeds and prints a `fest-twin-demo:<timestamp>` tag.

- [ ] **Step 4: Save and upload image**

Replace `<tag>` with the tag from Step 3.

Run:

```powershell
docker save <tag> -o fest-twin-demo.tar
scp .\fest-twin-demo.tar cwuser@192.168.55.223:~/fest-twin-demo.tar
Remove-Item .\fest-twin-demo.tar
```

Expected: upload completes.

- [ ] **Step 5: Load and replace managed container**

Replace `<tag>` with the tag from Step 3.

Run:

```powershell
ssh -o BatchMode=yes cwuser@192.168.55.223 'set -eu
docker load -i "$HOME/fest-twin-demo.tar"
docker inspect fest-twin-demo --format "{{ index .Config.Labels \"com.fest-twin.managed-by\" }}" | grep -x "fest-twin-internal-demo"
docker rm -f fest-twin-demo
docker run -d --name fest-twin-demo --env-file "$HOME/fest-twin-demo.env" --label com.fest-twin.managed-by=fest-twin-internal-demo --restart unless-stopped -p 18080:80 <tag>
curl -fsSI --max-time 10 http://127.0.0.1:18080/
'
```

Expected: new container starts and local HTTP returns 200.

- [ ] **Step 6: Verify public panel text**

Run:

```powershell
$html = curl.exe -sS --max-time 30 https://cwserver.tail97dbc3.ts.net/
$asset = [regex]::Match($html, 'src="([^"]+index-[^"]+\.js)"').Groups[1].Value
curl.exe -sS --max-time 30 "https://cwserver.tail97dbc3.ts.net$asset" | Select-String "제출 데모 검증 현황"
curl.exe -sS --max-time 30 "https://cwserver.tail97dbc3.ts.net/api/tour/detail?contentId=3439947" | Select-String '"resultCode":"0000"'
```

Expected: both commands print a match.

- [ ] **Step 7: Update demo verification document**

Append to `docs/demo-verification.md`:

```markdown

## 2026-07-17 제출 검증 패널 배포 확인

- 공개 데모 주소: `https://cwserver.tail97dbc3.ts.net/`
- 상단 패널: `제출 데모 검증 현황` 표시 확인
- 공개 URL TourAPI detail 프록시: `resultCode=0000`
- Docker 컨테이너: `fest-twin-demo` 재배포 완료
- 비밀값 기록 여부: 인증키와 SSH/Tailscale 인증 정보 미기록
```

- [ ] **Step 8: Final checks and commit**

Run:

```powershell
npm test
npm run build
rg -n "TOUR_API_KEY=.*[0-9a-fA-F]{20,}|password|비밀번호" README.md docs server src Dockerfile .dockerignore package.json
git add docs/demo-verification.md
git commit -m "docs: record submission status panel deployment"
```

Expected: tests and build pass, secret search returns no matches, commit succeeds.
