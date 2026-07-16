# Internal Docker Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package Fest-Twin as an internal-demo Docker deployment served by Nginx on `http://192.168.55.223:18080`.

**Architecture:** Build the Vite app with Node in a Docker build stage, then copy the generated `dist/` assets into an `nginx:alpine` runtime image. Keep deployment as a static SPA container named `fest-twin-demo`, with host port `18080` mapped to container port `80`. Document server commands so deployment can be executed manually without embedding SSH passwords or TourAPI keys in the repository.

**Tech Stack:** Docker, Node 20 Alpine, npm ci, Vite build, Nginx Alpine, React static assets.

## Global Constraints

- Internal demo URL is `http://192.168.55.223:18080`.
- Container name is `fest-twin-demo`.
- Host port is `18080`.
- Container port is `80`.
- Base runtime image is `nginx:alpine`.
- Do not add or commit the actual TourAPI key.
- Do not put server password, SSH password, or secrets in Dockerfile, docs, scripts, or Git history.
- `.env.local` must not be copied into the Docker image or Docker build context.
- Do not modify existing server containers such as `autochart-nginx`, `nextcloud`, `open-webui`, or service containers.
- Do not add HTTPS, domain setup, CI/CD, database, backend API, or server proxy in this phase.
- The app must still work without a TourAPI key through existing sample fallback.
- SPA reloads must route back to `/index.html`.

---

## File Structure

- Create `Dockerfile`: multi-stage build from `node:20-alpine` to `nginx:alpine`.
- Create `.dockerignore`: exclude dependency folders, build outputs, local env files, Git metadata, and local TypeScript build artifacts from Docker context.
- Create `nginx.conf`: static serving plus SPA fallback.
- Create `docs/internal-docker-deploy.md`: exact manual deployment, redeploy, verify, stop, and troubleshoot commands.
- Optionally modify `README.md`: add one link to the internal Docker deployment document if the file has a current docs list.

---

### Task 1: Docker Runtime Files

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`
- Create: `nginx.conf`

**Interfaces:**
- Consumes: existing `package.json`, `package-lock.json`, `npm run build`, Vite `dist/`.
- Produces: Docker image `fest-twin-demo` that serves `/usr/share/nginx/html` through Nginx.

- [ ] **Step 1: Write Dockerfile**

Create `Dockerfile`:

```dockerfile
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 2: Write Docker ignore rules**

Create `.dockerignore`:

```gitignore
.git
.superpowers
node_modules
dist
.env
.env.local
.env.*.local
npm-debug.log*
tsconfig.tsbuildinfo
tsconfig.node.tsbuildinfo
vite.config.js
vite.config.d.ts
vitest.config.js
vitest.config.d.ts
```

- [ ] **Step 3: Write Nginx SPA config**

