# Public Demo Funnel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose the existing Fest-Twin internal Docker demo through a public HTTPS Tailscale Funnel URL without changing app code or exposing TourAPI secrets.

**Architecture:** Keep the running `fest-twin-demo` container on `127.0.0.1:18080`. Configure Tailscale Serve/Funnel on the remote server to reverse proxy public HTTPS traffic to that local port. Record the resulting public URL and rollback commands in repository docs.

**Tech Stack:** Tailscale CLI, Docker, Node/Express static app, PowerShell local shell, SSH remote shell, Markdown documentation.

## Global Constraints

- Internal demo URL remains `http://192.168.55.223:18080/`.
- Docker container name remains `fest-twin-demo`.
- Docker port mapping remains `18080:80`.
- TourAPI 인증키는 서버의 런타임 env 파일에서만 주입한다.
- Do not modify unrelated Docker containers or services on the remote server.
- Do not commit SSH passwords, TourAPI keys, or Tailscale auth data.
- Public Funnel URL is temporary demo infrastructure, not long-term production hosting.

---

## File Structure

- Create: `docs/public-demo-funnel.md`
  - Purpose: Operator-facing Korean runbook for public demo URL, verification, and rollback.
- Modify: `README.md`
  - Purpose: Add public demo URL near the existing quick demo section after the URL is known.
- Modify: `docs/submission-summary.md`
  - Purpose: Add public demo URL and distinguish it from the internal demo URL.
- Modify: `docs/submission-demo-guide.md`
  - Purpose: Add the public URL as the primary external reviewer entry point.
- Modify: `docs/demo-verification.md`
  - Purpose: Record server/Funnel verification results without secrets.

### Task 1: Remote Server Preflight

**Files:**
- No file changes.

**Interfaces:**
- Consumes: Existing SSH access to `cwuser@192.168.55.223`.
- Produces: Confirmed values for container status, Tailscale hostname, and local HTTP health.

- [ ] **Step 1: Confirm local git branch is clean**

Run:

```powershell
git status --short --branch
```

Expected:

```text
## codex/public-demo-funnel
```

- [ ] **Step 2: Check remote Tailscale and Docker state**

Run:

```powershell
ssh -o BatchMode=yes cwuser@192.168.55.223 'set -eu
echo "== tailscale status =="
tailscale status --self
echo "== tailscale ip =="
tailscale ip -4
echo "== serve status =="
tailscale serve status || true
echo "== funnel status =="
tailscale funnel status || true
echo "== docker demo =="
docker ps --filter name=fest-twin-demo --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}"
echo "== local http =="
curl -fsSI --max-time 10 http://127.0.0.1:18080/ | head -n 1
'
```

Expected:

```text
== local http ==
HTTP/1.1 200 OK
```

Also expect one `fest-twin-demo` row. If SSH fails with `Permission denied` or BatchMode key failure, stop and ask the user to confirm SSH key access.

- [ ] **Step 3: Capture the Tailscale DNS name**

Run:

```powershell
ssh -o BatchMode=yes cwuser@192.168.55.223 'tailscale status --json | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get(\"Self\",{}).get(\"DNSName\", \"\"))"'
```

Expected: one DNS name ending in `.ts.net`. Save it for Task 2.

### Task 2: Configure Tailscale Funnel

**Files:**
- No file changes.

**Interfaces:**
- Consumes: Confirmed local service `http://127.0.0.1:18080/` from Task 1.
- Produces: Public HTTPS URL using the server Tailscale DNS name.

- [ ] **Step 1: Configure Serve for local demo port**

Run:

```powershell
ssh -o BatchMode=yes cwuser@192.168.55.223 'set -eu
tailscale serve --bg --yes --https=443 http://127.0.0.1:18080
tailscale serve status
'
```

Expected: Serve status shows HTTPS `443` forwarding to `http://127.0.0.1:18080`.

If output says `Serve is not enabled on your tailnet`, open the Tailscale URL printed by the command while signed in as the Tailnet admin, enable Serve, and rerun this step. The command may wait after printing the URL, so use a remote timeout while diagnosing:

```powershell
ssh -o BatchMode=yes cwuser@192.168.55.223 'timeout 15s tailscale serve --bg --yes --https=443 http://127.0.0.1:18080; tailscale serve status || true'
```

- [ ] **Step 2: Enable Funnel on HTTPS 443**

Run:

```powershell
ssh -o BatchMode=yes cwuser@192.168.55.223 'set -eu
tailscale funnel --bg --yes --https=443 http://127.0.0.1:18080
tailscale funnel status
'
```

Expected: Funnel status shows HTTPS `443` forwarding to `http://127.0.0.1:18080`.

If output says Funnel is disabled by policy, stop and ask the user to enable Funnel in the Tailscale admin console for this tailnet. Do not change Docker.

- [ ] **Step 3: Verify public HTTPS URL**

Replace `<dns-name>` with the DNS name from Task 1.

Run:

```powershell
curl.exe -I --max-time 20 https://<dns-name>
```

Expected:

```text
HTTP/2 200
```

or:

```text
HTTP/1.1 200 OK
```

