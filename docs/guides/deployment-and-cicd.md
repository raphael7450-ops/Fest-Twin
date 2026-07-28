# Fest-Twin 배포 및 CI/CD 파이프라인 가이드

Fest-Twin 애플리케이션의 개발 환경 실행, 네이버 지도 API 설정, 원격 Docker 서버 배포 및 GitHub Actions CI/CD 파이프라인 운영을 위한 가이드입니다.

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

### 1.3 네이버 지도 API 키 설정
네이버 지도 API 인증을 위해 Client ID를 환경변수로 전달할 수 있습니다.
```bash
# 개발/빌드 시 환경변수 지정 (미지정 시 기본 5mcwlg6qwo 적용)
export VITE_NAVER_MAP_NCP_KEY_ID="your_naver_map_client_id"
npm run build
```

---

## 2. 원격 Docker 서버 배포 및 운영 검증

현재 외부 확인 URL은 `https://cwserver.tail97dbc3.ts.net/`이며, 내부 Docker 컨테이너는 원격 서버의 `18080:80` 포트로 구동됩니다.

### 2.1 원격 배포 명령어
```bash
# Git commit/push 완료 후 원격 Docker 배포
npm run deploy:remote

# 공개 URL 기준 운영 검증
npm run deploy:check
```

### 2.2 원격 배포 수행 단계
1. 아카이브 생성: `git archive`를 사용하여 최신 HEAD 소스를 `fest-twin-demo.tar`로 아카이브합니다.
2. 원격 업로드: SCP를 이용해 `cwuser@192.168.55.223` 원격 서버 홈 디렉터리로 전송합니다.
3. Docker 이미지 빌드 & 컨테이너 재가동:
   - `fest-twin-demo:latest` 태그로 Docker 이미지를 생성합니다.
   - 기존 구동 중인 컨테이너(`fest-twin-demo`)를 안전하게 중지 및 삭제 후 신규 컨테이너를 구동(포트 18080:80)합니다.
4. 운영 검증 (`npm run deploy:check`):
   - 공개 루트 `/`가 HTTP 200 및 HTML로 응답하는지 확인합니다.
   - 루트 HTML의 정적 JS/CSS 번들이 실제로 응답하고, 로컬 `dist/index.html`이 존재할 경우 번들 파일명이 일치하는지 확인합니다.
   - `/api/scenarios`, `/api/tour/area-code`, `/api/scenarios/scen_sample_01`, `/api/scenarios/share/token_gn_winter_2026` 라우트가 정상 JSON 구조로 응답하는지 확인합니다.
   - `/api/tour/area-code`는 TourAPI 정상 응답(`resultCode: 0000`) 또는 명시적 Fallback 호환 오류만 허용합니다.

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
      - run: VITE_NAVER_MAP_NCP_KEY_ID="${{ secrets.NAVER_MAP_CLIENT_ID || '5mcwlg6qwo' }}" npm run build

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
            docker build --build-arg NAVER_MAP_CLIENT_ID="5mcwlg6qwo" -t fest-twin-demo:latest .
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
- 정적 번들 불일치: `npm run build` 후 `npm run deploy:check`를 실행하면 공개 URL의 번들명과 로컬 `dist/index.html`의 번들명을 비교합니다. 불일치 시 원격 Docker 배포가 최신 커밋 기준으로 반영되지 않은 것으로 보고 재배포합니다.

## 4. 제출 전 최종 운영 게이트

제출 직전에는 아래 명령을 순서대로 실행하고 결과를 `docs/LOAD_TEST_REPORT.md` 및 발표 리허설 기록에 남깁니다.

```bash
npm test
npm run build
npm run test:load
npm run deploy:check
```

확인 기준은 다음과 같습니다.

- `npm test`: 전체 Vitest 단위/통합 테스트 100% 통과
- `npm run build`: TypeScript 및 Vite 프로덕션 번들 생성 성공
- `npm run test:load`: 일반 API 100/100 성공, OpenAPI 30회/분 제한 초과 5건 HTTP 429 차단, 캐시 히트 평균 5ms 이하
- `npm run deploy:check`: 공개 URL, 정적 번들, API 라우트, 공유 시나리오 복원 게이트 모두 통과