Create `nginx.conf`:

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(?:css|js|mjs|json|png|jpg|jpeg|gif|svg|ico|webp|woff2?)$ {
        try_files $uri =404;
        access_log off;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

- [ ] **Step 4: Run local app verification before Docker**

Run:

```powershell
npm run test
npm run build
```

Expected:

- `npm run test`: all tests pass.
- `npm run build`: exits 0 and writes `dist/`.

- [ ] **Step 5: Build Docker image**

Run:

```powershell
docker build -t fest-twin-demo .
```

Expected: build exits 0 and creates image `fest-twin-demo`.

- [ ] **Step 6: Commit Task 1**

```powershell
git add Dockerfile .dockerignore nginx.conf
git commit -m "chore: add Docker static deployment files"
```

---

### Task 2: Deployment Documentation

**Files:**
- Create: `docs/internal-docker-deploy.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: Docker image contract from Task 1, container name `fest-twin-demo`, port `18080`.
- Produces: manual server deployment instructions that do not require storing secrets in Git.

- [ ] **Step 1: Create internal deployment doc**

Create `docs/internal-docker-deploy.md`:

```md
# Fest-Twin 내부 Docker 배포

## 목적

Fest-Twin 내부 데모를 `192.168.55.223` 서버에서 Docker 컨테이너로 실행한다.

- 접속 URL: `http://192.168.55.223:18080`
- 컨테이너 이름: `fest-twin-demo`
- 이미지 이름: `fest-twin-demo`
- 포트 매핑: `18080:80`

## 전제 조건

- 서버에 Docker가 설치되어 있어야 한다.
- `18080` 포트가 비어 있어야 한다.
- 실제 TourAPI 키, 서버 비밀번호, SSH 비밀번호는 Git에 저장하지 않는다.
- 내부 데모는 TourAPI 키 없이도 샘플 fallback으로 동작한다.

## 서버 포트 확인

서버에서 실행한다.

```bash
docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Status}}'
ss -tuln | grep ':18080' || true
```

`18080`이 이미 사용 중이면 `18081` 또는 `19080`을 사용하고, 아래 `docker run`의 왼쪽 포트를 같이 변경한다.

## 소스 업로드

SSH 키가 등록되어 있다면 로컬에서 예시처럼 업로드할 수 있다.

```powershell
git archive --format=tar HEAD | ssh cwuser@192.168.55.223 "mkdir -p ~/fest-twin-demo && tar -x -C ~/fest-twin-demo"
```

비밀번호를 명령줄 인자로 넣지 않는다. SSH 키가 없다면 압축 파일을 수동으로 업로드한다.

## 빌드

서버에서 실행한다.

```bash
cd ~/fest-twin-demo
docker build -t fest-twin-demo .
```

TourAPI 키 없이 빌드하면 앱은 샘플 fallback으로 동작한다.

내부 데모에서 임시로 TourAPI 키를 포함해 빌드해야 한다면, 키가 브라우저 번들에 노출될 수 있음을 전제로 새 키를 사용한다. 이 단계는 외부 공개용이 아니다.

## 실행

서버에서 실행한다.

```bash
docker stop fest-twin-demo 2>/dev/null || true
docker rm fest-twin-demo 2>/dev/null || true
docker run -d --name fest-twin-demo --restart unless-stopped -p 18080:80 fest-twin-demo
```

## 확인

```bash
docker ps --filter name=fest-twin-demo
curl -I http://127.0.0.1:18080
```

브라우저에서 `http://192.168.55.223:18080`을 연다.

확인할 항목:

- 페스트트윈 대시보드가 표시된다.
- 새로고침해도 404가 나오지 않는다.
- 데이터 근거 패널에 live, partial fallback, sample fallback 중 하나가 텍스트로 표시된다.

## 로그 확인

```bash
docker logs --tail=100 fest-twin-demo
```

## 중지와 삭제

```bash
docker stop fest-twin-demo
docker rm fest-twin-demo
```

## 재배포

```bash
cd ~/fest-twin-demo
git pull 2>/dev/null || true
docker build -t fest-twin-demo .
docker stop fest-twin-demo 2>/dev/null || true
docker rm fest-twin-demo 2>/dev/null || true
docker run -d --name fest-twin-demo --restart unless-stopped -p 18080:80 fest-twin-demo
```

## 문제 해결

포트 충돌:

```bash
ss -tuln | grep ':18080'
```

컨테이너 이름 충돌:

```bash
docker rm -f fest-twin-demo
```

SPA 새로고침 404:

- `nginx.conf`에 `try_files $uri $uri/ /index.html;`이 있는지 확인한다.

TourAPI 호출 실패:

- 내부 데모는 fallback으로 계속 동작해야 한다.
- 실제 키를 넣었다면 브라우저 번들에 노출될 수 있으므로 재발급 전제로만 사용한다.
```

- [ ] **Step 2: Link doc from README**

In `README.md`, add this bullet to the current documents list:

```md
- [내부 Docker 배포](docs/internal-docker-deploy.md)
```

- [ ] **Step 3: Run documentation sanity checks**

Run:

```powershell
$key = $env:VITE_TOUR_API_KEY
if ($key) { git grep --fixed-strings -n -- $key -- Dockerfile .dockerignore nginx.conf docs README.md }
rg -n '(PASSWORD|PASSWD|SECRET|TOKEN)\s*[:=]\s*[''\"]?[A-Za-z0-9_\-]{12,}' Dockerfile .dockerignore nginx.conf docs README.md
```

Expected: both commands return no matches when no real local key or secret assignment is present.

- [ ] **Step 4: Commit Task 2**

```powershell
git add docs/internal-docker-deploy.md README.md
git commit -m "docs: add internal Docker deployment guide"
```

---

## Final Verification

- [ ] Run tests:

```powershell
npm run test
```

Expected: all tests pass.

- [ ] Run production build:

```powershell
npm run build
```

Expected: build exits 0.

- [ ] Run Docker build:

```powershell
docker build -t fest-twin-demo .
```

Expected: build exits 0.

- [ ] Run container locally if Docker is available:

```powershell
docker rm -f fest-twin-demo-test 2>$null
docker run -d --name fest-twin-demo-test -p 18080:80 fest-twin-demo
curl.exe -I http://127.0.0.1:18080
docker rm -f fest-twin-demo-test
```

Expected:

- `curl.exe` returns HTTP status `200`.
- Test container is removed.

- [ ] Check no secret was added:

```powershell
$key = $env:VITE_TOUR_API_KEY
if ($key) { git grep --fixed-strings -n -- $key -- Dockerfile .dockerignore nginx.conf docs README.md }
rg -n '(PASSWORD|PASSWD|SECRET|TOKEN)\s*[:=]\s*[''\"]?[A-Za-z0-9_\-]{12,}' Dockerfile .dockerignore nginx.conf docs README.md
```

Expected: both commands return no matches when no real local key or secret assignment is present.
