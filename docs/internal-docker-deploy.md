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
