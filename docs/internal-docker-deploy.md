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
- 이 Docker 배포는 키 없이 샘플 fallback으로만 실행한다. Dockerfile에는 TourAPI 키용 build argument가 없고 `.env.local`은 빌드 컨텍스트에서 제외된다. 실제 TourAPI 키를 보호하는 live 운영은 향후 서버 프록시를 추가한 뒤에만 지원한다.

## 서버 포트 확인

서버에서 실행한다.

```bash
docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Status}}'
ss -tuln | grep ':18080' || true
```

`18080`이 이미 사용 중이면 배포를 진행하지 않는다. 서버 소유자 또는 관리자에게 포트 해제를 요청하고, 해제될 때까지 배포를 차단한다. 이 배포 운영자는 충돌하는 서비스나 컨테이너를 중지하거나 삭제하지 않는다. 다른 호스트 포트로 변경해서는 안 된다.

## 초기 소스 업로드

로컬에서 커밋된 `HEAD`를 바이너리 안전한 tar 파일로 만들고 `scp`로 업로드한다. `git archive HEAD`는 커밋되지 않은 변경을 포함하지 않으므로, 배포할 변경은 먼저 커밋한다. PowerShell 파이프라인으로 tar 바이트를 SSH에 전달하지 않는다.

로컬에서 실행한다.

```powershell
git archive -o fest-twin-demo.tar HEAD
scp .\fest-twin-demo.tar cwuser@192.168.55.223:~/
Remove-Item .\fest-twin-demo.tar
```

서버에서 실행한다. 이 명령은 기존 배포 디렉터리에 덮어쓰지 않고, 깨끗한 staging 디렉터리에 압축을 푼 뒤 처음에만 배포 디렉터리로 이동한다.

```bash
staging_dir="$HOME/fest-twin-demo.staging"
release_dir="$HOME/fest-twin-demo"
rm -rf "$staging_dir"
mkdir -p "$staging_dir"
tar -xf "$HOME/fest-twin-demo.tar" -C "$staging_dir"
rm -f "$HOME/fest-twin-demo.tar"

if [ -e "$release_dir" ]; then
  echo "$release_dir already exists; stop and use the redeploy procedure."
  exit 1
fi
mv "$staging_dir" "$release_dir"
```

비밀번호를 명령줄 인자로 넣지 않는다. SSH 키가 없다면 생성한 `fest-twin-demo.tar` 파일을 안전한 방법으로 업로드한 뒤 같은 서버 측 명령을 실행한다.

## 빌드

서버에서 실행한다.

```bash
cd ~/fest-twin-demo
docker build -t fest-twin-demo:initial .
```

이 Docker 배포는 TourAPI 키 없이 빌드하며 앱은 샘플 fallback으로 동작한다. Dockerfile은 키 전달용 build argument를 지원하지 않고 `.env.local`은 빌드 컨텍스트에서 제외된다. 키가 필요한 live TourAPI 운영은 향후 서버 프록시를 도입한 뒤에만 지원한다.

## 실행

서버에서 실행한다.

```bash
set -euo pipefail

existing_container="$(docker ps -aq --filter 'name=^fest-twin-demo$')"
if [ -n "$existing_container" ]; then
  echo "fest-twin-demo already exists; do not modify it. Verify ownership and use the redeploy procedure."
  exit 1
fi
docker run -d --name fest-twin-demo --label com.fest-twin.managed-by=fest-twin-internal-demo --restart unless-stopped -p 18080:80 fest-twin-demo:initial
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
existing_container="$(docker ps -aq --filter 'name=^fest-twin-demo$')"
if [ -z "$existing_container" ]; then
  echo "fest-twin-demo does not exist."
  exit 0
fi
ownership_marker="$(docker inspect --format '{{index .Config.Labels "com.fest-twin.managed-by"}}' "$existing_container")"
if [ "$ownership_marker" != "fest-twin-internal-demo" ]; then
  echo "fest-twin-demo lacks the deployment ownership marker; stop and ask the server owner or administrator."
  exit 1
fi
read -r -p "Confirm fest-twin-demo is the managed demo container from this deployment (type yes): " ownership_confirmed
if [ "$ownership_confirmed" != "yes" ]; then
  echo "Ownership was not confirmed; leaving the existing container unchanged."
  exit 1
fi
docker stop "$existing_container"
docker rm "$existing_container"
```

## 재배포

