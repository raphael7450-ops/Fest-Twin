# Fest-Twin 내부 데모 Docker 배포 설계

## 1. 목표

Fest-Twin을 내부 데모용으로 원격 서버 `192.168.55.223`에 Docker 컨테이너로 배포한다. 외부 공개 운영이 아니라 같은 네트워크에서 `http://192.168.55.223:18080`로 접속해 현재 대시보드와 TourAPI fallback 흐름을 확인하는 것이 목표다.

## 2. 배포 방식

현재 앱은 Vite + React 정적 SPA이므로 Node 서버를 상시 실행하지 않는다. 로컬 또는 서버에서 `npm run build`로 `dist/`를 생성하고, `nginx:alpine` 컨테이너가 해당 정적 파일을 서빙한다.

배포 단위:

- 컨테이너 이름: `fest-twin-demo`
- 베이스 이미지: `nginx:alpine`
- 호스트 포트: `18080`
- 컨테이너 포트: `80`
- 접속 URL: `http://192.168.55.223:18080`

## 3. 포트 선택

첨부된 서버 포트 목록에서 다음 포트들은 이미 사용 중이다.

- `3000`, `3001`
- `5432`
- `8001`
- `8080`, `8081`, `8082`, `8083`, `8084`, `8088`, `8090`
- `8761`, `8765`, `8888`
- `9443`

`18080`은 목록에 없으므로 내부 데모용 포트로 사용한다. 배포 직전 서버에서 `ss -tuln | grep :18080` 또는 `docker ps`로 한 번 더 확인한다. `18080`이 사용 중이면 배포를 차단하고 서버 소유자 또는 관리자에게 해제를 요청한다. 다른 호스트 포트로 변경하지 않으며, 충돌한 컨테이너나 서비스를 중지 또는 삭제하지 않는다.

## 4. 산출물

저장소에 다음 배포 파일을 추가한다.

- `Dockerfile`: 멀티스테이지 빌드로 `npm ci`, `npm run build`, `nginx` 정적 서빙을 수행한다.
- `.dockerignore`: `node_modules`, `dist`, 로컬 빌드 산출물, `.env.local`, Git 메타데이터를 이미지 빌드 컨텍스트에서 제외한다.
- `nginx.conf`: SPA fallback을 위해 존재하지 않는 경로는 `/index.html`로 반환한다.
- `docs/internal-docker-deploy.md`: 서버 배포 명령, 재배포 명령, 상태 확인, 중지/삭제, 문제 해결을 문서화한다.

## 5. TourAPI 키 처리

현재 Vite 환경변수 `VITE_TOUR_API_KEY`는 빌드 시 브라우저 번들에 포함될 수 있다. 내부 데모에서는 임시로 사용할 수 있지만, 키가 클라이언트에 노출될 수 있으므로 다음 원칙을 따른다.

- 실제 키는 Dockerfile, README, 문서, Git 커밋에 넣지 않는다.
- 키를 넣어 빌드해야 한다면 Docker build argument 또는 서버의 임시 `.env.local`을 사용한다.
- 이미 대화에 노출된 키는 공공데이터포털에서 재발급하거나 폐기한다.
- 외부 공개 배포 전에는 서버 프록시를 도입해야 한다.

내부 데모에서 키 없이 배포해도 앱은 샘플 fallback으로 동작해야 한다.

## 6. 배포 흐름

권장 흐름은 로컬에서 Docker 배포 파일을 준비하고, 서버에서 이미지를 빌드해 컨테이너를 실행하는 방식이다.

```text
로컬 저장소
  -> Dockerfile / nginx.conf / .dockerignore 추가
  -> 테스트와 빌드 검증
  -> git archive -o fest-twin-demo.tar HEAD 후 scp로 파일 복사
  -> 서버에서 깨끗한 staging 디렉터리에 tar 추출
  -> docker build -t fest-twin-demo:<unique-tag> <staging-dir>
  -> docker run -d --name fest-twin-demo -p 18080:80 fest-twin-demo:<unique-tag>
  -> http://192.168.55.223:18080 확인
```

`git archive HEAD`는 커밋되지 않은 변경을 포함하지 않으므로 배포할 변경은 먼저 커밋한다. 서버 접속 자동화는 SSH 키가 등록된 경우에만 수행한다. 비밀번호를 명령줄 인자로 사용하지 않는다.

## 7. 오류 처리

포트 충돌:

- `18080`이 이미 사용 중이면 배포를 차단한다.
- 서버 소유자 또는 관리자에게 포트 해제를 요청한다.
- 다른 호스트 포트로 변경하거나 충돌한 서비스 또는 컨테이너를 변경하지 않는다.

컨테이너 이름 충돌:

- 기존 `fest-twin-demo`는 `com.fest-twin.managed-by=fest-twin-internal-demo` 라벨과 명시적 운영자 확인으로 이 배포가 관리하는 데모 컨테이너임이 확인된 경우에만 중지 또는 삭제한다.
- 소유권을 확인할 수 없으면 배포를 중단하고 서버 소유자 또는 관리자에게 확인을 요청한다.

재배포 실패:

- 새 소스는 깨끗한 staging 디렉터리에 추출하고, 고유 태그 이미지 빌드를 먼저 완료한다.
- 기존 컨테이너와 배포 소스는 빌드 성공 및 소유권 확인 전까지 변경하지 않는다.
- 교체 전 이전 이미지 ID를 저장하고 새 컨테이너의 시작 또는 로컬 HTTP 확인이 실패하면 그 이미지로 즉시 되돌린다.

TourAPI 호출 실패:

- 현재 앱의 sample fallback이 작동해야 한다.
- 데이터 근거 패널에 fallback 상태가 표시되어야 한다.

SPA 새로고침 404:

- `nginx.conf`에서 `try_files $uri $uri/ /index.html;`을 사용한다.

## 8. 검증 기준

로컬 검증:

- `npm run test`
- `npm run build`
- `docker build -t fest-twin-demo .`
- `docker run --rm -p 18080:80 fest-twin-demo`

서버 검증:

- `docker ps`에서 `fest-twin-demo`가 `0.0.0.0:18080->80/tcp`로 표시된다.
- 브라우저에서 `http://192.168.55.223:18080` 접속 시 대시보드가 표시된다.
- 새로고침해도 화면이 유지된다.
- 데이터 근거 패널이 live, partial fallback, sample fallback 중 하나를 텍스트로 표시한다.

## 9. 비범위

이번 단계에서는 다음을 하지 않는다.

- HTTPS 인증서 설정
- 도메인 연결
- 서버 프록시 기반 TourAPI 키 보호
- CI/CD 자동 배포
- 기존 `autochart-nginx` 또는 다른 운영 컨테이너 설정 변경
- 데이터베이스나 서버 API 추가