- [ ] **Step 4: Verify TourAPI proxy through public URL**

Replace `<dns-name>` with the DNS name from Task 1.

Run:

```powershell
curl.exe -sS --max-time 20 "https://<dns-name>/api/tour/festivals?numOfRows=1&pageNo=1&arrange=A&areaCode=1&eventStartDate=20260101&eventEndDate=20261231"
```

Expected: JSON response with `"resultCode":"0000"` or a valid app-level fallback response. Do not print or store any API key.

### Task 3: Document Public Demo URL

**Files:**
- Create: `docs/public-demo-funnel.md`
- Modify: `README.md`
- Modify: `docs/submission-summary.md`
- Modify: `docs/submission-demo-guide.md`
- Modify: `docs/demo-verification.md`

**Interfaces:**
- Consumes: Public URL from Task 2 as `https://<dns-name>`.
- Produces: Repository documentation that separates public URL, internal URL, verification, and rollback.

- [ ] **Step 1: Create public demo runbook**

Create `docs/public-demo-funnel.md` with this structure, replacing `<public-url>` with the verified URL:

```markdown
# 공개 데모 Tailscale Funnel 운영 문서

## 접속 주소

- 공개 데모: <public-url>
- 내부 데모: http://192.168.55.223:18080/
- 내부 컨테이너: `fest-twin-demo`

## 목적

공모전 제출과 외부 협업 확인을 위해 기존 내부 Docker 데모를 Tailscale Funnel로 임시 공개한다.

## 확인 명령

```bash
tailscale serve status
tailscale funnel status
docker ps --filter name=fest-twin-demo
curl -fsSI http://127.0.0.1:18080/
```

## 중지 명령

```bash
tailscale funnel --https=443 off
tailscale serve --https=443 off
curl -fsSI http://127.0.0.1:18080/
```

## 운영 주의사항

- 공개 데모 URL은 인터넷에서 접근 가능하므로 제출·시연 기간에만 유지한다.
- TourAPI 인증키, SSH 비밀번호, Tailscale 인증 정보는 저장소에 기록하지 않는다.
- 기존 서버의 다른 Docker 컨테이너는 변경하지 않는다.
```

- [ ] **Step 2: Update README quick demo links**

In `README.md`, add one public demo bullet immediately before the existing internal demo bullet:

```markdown
- 공개 데모: <public-url>
- 내부 데모: http://192.168.55.223:18080/
```

- [ ] **Step 3: Update submission summary**

In `docs/submission-summary.md`, add the public demo URL to the submission metadata section:

```markdown
- 공개 데모: <public-url>
- 내부 데모: http://192.168.55.223:18080/
```

- [ ] **Step 4: Update demo guide**

In `docs/submission-demo-guide.md`, add this near the top:

```markdown
- 공개 데모: <public-url>
- 내부 데모: http://192.168.55.223:18080/
```

- [ ] **Step 5: Update verification checklist**

Append a dated section to `docs/demo-verification.md`:

```markdown
## 2026-07-17 공개 데모 Funnel 검증

- 공개 데모 주소: `<public-url>`
- 내부 데모 주소: `http://192.168.55.223:18080/`
- 서버 로컬 응답: `http://127.0.0.1:18080/` HTTP 200
- Funnel 공개 HTTPS 응답: HTTP 200
- TourAPI 프록시: 공개 URL의 `/api/tour/festivals` 경로 응답 확인
- 비밀값 기록 여부: 인증키와 SSH/Tailscale 인증 정보 미기록
```

### Task 4: Verify and Commit

**Files:**
- Verify: `README.md`
- Verify: `docs/public-demo-funnel.md`
- Verify: `docs/submission-summary.md`
- Verify: `docs/submission-demo-guide.md`
- Verify: `docs/demo-verification.md`

**Interfaces:**
- Consumes: Documentation changes from Task 3.
- Produces: Committed public demo documentation and final public URL.

- [ ] **Step 1: Run test suite**

Run:

```powershell
npm test
```

Expected: all Vitest tests pass.

- [ ] **Step 2: Run production build**

Run:

```powershell
npm run build
```

Expected: TypeScript build and Vite build complete successfully.

- [ ] **Step 3: Verify URLs one final time**

Replace `<public-url>` with the verified URL.

Run:

```powershell
curl.exe -I --max-time 20 <public-url>
curl.exe -I --max-time 10 http://192.168.55.223:18080/
```

Expected: both return HTTP 200.

- [ ] **Step 4: Check for secret leakage**

Run:

```powershell
rg -n "TOUR_API_KEY=.*[0-9a-fA-F]{20,}|password|비밀번호" README.md docs server src Dockerfile .dockerignore package.json
```

Expected: no matches for actual secret values. Literal references to `TOUR_API_KEY` without values or placeholder values are acceptable.

- [ ] **Step 5: Commit documentation**

Run:

```powershell
git add README.md docs/public-demo-funnel.md docs/submission-summary.md docs/submission-demo-guide.md docs/demo-verification.md docs/superpowers/plans/2026-07-17-public-demo-funnel.md
git commit -m "docs: add public demo funnel runbook"
```

Expected: commit succeeds on `codex/public-demo-funnel`.