재배포는 실행 중인 컨테이너나 현재 소스를 먼저 변경하지 않는다. 새 소스를 깨끗한 staging 디렉터리에 추출하고, 고유 태그의 이미지를 먼저 성공적으로 빌드한 뒤에만 소유권을 확인한 관리 대상 데모 컨테이너를 교체한다.

로컬에서 실행한다. `git archive HEAD`는 커밋되지 않은 변경을 제외하므로 배포할 변경은 먼저 커밋한다.

```powershell
git archive -o fest-twin-demo.tar HEAD
scp .\fest-twin-demo.tar cwuser@192.168.55.223:~/
Remove-Item .\fest-twin-demo.tar
```

서버에서 실행한다. `new_image`는 현재 UTC 시각을 사용한 고유 태그다. `set -euo pipefail`은 staging 준비, 빌드, 소유권 확인, 중지, 삭제, 소스 교체, 시작, HTTP 확인 중 하나라도 실패하면 다음 단계로 진행하지 않게 한다.

```bash
set -euo pipefail

staging_dir="$HOME/fest-twin-demo.staging"
release_dir="$HOME/fest-twin-demo"
release_backup="$HOME/fest-twin-demo.previous"
new_image="fest-twin-demo:$(date -u +%Y%m%d%H%M%S)"

rm -rf "$staging_dir"
mkdir -p "$staging_dir"
tar -xf "$HOME/fest-twin-demo.tar" -C "$staging_dir"
rm -f "$HOME/fest-twin-demo.tar"

if ! docker build -t "$new_image" "$staging_dir"; then
  echo "New image build failed; existing source and container were not changed."
  exit 1
fi

existing_container="$(docker ps -aq --filter 'name=^fest-twin-demo$')"
if [ -z "$existing_container" ]; then
  echo "fest-twin-demo does not exist; stop and use the initial deployment procedure."
  exit 1
fi
ownership_marker="$(docker inspect --format '{{index .Config.Labels "com.fest-twin.managed-by"}}' "$existing_container")"
if [ "$ownership_marker" != "fest-twin-internal-demo" ]; then
  echo "fest-twin-demo is not confirmed as the managed demo container; ask the server owner or administrator."
  exit 1
fi
read -r -p "Confirm fest-twin-demo is the managed demo container from this deployment (type yes): " ownership_confirmed
if [ "$ownership_confirmed" != "yes" ]; then
  echo "Ownership was not confirmed; leaving the existing container unchanged."
  exit 1
fi

previous_image_id="$(docker inspect --format '{{.Image}}' "$existing_container")"
previous_container_id="$existing_container"

rollback() {
  status="$?"
  trap - ERR
  set +e
  echo "Redeploy failed after replacement began; restoring the previous deployment."

  current_container="$(docker ps -aq --filter 'name=^fest-twin-demo$')"
  if [ "$current_container" = "$previous_container_id" ]; then
    if ! docker start "$previous_container_id" >/dev/null; then
      echo "Rollback could not restart the previous container."
      exit 1
    fi
  elif [ -n "$current_container" ]; then
    current_marker="$(docker inspect --format '{{index .Config.Labels "com.fest-twin.managed-by"}}' "$current_container" 2>/dev/null || true)"
    if [ "$current_marker" = "fest-twin-internal-demo" ]; then
      if ! docker rm -f "$current_container" >/dev/null; then
        echo "Rollback could not remove the failed managed replacement container."
        exit 1
      fi
    else
      echo "Refusing to remove an unverified container during rollback."
      exit "$status"
    fi
  fi

  if [ -d "$release_backup" ]; then
    if ! rm -rf "$release_dir"; then
      echo "Rollback could not remove the failed release source."
      exit 1
    fi
    if ! mv "$release_backup" "$release_dir"; then
      echo "Rollback could not restore the previous release source."
      exit 1
    fi
  fi

  if [ -z "$(docker ps -aq --filter 'name=^fest-twin-demo$')" ]; then
    if ! docker run -d --name fest-twin-demo --label com.fest-twin.managed-by=fest-twin-internal-demo --restart unless-stopped -p 18080:80 "$previous_image_id" >/dev/null; then
      echo "Rollback could not recreate the previous container."
      exit 1
    fi
  fi
  exit "$status"
}

trap rollback ERR
docker stop "$existing_container"
docker rm "$existing_container"
rm -rf "$release_backup"
mv "$release_dir" "$release_backup"
mv "$staging_dir" "$release_dir"

docker run -d --name fest-twin-demo --label com.fest-twin.managed-by=fest-twin-internal-demo --restart unless-stopped -p 18080:80 "$new_image"
curl -fsS --max-time 10 http://127.0.0.1:18080/ > /dev/null

trap - ERR
if ! rm -rf "$release_backup"; then
  echo "New container is running, but cleanup of $release_backup failed; investigate before the next redeploy."
  exit 1
fi
```

