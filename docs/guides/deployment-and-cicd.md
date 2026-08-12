# Fest-Twin 배포 및 CI/CD 파이프라인 가이드

Fest-Twin 애플리케이션의 개발 환경 실행, VWorld 2D 지도 API 설정, 원격 Docker 서버 무중단 배포 및 GitHub Actions CI/CD 파이프라인 운영을 위한 가이드입니다.

---

## 1. 개발 및 빌드 환경 설정

### 1.1 기본 요구 사항
- Node.js v20.x 이상
- npm v10.x 이상
- Docker 및 Docker Compose (원격 배포 시)

### 1.2 개발 서버 구동 (Local Dev Server)
```bash
# 의존성 패키지 설치
npm ci

# 프론트엔드 개발 서버 실행 (127.0.0.1:5173)
npm run dev

# Express 백엔드 API 서버 실행 (포트 80 또는 기본 설정)
npm start
```

### 1.3 VWorld 2D 지도 API 키 설정
VWorld 2D 지도 JavaScript API 키는 브라우저 번들에 포함되는 빌드 환경변수입니다. 키와 등록 URI가 일치해야 하며, `npm run build` 전에 `VITE_VWORLD_API_KEY`를 설정해야 합니다. 키를 설정하지 않아도 빌드는 완료되지만 지도 패널은 키 미설정 상태로 표시됩니다.
```bash
# 개발/빌드 셸의 공개 지도 API 키
export VITE_VWORLD_API_KEY="your_vworld_api_key"
npm run build
```

GitHub Actions와 수동 원격 배포는 같은 키를 `VWORLD_API_KEY` 이름으로 관리합니다. GitHub 저장소에는 `VWORLD_API_KEY` Secret을 등록하고, 워크플로가 이를 `VITE_VWORLD_API_KEY`로 매핑해 Vite 빌드에 전달하며 Docker에는 `--build-arg VWORLD_API_KEY`로 전달합니다. PowerShell에서 `npm run deploy:remote`를 실행할 때도 먼저 `$env:VWORLD_API_KEY="your_vworld_api_key"`를 설정합니다.

---

## 2. 원격 Docker 서버 무중단 배포 (`npm run deploy:remote`)

원격 서버(`192.168.55.223:18080`)로 소스 코드를 패키징하여 Docker 컨테이너 재배포 및 헬스체크까지 한 번에 실행하는 스크립트를 제공합니다.

### 2.1 원격 배포 명령어
```bash
# Git commit/push 완료 후 원격 Docker 배포 및 헬스체크 실행
npm run deploy:remote
```

### 2.2 원격 배포 수행 단계
1. 아카이브 생성: `git archive`를 사용하여 최신 HEAD 소스를 `fest-twin-demo.tar`로 아카이브합니다.
2. 원격 업로드: SCP를 이용해 `cwuser@192.168.55.223` 원격 서버 홈 디렉터리로 전송합니다.
3. Docker 이미지 빌드 & 컨테이너 재가동:
   - `fest-twin-demo:latest` 태그로 Docker 이미지를 생성합니다.
   - 기존 구동 중인 컨테이너(`fest-twin-demo`)를 안전하게 중지 및 삭제 후 신규 컨테이너를 구동(포트 18080:80)합니다.
4. 배포 헬스체크 (`npm run deploy:check`):
   - 공개 루트(`/`)와 `/assets/*` 정적 번들이 정상 응답하는지 확인합니다.
   - `/api/scenarios`, `/api/scenarios/scen_sample_01`, `/api/scenarios/share/token_gn_winter_2026` 응답을 파싱해 시나리오 목록, 상세, 공유 복원 흐름을 검증합니다.
   - `/api/tour/area-code`는 TourAPI 정상 응답(`response.header.resultCode`) 또는 명시적 fallback-compatible 오류(`error.code`)를 허용해 운영 장애 시 화면 fallback 경로가 깨지지 않는지 확인합니다.

### 2.3 운영 검증 게이트

최종 제출 전에는 아래 명령을 순서대로 실행합니다.

```bash
npm test
npm run build
npm run test:load
npm run deploy:check
```

`npm run deploy:check`는 원격 공개 URL 기준으로 다음 5개 게이트를 확인합니다.

