# Final Submission Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a final Korean submission package with copy-ready text, links, checklist, screenshots, and a zip archive.

**Architecture:** Keep app code unchanged. Add two Markdown documents under `docs/` and generate one local zip artifact under `artifacts/` containing the submission docs and screenshot assets.

**Tech Stack:** Markdown, PowerShell `Compress-Archive`, existing docs/assets.

## Global Constraints

- 공개 데모: `https://cwserver.tail97dbc3.ts.net/`
- GitHub 저장소: `https://github.com/raphael7450-ops/Fest-Twin`
- 내부 데모 URL은 보조 정보로만 제공한다.
- 실제 TourAPI 키, SSH 비밀번호, Tailscale 인증 정보는 기록하지 않는다.
- 앱 UI, 공개 URL, TourAPI 키는 변경하지 않는다.

---

## File Structure

- Create: `docs/final-submission-package.md`
  - Purpose: Copy-ready final submission text and evidence links.
- Create: `docs/final-submission-checklist.md`
  - Purpose: Pre-submit checklist.
- Create: `artifacts/fest-twin-submission-package.zip`
  - Purpose: Local packaged copy of core submission docs and screenshots.

### Task 1: Create Final Submission Documents

**Files:**
- Create: `docs/final-submission-package.md`
- Create: `docs/final-submission-checklist.md`

**Interfaces:**
- Consumes: `docs/contest-submission-copy.md`, `docs/submission-summary.md`, `docs/submission-demo-guide.md`, `docs/demo-verification.md`, `docs/assets/submission/*`.
- Produces: Copy-ready final submission docs.

- [ ] **Step 1: Create final package document**

Create `docs/final-submission-package.md` with:

```markdown
# 페스트트윈 최종 제출 패키지

## 제출 기본 정보

- 작품명: 페스트트윈(Fest-Twin)
- 지정과제: 9번, 축제 수요 예측 실패 및 주관적 경험 의존형 기획으로 인한 예산 낭비·만족도 저하 문제
- 공개 데모: https://cwserver.tail97dbc3.ts.net/
- GitHub 저장소: https://github.com/raphael7450-ops/Fest-Twin
- 내부 데모: http://192.168.55.223:18080/

## 제출 폼 입력용 문구

### 한 줄 소개

TourAPI 기반 축제 수요 근거와 혼잡 시뮬레이션을 활용해 지자체의 축제 예산 집행 전 리스크를 사전 진단하는 B2G SaaS MVP입니다.

### 짧은 소개글

페스트트윈은 축제 수요 예측 실패와 주관적 경험 의존형 기획으로 발생하는 예산 낭비, 관광객 쏠림, 만족도 저하 문제를 해결하기 위한 공공기관용 사전 진단 대시보드입니다. 지자체 담당자가 축제 기획안을 입력하면 TourAPI 기반 유사 축제·주변 관광지 근거, 시간대별 예상 방문객, 혼잡 히트맵, 예산·만족도 리스크, 기획 보완 리포트를 한 화면에서 확인할 수 있습니다.

## 심사자 확인 순서

1. 공개 데모 URL을 연다.
2. 상단 `제출 데모 검증 현황` 패널에서 공개 URL, TourAPI 프록시, 보안, 제출 상태를 확인한다.
3. `정부 지침 반영 현황`에서 공공기관 도입 검토 포인트를 확인한다.
4. `데이터 근거`에서 TourAPI 실제 조회 및 샘플 보완 상태를 확인한다.
5. 수요 예측, 혼잡도 시뮬레이션, 주요 리스크, 기획 보완 리포트를 순서대로 확인한다.
6. 시나리오 저장과 리포트 인쇄 흐름을 확인한다.

## 검증 요약

- 공개 데모 HTTP 200 확인
- Docker 이미지: `fest-twin-demo:20260717092936`
- 자동 테스트: 10개 파일, 27개 항목 통과
- 프로덕션 빌드: 정상 완료
- 공개 URL TourAPI `festivals`, `detail` 응답 정상 확인
- 데스크톱·모바일 렌더링에서 제출 검증 패널 표시 및 가로 넘침 없음
- 실제 TourAPI 키, 서버 비밀번호, SSH 비밀번호는 Git과 문서에 기록하지 않음

## 화면 증빙

- `docs/assets/submission/desktop-full.png`
- `docs/assets/submission/header.png`
- `docs/assets/submission/dataBasis.png`
- `docs/assets/submission/forecast.png`
- `docs/assets/submission/heatmap.png`
- `docs/assets/submission/report.png`
- `docs/assets/submission/scenario.png`
- `docs/assets/submission/mobile-viewport.png`

## 함께 제출할 문서

- `docs/contest-submission-copy.md`
- `docs/submission-summary.md`
- `docs/submission-demo-guide.md`
- `docs/demo-verification.md`
- `docs/public-demo-funnel.md`
```