중지 또는 삭제가 실패하면 이전 컨테이너를 다시 시작한다. 이전 컨테이너가 이미 삭제된 뒤 소스 교체, 새 컨테이너 시작, 또는 HTTP 확인이 실패하면 위 명령은 새 관리 컨테이너만 제거하고 저장한 이전 이미지 ID로 이전 컨테이너를 다시 만든다. `release_backup`이 있으면 이전 소스도 복원한다. 어떤 복구 명령이 실패하거나 소유권을 확인할 수 없는 컨테이너가 있으면 오류를 출력하고 즉시 종료하며, 서버 소유자 또는 관리자에게 조치를 요청한다. 새 이미지와 staging 소스는 조사나 다음 재시도에 사용할 수 있도록 유지한다.

## 문제 해결

포트 충돌:

```bash
ss -tuln | grep ':18080'
```

출력이 있으면 서버 소유자 또는 관리자에게 `18080` 해제를 요청하고, 해제될 때까지 배포를 다시 시도하지 않는다. 이 배포 운영자는 충돌하는 서비스나 컨테이너를 중지하거나 삭제하지 않는다. 다른 호스트 포트로 변경하지 않는다.

컨테이너 이름 충돌:

```bash
docker ps -a --filter name=fest-twin-demo
```

기존 `fest-twin-demo` 컨테이너가 이 배포에서 관리하는 데모 컨테이너인지 확인할 수 없으면 배포를 중단하고 서버 소유자 또는 관리자에게 확인을 요청한다. 확인 없이 기존 서버 컨테이너를 중지하거나 삭제하지 않는다. 이 배포에서 관리하는 데모 컨테이너임을 확인한 경우에만 서버 소유자 또는 관리자의 승인에 따라 해당 컨테이너를 정리하고 재배포한다.

SPA 새로고침 404:

- `nginx.conf`에 `try_files $uri $uri/ /index.html;`이 있는지 확인한다.

TourAPI 호출 실패:

- 내부 데모는 fallback으로 계속 동작해야 한다.
- 이 Docker 배포에는 키 전달 경로가 없다. 실제 TourAPI 키를 보호하는 live 운영은 향후 서버 프록시를 도입한 뒤에만 지원한다.

## 문서와 설정의 비밀값 검사

PowerShell에서 다음 검사는 이름에 `KEY`, `PASSWORD`, `PASSWD`, `SECRET`, `TOKEN`을 포함하는 실제 값 할당을 대소문자 구분 없이 찾는다. 셸 환경 변수, Dockerfile 환경 변수와 build argument 지시문, 그리고 Docker CLI build argument를 검사한다. 패턴 변수명에는 이 단어를 넣지 않아 검사 명령이 자기 자신과 일치하지 않게 한다.

```powershell
$assignmentPattern = '(?ix)(?:^\s*(?:export\s+|\$env:)?[A-Z][A-Z0-9_]*(?:key|password|passwd|secret|token)[A-Z0-9_]*\s*[:=]\s*|^\s*(?:env|arg)\s+[A-Z][A-Z0-9_]*(?:key|password|passwd|secret|token)[A-Z0-9_]*\s*=\s*|\bdocker\s+build\b[^\r\n]*?\s--build-arg(?:=|\s+)[A-Z][A-Z0-9_]*(?:key|password|passwd|secret|token)[A-Z0-9_]*\s*=\s*)(?!["'']?(?:<[^>]+>|REDACTED\b|YOUR_[A-Z0-9_]+\b|\$\{?[A-Z_][A-Z0-9_]*\}?))\S+'
$scanPaths = @('Dockerfile', '.dockerignore', 'nginx.conf', 'docs/internal-docker-deploy.md', 'docs/superpowers/specs/2026-07-16-internal-docker-deploy-design.md', 'docs/superpowers/plans/2026-07-16-internal-docker-deploy.md')
rg -n --pcre2 $assignmentPattern $scanPaths
```

정상 상태에서는 출력이 없다. 일치가 있으면 실제 비밀값을 제거하거나 Git 밖의 안전한 비밀 관리 방법으로 옮긴 뒤 다시 검사한다.
