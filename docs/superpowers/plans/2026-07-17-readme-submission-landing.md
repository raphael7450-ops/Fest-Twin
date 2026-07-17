# README Submission Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the public GitHub README work as the first submission landing page.

**Architecture:** This is a documentation-only change. Keep existing README detail sections intact and replace the top quick links with a clearer submission-first entry section.

**Tech Stack:** Markdown, existing repository docs and artifact paths.

## Global Constraints

- Do not expose concrete TourAPI keys, SSH passwords, Tailscale credentials, or GitHub tokens.
- Keep all new copy in Korean because the submission documents are Korean.
- Do not change app source, server source, Docker files, or deployment configuration.
- Preserve existing public demo URL: `https://cwserver.tail97dbc3.ts.net/`.
- Preserve existing submission zip path: `artifacts/fest-twin-submission-package.zip`.

---

### Task 1: README Submission Landing

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: existing docs under `docs/` and zip under `artifacts/`.
- Produces: public README entry section for judges and teammates.

- [ ] **Step 1: Replace the top quick-link section**

Update the existing `## 빠른 데모 확인` section into `## 제출 바로가기` and include these links:

```markdown
## 제출 바로가기

- 공개 데모: https://cwserver.tail97dbc3.ts.net/
- GitHub 저장소: https://github.com/raphael7450-ops/Fest-Twin
- 최종 제출 패키지: [페스트트윈 최종 제출 패키지](docs/final-submission-package.md)
- 제출 체크리스트: [페스트트윈 최종 제출 체크리스트](docs/final-submission-checklist.md)
- 제출 zip: [fest-twin-submission-package.zip](artifacts/fest-twin-submission-package.zip)
- 제출 요약: [제출 요약서](docs/submission-summary.md)
- 시연 순서: [제출 시연 가이드](docs/submission-demo-guide.md)
```

- [ ] **Step 2: Add current verification bullets**

Add a short `현재 공개 검증 상태` subsection:

```markdown
## 현재 공개 검증 상태

- 공개 데모 HTTP 200 확인
- TourAPI `festivals`, `detail` 프록시 응답 `resultCode=0000` 확인
- Docker 이미지: `fest-twin-demo:20260717092936`
- 최종 제출 zip은 `docs/...`와 `docs/assets/submission/...` 경로 구조를 유지
- 저장소 공개 접근 확인
```

- [ ] **Step 3: Update merged PR links**

Add PR #1 through #5 in a compact list.

- [ ] **Step 4: Verify links and status**

Run:

```powershell
Test-Path docs/final-submission-package.md
Test-Path docs/final-submission-checklist.md
Test-Path artifacts/fest-twin-submission-package.zip
curl.exe -I --max-time 30 https://github.com/raphael7450-ops/Fest-Twin
curl.exe --resolve cwserver.tail97dbc3.ts.net:443:103.84.155.153 -I --max-time 30 https://cwserver.tail97dbc3.ts.net/
```

Expected: all `Test-Path` commands return `True`, and both HTTP checks return `200 OK`.

- [ ] **Step 5: Commit**

```powershell
git add README.md docs/superpowers/specs/2026-07-17-readme-submission-landing-design.md docs/superpowers/plans/2026-07-17-readme-submission-landing.md
git commit -m "docs: improve README submission landing"
```
