# 페스트트윈 공개 데모 운영 안내

## 현재 공개 데모 정보

- 공개 데모: https://cwserver.tail97dbc3.ts.net/
- GitHub 저장소: https://github.com/raphael7450-ops/Fest-Twin
- GitHub Release: https://github.com/raphael7450-ops/Fest-Twin/releases/tag/v0.1.0-submission-demo
- 내부 서버: `192.168.55.223`
- SSH 사용자: `cwuser`
- Docker 컨테이너: `fest-twin-demo`
- Docker 이미지: `fest-twin-demo:20260717092936`
- 외부 포트: `18080`
- Tailscale Funnel: `https://cwserver.tail97dbc3.ts.net/` -> `http://127.0.0.1:18080`

실제 TourAPI 키, SSH 비밀번호, Tailscale 인증 정보는 이 문서와 Git 저장소에 기록하지 않는다.

## 팀원 접속 방법

### 공개 데모만 확인하는 경우

브라우저에서 아래 주소를 연다.

```text
https://cwserver.tail97dbc3.ts.net/
```

Tailscale 계정이나 서버 SSH 접속 권한이 없어도 공개 데모는 열려야 한다.

### 서버 운영 상태를 확인해야 하는 경우

서버 접속 권한이 있는 팀원만 SSH로 접속한다.

```powershell
ssh cwuser@192.168.55.223
```

접속 후 데모 컨테이너 상태를 확인한다.

```bash
docker ps --filter name=fest-twin-demo --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}'
```

정상 상태 예시는 다음과 같다.

```text
fest-twin-demo  fest-twin-demo:20260717092936  0.0.0.0:18080->80/tcp  Up ...
```

## 장애 시 복구 절차

### 1. 공개 URL이 열리지 않는 경우

먼저 컨테이너와 Funnel 상태를 확인한다.

```bash
docker ps --filter name=fest-twin-demo
tailscale serve status
tailscale funnel status
```

`fest-twin-demo`가 보이지 않으면 컨테이너를 재시작한다.

```bash
docker start fest-twin-demo
```

컨테이너는 `restart=unless-stopped` 정책으로 설정되어 있으므로 Docker 데몬 재시작이나 서버 재부팅 후에도 자동 기동 대상이다.

### 2. 컨테이너는 떠 있지만 화면이 이상한 경우

데모 컨테이너만 재시작한다. 다른 서버 컨테이너에는 영향이 없다.

```bash
docker restart fest-twin-demo
```

재시작 후 로그를 확인한다.

```bash
docker logs --tail 20 fest-twin-demo
```

정상 로그에는 다음 문구가 보여야 한다.

```text
Fest-Twin server listening on port 80
```

### 3. TourAPI 결과가 샘플 보완으로만 보이는 경우

컨테이너에 TourAPI 환경변수가 주입되어 있는지 값 노출 없이 확인한다.

```bash
docker inspect fest-twin-demo --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -E '^TOUR_API_KEY=' >/dev/null && echo TOUR_API_KEY_PRESENT || echo TOUR_API_KEY_MISSING
```

`TOUR_API_KEY_PRESENT`가 나오면 서버 런타임 환경변수는 존재한다. 이후 공개 프록시 응답을 확인한다.

```bash
curl 'http://127.0.0.1:18080/api/tour/detail?contentId=3439947'
```

정상 응답은 `resultCode=0000`이다.

## 제출 직전 빠른 점검

로컬 PC에서 공개 주소를 확인할 때 기본 DNS가 `*.ts.net` 이름을 해석하지 못하면 공개 Tailscale Funnel IP를 지정해 점검할 수 있다.

```powershell
curl.exe --resolve cwserver.tail97dbc3.ts.net:443:103.84.155.153 -I --max-time 30 https://cwserver.tail97dbc3.ts.net/
```

정상 응답은 `HTTP/1.1 200 OK`이다.

TourAPI 프록시도 확인한다.

```powershell
curl.exe --resolve cwserver.tail97dbc3.ts.net:443:103.84.155.153 --max-time 30 "https://cwserver.tail97dbc3.ts.net/api/tour/festivals?numOfRows=1&pageNo=1&arrange=A&areaCode=1&eventStartDate=20260101&eventEndDate=20261231"
curl.exe --resolve cwserver.tail97dbc3.ts.net:443:103.84.155.153 --max-time 30 "https://cwserver.tail97dbc3.ts.net/api/tour/detail?contentId=3439947"
```

두 응답 모두 `resultCode=0000`이면 공개 데모와 TourAPI 프록시가 정상이다.

## 2026-07-17 운영 안정화 확인 결과

- Docker 서비스: `enabled`, `active`
- Tailscale 서비스: `enabled`, `active`
- `fest-twin-demo` restart policy: `unless-stopped`
- Tailscale Funnel: `https://cwserver.tail97dbc3.ts.net/` -> `http://127.0.0.1:18080`
- 컨테이너 단위 재시작 후 공개 URL HTTP 200 확인
- 컨테이너 단위 재시작 후 TourAPI `festivals`, `detail` 응답 `resultCode=0000` 확인

서버 전체 재부팅은 같은 서버에 다수의 다른 운영 컨테이너가 있어 즉시 수행하지 않았다. 현재 Docker와 Tailscale이 systemd 자동 기동 상태이고, 데모 컨테이너는 `unless-stopped` 정책이므로 데모 단위 자동 복구 조건은 충족한다.