- [ ] **Step 2: Create checklist**

Create `docs/final-submission-checklist.md` with:

```markdown
# 페스트트윈 최종 제출 체크리스트

## 제출 전 필수 확인

- [ ] 공개 데모 `https://cwserver.tail97dbc3.ts.net/` 접속 가능
- [ ] 첫 화면에 `제출 데모 검증 현황` 패널 표시
- [ ] TourAPI `festivals` 프록시 응답 정상
- [ ] TourAPI `detail` 프록시 응답 정상
- [ ] 모바일 화면에서 가로 넘침 없음
- [ ] 제출 폼에 공개 데모 URL 입력
- [ ] GitHub 저장소 URL 입력
- [ ] 작품명 `페스트트윈(Fest-Twin)` 입력
- [ ] 한 줄 소개 문구 입력
- [ ] 짧은 소개글 또는 상세 소개글 입력
- [ ] 화면 증빙 이미지 첨부
- [ ] 실제 TourAPI 키, 서버 비밀번호, SSH 비밀번호 미첨부 확인

## 제출 URL

- 공개 데모: https://cwserver.tail97dbc3.ts.net/
- GitHub 저장소: https://github.com/raphael7450-ops/Fest-Twin
- PR 이력:
  - https://github.com/raphael7450-ops/Fest-Twin/pull/1
  - https://github.com/raphael7450-ops/Fest-Twin/pull/2
  - https://github.com/raphael7450-ops/Fest-Twin/pull/3

## 첨부 추천 파일

- `docs/final-submission-package.md`
- `docs/contest-submission-copy.md`
- `docs/submission-summary.md`
- `docs/submission-demo-guide.md`
- `docs/demo-verification.md`
- `docs/assets/submission/*.png`
- `artifacts/fest-twin-submission-package.zip`
```

### Task 2: Build Zip Artifact and Verify

**Files:**
- Create: `artifacts/fest-twin-submission-package.zip`

**Interfaces:**
- Consumes: Final docs from Task 1 and existing screenshot assets.
- Produces: Zip artifact for local submission packaging.

- [ ] **Step 1: Create artifact directory**

Run:

```powershell
New-Item -ItemType Directory -Force artifacts | Out-Null
```

- [ ] **Step 2: Create zip package**

Run:

```powershell
$files = @(
  "README.md",
  "docs/final-submission-package.md",
  "docs/final-submission-checklist.md",
  "docs/contest-submission-copy.md",
  "docs/submission-summary.md",
  "docs/submission-demo-guide.md",
  "docs/demo-verification.md",
  "docs/public-demo-funnel.md",
  "docs/assets/submission/desktop-full.png",
  "docs/assets/submission/header.png",
  "docs/assets/submission/dataBasis.png",
  "docs/assets/submission/forecast.png",
  "docs/assets/submission/heatmap.png",
  "docs/assets/submission/report.png",
  "docs/assets/submission/scenario.png",
  "docs/assets/submission/mobile-viewport.png"
)
Compress-Archive -Path $files -DestinationPath artifacts/fest-twin-submission-package.zip -Force
```

- [ ] **Step 3: Verify package and live demo**

Run:

```powershell
Get-Item artifacts/fest-twin-submission-package.zip
curl.exe -I --max-time 30 https://cwserver.tail97dbc3.ts.net/
curl.exe -sS --max-time 30 "https://cwserver.tail97dbc3.ts.net/api/tour/festivals?numOfRows=1&pageNo=1&arrange=A&areaCode=1&eventStartDate=20260101&eventEndDate=20261231" | Select-String '"resultCode":"0000"'
rg -n "TOUR_API_KEY=.*[0-9a-fA-F]{20,}|password|비밀번호" README.md docs server src Dockerfile .dockerignore package.json
```

Expected:

- zip file exists
- public URL returns HTTP 200
- TourAPI response contains `resultCode=0000`
- secret search returns no matches

- [ ] **Step 4: Commit**

Run:

```powershell
git add docs/final-submission-package.md docs/final-submission-checklist.md docs/superpowers/plans/2026-07-17-final-submission-package.md artifacts/fest-twin-submission-package.zip
git commit -m "docs: add final submission package"
```
