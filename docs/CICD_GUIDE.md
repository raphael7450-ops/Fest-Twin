# Fest-Twin GitHub Actions CI/CD 파이프라인 가이드

본 문서는 **Fest-Twin (B2G 축제 사전 진단 SaaS)** 의 GitHub Actions 기반 CI/CD 자동화 배포 파이프라인 구조, 필수 보안 Secrets 구성, 및 원격 Docker 호스트 가동 방법론을 설명합니다.

---

## 1. CI/CD 파이프라인 구조 (Architecture Overview)

Fest-Twin 프로젝트는 GitHub Actions를 활용하여 `main` 브랜치에 코드 변경사항이 커밋되거나 PR이 머지될 때 **자동 테스트(CI) -> 빌드 -> 원격 Docker 서버 무중단 자동 배포(CD)** 순으로 구동됩니다.

```mermaid
flowchart TD
    A[Git Commit / PR Merge to main] --> B[Job 1: Test & Build CI]
    B --> C{npm test & npm run build}
    C -- 실패 -- Stop Pipeline & Alert
    C -- 성공 -- D[Job 2: Remote Docker Deploy CD]
    D --> E[SSH Connect to Remote Host 192.168.55.223]
    E --> F[git pull & docker build]
    F --> G[Stop Old Container & Start New Container 18080:80]
    G --> H[Health Check: GET /api/scenarios]
    H -- HTTP 200 OK -- I[🎉 Deployment Successful]
```

---

## 2. 필수 GitHub Secrets 설정 가이드

GitHub 레포지토리의 **Settings -> Secrets and variables -> Actions** 페이지에서 아래 비밀 키(Secrets)를 등록하세요.

| Secret Key 이름 | 필수 여부 | 설명 및 예시 값 |
| :--- | :--- | :--- |
| `REMOTE_HOST` | **필수** | 원격 배포 서버 IP 주소 (예: `192.168.55.223` 또는 Tailscale IP) |
| `REMOTE_USER` | **필수** | 원격 SSH 사용자 계정명 (예: `cwuser`) |
| `SSH_PRIVATE_KEY` | **필수** | 원격 서버 접속용 OpenSSH 개인키 (`cat ~/.ssh/id_rsa`) |
| `SSH_PORT` | 선택 | SSH 접속 포트 (기본값: `22`) |
| `TOUR_API_KEY` | 선택 | 한국관광공사 TourAPI 4.0 실데이터 연동용 인코딩 API 키 |
| `NAVER_MAP_CLIENT_ID` | 선택 | 네이버 지도 API Client ID (기본값: `5mcwlg6qwo`) |

---

## 3. 원격 서버 배포 환경 사전 준비 (Prerequisites)

원격 서버(`cwuser@192.168.55.223`) 환경에서 CI/CD 파이프라인이 정상 작동하려면 다음 조건이 충족되어야 합니다.

1. **Docker 및 Git 설치**:
   ```bash
   sudo apt-get update
   sudo apt-get install -y docker.io git curl
   sudo usermod -aG docker cwuser
   ```
2. **SSH 공개키 등록 (`~/.ssh/authorized_keys`)**:
   GitHub Secrets의 `SSH_PRIVATE_KEY`에 대응하는 공개키(`id_rsa.pub`)가 원격 서버의 `~/.ssh/authorized_keys`에 등록되어 있어야 합니다.
3. **환경변수 파일 (선택 사항)**:
   실제 OpenAPI 키를 주입하려면 원격 서버 홈 디렉터리에 `~/fest-twin-demo.env` 파일을 생성하세요.
   ```bash
   # ~/fest-twin-demo.env
   TOUR_API_KEY=your_real_korea_tourism_openapi_key_here
   ```

---

## 4. 파이프라인 로컬 시뮬레이션 및 검증 방법

로컬 및 원격 배포 상태를 검증하려면 다음 NPM 커맨드를 실행하세요.

```bash
# 1. Vitest 전체 테스트 및 빌드 검증 (CI 시뮬레이션)
npm test
npm run build

# 2. 로컬 / 원격 헬스체크 검증 (CD 시뮬레이션)
npm run deploy:check
```

---

## 5. 장애 시 롤백 (Rollback Strategy)

배포 중 헬스체크가 실패할 경우 워크플로우가 자동으로 중단되며, 필요 시 원격 서버에서 이전 백업 컨테이너로 즉시 롤백할 수 있습니다.

```bash
# 원격 서버 SSH 접속 후 이전 이미지 커밋으로 즉시 복원
ssh cwuser@192.168.55.223
docker stop fest-twin-demo
docker run -d --name fest-twin-demo --restart unless-stopped -p 18080:80 fest-twin-demo:previous
```
