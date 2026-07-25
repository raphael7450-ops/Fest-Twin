# Fest-Twin GitHub Actions CI/CD 파이프라인 가이드

Fest-Twin의 GitHub Actions 기반 CI/CD 자동 배포 파이프라인 구조, 필수 보안 Secrets 설정 및 원격 Docker 호스트 운영 가이드를 안내합니다.

---

## 1. CI/CD 파이프라인 구조

main 브랜치에 코드 변경사항이 커밋되거나 PR이 머지될 때 자동 테스트(CI), 프로덕션 빌드, 원격 Docker 서버 배포(CD) 순으로 구동됩니다.

```mermaid
flowchart TD
    A[Git Commit / PR Merge to main] --> B[Job 1: Test & Build CI]
    B --> C{npm test & npm run build}
    C -- 실패 -- Stop Pipeline
    C -- 성공 -- D[Job 2: Remote Docker Deploy CD]
    D --> E[SSH Connect to Remote Host 192.168.55.223]
    E --> F[git pull & docker build]
    F --> G[Stop Old Container & Start New Container 18080:80]
    G --> H[Health Check: GET /api/scenarios]
    H -- HTTP 200 OK -- I[Deployment Successful]
```

---

## 2. GitHub Secrets 설정 가이드

GitHub 레포지토리 Settings -> Secrets and variables -> Actions 항목에서 아래 비밀키를 등록합니다.

| Secret Key 이름 | 구분 | 설명 및 예시 값 |
| :--- | :--- | :--- |
| `REMOTE_HOST` | 필수 | 원격 배포 서버 IP 주소 (예: 192.168.55.223 또는 Tailscale IP) |
| `REMOTE_USER` | 필수 | 원격 SSH 사용자 계정명 (예: cwuser) |
| `SSH_PRIVATE_KEY` | 필수 | 원격 서버 접속용 OpenSSH 개인키 (cat ~/.ssh/id_rsa) |
| `SSH_PORT` | 선택 | SSH 접속 포트 (기본값: 22) |
| `TOUR_API_KEY` | 선택 | 한국관광공사 TourAPI 4.0 실데이터 연동용 API 키 |
| `NAVER_MAP_CLIENT_ID` | 선택 | 네이버 지도 API Client ID (기본값: 5mcwlg6qwo) |

---

## 3. 원격 서버 배포 환경 준비

원격 서버(`cwuser@192.168.55.223`) 환경에서 CI/CD 파이프라인이 구동되기 위해 필요한 조건입니다.

1. Docker 및 Git 설치
   ```bash
   sudo apt-get update
   sudo apt-get install -y docker.io git curl
   sudo usermod -aG docker cwuser
   ```
2. SSH 공개키 등록 (`~/.ssh/authorized_keys`)
   `SSH_PRIVATE_KEY`에 대응하는 공개키(`id_rsa.pub`)가 원격 서버의 `~/.ssh/authorized_keys`에 등록되어 있어야 합니다.
3. 환경변수 파일 설정 (선택)
   실제 OpenAPI 키를 주입하려면 원격 서버 홈 디렉터리에 `~/fest-twin-demo.env` 파일을 생성합니다.
   ```bash
   # ~/fest-twin-demo.env
   TOUR_API_KEY=your_real_korea_tourism_openapi_key_here
   ```

---

## 4. 파이프라인 로컬 시뮬레이션 및 검증

배포 상태를 국소적으로 검증하려면 아래 커맨드를 활용합니다.

```bash
# 전체 테스트 및 빌드 검증 (CI 시뮬레이션)
npm test
npm run build

# 원격 헬스체크 검증 (CD 시뮬레이션)
npm run deploy:check
```

---

## 5. 복구 및 롤백 가이드

배포 중 헬스체크가 실패하면 워크플로우가 즉시 중단됩니다. 이전 컨테이너 상태로 롤백하려면 아래 명령을 실행합니다.

```bash
ssh cwuser@192.168.55.223
docker stop fest-twin-demo
docker run -d --name fest-twin-demo --restart unless-stopped -p 18080:80 fest-twin-demo:previous
```