| 게이트 | 확인 내용 |
|--------|-----------|
| Public root | `/` HTTP 200, React mount element, JS/CSS 정적 asset 응답 |
| Scenario list | `/api/scenarios` HTTP 200, `scenarios` 배열과 `count` 일치 |
| TourAPI proxy | `/api/tour/area-code` 정상 TourAPI JSON 또는 fallback-compatible 오류 |
| Scenario detail | `/api/scenarios/scen_sample_01` 기획안과 `selectedHour` 복원 |
| Scenario share | `/api/scenarios/share/token_gn_winter_2026` 공유 토큰 복원 및 선택 축제 근거 fallback 상태 |

`npm run test:load`는 로컬 격리 Express 인스턴스에서 Scenario API 수용량, OpenAPI Rate Limiter, TourAPI 캐시 응답성을 확인하고 `docs/LOAD_TEST_REPORT.md`를 자동 갱신합니다.

---

## 3. GitHub Actions CI/CD 파이프라인 (`.github/workflows/deploy.yml`)

### 3.1 워크플로우 구성

```yaml
name: Fest-Twin CI/CD Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  workflow_dispatch:

jobs:
  test-and-build:
    name: "CI - Test and Build"
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm test
      - env:
          VITE_VWORLD_API_KEY: ${{ secrets.VWORLD_API_KEY }}
        run: |
          test -n "$VITE_VWORLD_API_KEY" || { echo "VWORLD_API_KEY secret is required for the Vite build."; exit 1; }
          npm run build

  deploy:
    name: "CD - Remote Docker Deploy"
    needs: test-and-build
    if: github.ref == 'refs/heads/main' && github.event_name != 'pull_request'
    runs-on: ubuntu-latest
    continue-on-error: true
    steps:
      - name: Check deployment secrets
        id: check_secrets
        run: |
          if [ -n "${{ secrets.REMOTE_HOST }}" ] && [ -n "${{ secrets.REMOTE_USER }}" ] && [ -n "${{ secrets.SSH_PRIVATE_KEY }}" ]; then
            echo "has_secrets=true" >> $GITHUB_OUTPUT
          else
            echo "has_secrets=false" >> $GITHUB_OUTPUT
            echo "[NOTICE] Remote SSH secrets are not set. Skipping SSH deployment."
          fi

      - name: Deploy container on remote Docker server via SSH
        if: steps.check_secrets.outputs.has_secrets == 'true'
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.REMOTE_HOST }}
          username: ${{ secrets.REMOTE_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          port: ${{ secrets.SSH_PORT || '22' }}
          script: |
            set -e
            cd ~/fest-twin-demo || (git clone https://github.com/raphael7450-ops/Fest-Twin.git ~/fest-twin-demo && cd ~/fest-twin-demo)
            git fetch origin main
            git reset --hard origin/main
            docker build --build-arg VWORLD_API_KEY="${{ secrets.VWORLD_API_KEY }}" -t fest-twin-demo:latest .
            if [ "$(docker ps -aq -f name=^fest-twin-demo$)" ]; then
              docker stop fest-twin-demo || true
              docker rm fest-twin-demo || true
            fi
              docker run -d --name fest-twin-demo --restart unless-stopped -p 18080:80 fest-twin-demo:latest
            sleep 3
            curl -f -s http://localhost:18080/api/scenarios > /dev/null || exit 1
```

### 3.2 사설망 배포 및 트러블슈팅
- 사설 IP 접속 문제: GitHub Actions 클라우드 호스팅 러너는 192.168.x.x 대역의 사설 IP에 직접 도달할 수 없습니다. 따라서 사설망 배포 시에는 로컬/내부 개발 환경에서 `npm run deploy:remote` 스크립트를 사용하여 직접 배포하거나, Tailscale / Self-Hosted Runner를 연결하는 방식을 권장합니다.
- 배포 헬스체크 타임아웃 지연: 외부 공공 API(TourAPI) 최초 연결 지연에 대비하여 `deploy-check.js`에는 10초 타임아웃 및 1회 자동 재시도 로직이 기본 내장되어 있습니다.
- TourAPI 일시 장애: `deploy-check.js`는 TourAPI 프록시가 `429`, `502`, `503`, `504`와 함께 `error.code`를 반환하면 fallback-compatible 상태로 판정합니다. 이 경우 프론트엔드 fallback 데이터 경로가 동작하는지 별도 시연에서 확인합니다.
