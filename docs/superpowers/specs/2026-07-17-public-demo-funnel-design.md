# Fest-Twin 공개 데모 Tailscale Funnel 설계

## 목적

Fest-Twin 내부 데모를 외부 심사자와 팀원이 Tailscale 설치 없이 확인할 수 있는 HTTPS 공개 데모로 노출한다. 기존 Docker 컨테이너와 TourAPI 서버 프록시는 유지하고, 서버의 Tailscale Funnel만 추가로 설정한다.

## 현재 상태

- 내부 데모 URL: `http://192.168.55.223:18080/`
- Docker 컨테이너: `fest-twin-demo`
- 컨테이너 포트 매핑: `18080:80`
- TourAPI 인증키는 서버의 런타임 env 파일에서만 주입한다.
- 로컬 저장소 `main`은 원격 `origin/main`과 동기화되어 있다.

## 추천 접근

Tailscale Funnel을 사용해 서버 내부의 `http://127.0.0.1:18080`을 공개 HTTPS URL로 프록시한다.

```text
외부 사용자
-> https://<server-name>.<tailnet>.ts.net
-> Tailscale Funnel
-> http://127.0.0.1:18080
-> fest-twin-demo Docker
```

이 방식은 공유기 포트포워딩, 공인 IP 방화벽 개방, 별도 클라우드 배포 없이 현재 서버를 그대로 활용한다. 공모전 제출용 임시 데모에는 가장 빠르지만, URL을 아는 사용자는 누구나 접근할 수 있으므로 장기 운영용 공개 배포로 보지 않는다.

## 대안과 선택 이유

### 1. Tailscale Funnel

장점은 설정이 빠르고 현재 Docker 구조를 바꾸지 않아도 된다는 점이다. TourAPI 키도 계속 서버 env 파일에만 남는다. 단점은 공개 URL이 인터넷에 열리며, 접근 제어는 앱 레벨에서 제공되지 않는다는 점이다.

### 2. 클라우드/VPS 공개 배포

장점은 정식 운영 구조에 가깝고 도메인, HTTPS, 배포 자동화를 구성하기 쉽다는 점이다. 단점은 지금 단계에서 인프라 준비와 비용, Secret 설정, 운영 책임이 늘어난다는 점이다.

### 3. Tailscale 사용자 초대 또는 머신 공유

장점은 접근 범위가 제한되어 안전하다는 점이다. 단점은 외부 심사자나 협업자가 Tailscale을 설치하고 로그인해야 하므로 공모전 공개 데모 URL로는 불편하다.

이번 단계는 1번 Tailscale Funnel을 선택한다.

## 범위

포함한다.

- 서버의 Tailscale 상태 확인
- `fest-twin-demo` 컨테이너 상태 확인
- Tailscale Serve/Funnel 설정
- 외부 HTTPS URL 확인
- 제출 문서와 README에 공개 데모 URL 기록
- 공개 데모 중지 명령과 운영 주의사항 문서화

포함하지 않는다.

- 앱 로그인 기능
- 데이터베이스 추가
- TourAPI 키 변경 또는 재발급
- DNS 커스텀 도메인 연결
- 장기 운영용 클라우드 배포
- 기존 서버의 다른 Docker 컨테이너 변경

## 서버 설정 설계

서버에서 다음 순서로 확인한다.

1. `tailscale status`로 서버가 Tailnet에 연결되어 있는지 확인한다.
2. `tailscale serve status` 또는 `tailscale funnel status`로 기존 설정을 확인한다.
3. `docker ps --filter name=fest-twin-demo`로 데모 컨테이너가 실행 중인지 확인한다.
4. `curl -fsSI http://127.0.0.1:18080/`로 로컬 서비스가 정상인지 확인한다.
5. Tailscale Serve로 `127.0.0.1:18080`을 HTTPS 서비스에 연결한다.
6. Funnel을 활성화해 외부 공개 URL을 연다.

Funnel은 공개 인터넷에 노출되므로 설정 전후에 현재 설정을 기록하고, 필요한 경우 바로 끌 수 있는 명령을 함께 문서화한다.

## 데이터와 보안

TourAPI 인증키는 Docker 이미지나 Git 저장소에 포함하지 않는다. 공개 URL은 Node/Express 서버를 통해 `/api/tour/*`만 프록시하고, 기존 allowlist 외 임의 URL 프록시는 제공하지 않는다.

Funnel은 인터넷 공개 접속을 허용하므로 민감한 관리자 기능을 추가하지 않는다. 현재 MVP는 개인정보와 계정 정보를 수집하지 않기 때문에 공모전 임시 공개 데모로 허용 가능한 범위다.

## 검증 기준

성공 기준은 다음과 같다.

- 내부 데모 `http://192.168.55.223:18080/`가 계속 HTTP 200을 반환한다.
- 서버 로컬 `http://127.0.0.1:18080/`가 HTTP 200을 반환한다.
- Funnel 공개 HTTPS URL이 외부 네트워크에서 접속된다.
- 공개 URL에서 대시보드 첫 화면이 표시된다.
- `/api/tour/festivals`와 `/api/tour/detail` 흐름이 기존 내부 데모와 동일하게 동작한다.
- README와 제출 문서에는 내부 데모 주소와 공개 데모 주소가 구분되어 기록된다.

## 롤백

문제가 있으면 Funnel 공개를 먼저 중지한다. Docker 컨테이너는 중지하지 않는다.

```bash
tailscale funnel --https=443 off
tailscale serve --https=443 off
```

이후 내부 데모가 계속 살아 있는지 확인한다.

```bash
curl -fsSI http://127.0.0.1:18080/
```

## 완료 산출물

- 공개 데모 HTTPS URL
- 갱신된 README
- 갱신된 제출 요약서 또는 시연 가이드
- 공개 데모 설정과 중지 방법 문서
- 서버 및 외부 접속 검증 결과
