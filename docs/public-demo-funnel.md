# 공개 데모 Tailscale Funnel 운영 문서

## 접속 주소

- 공개 데모: https://cwserver.tail97dbc3.ts.net/
- 내부 데모: http://192.168.55.223:18080/
- 내부 컨테이너: `fest-twin-demo`

## 목적

공모전 제출과 외부 협업 확인을 위해 기존 내부 Docker 데모를 Tailscale Funnel로 임시 공개한다.

## 확인 명령

```bash
tailscale serve status
tailscale funnel status
docker ps --filter name=fest-twin-demo
curl -fsSI http://127.0.0.1:18080/
curl -fsSI https://cwserver.tail97dbc3.ts.net/
curl -fsS "https://cwserver.tail97dbc3.ts.net/api/tour/festivals?numOfRows=1&pageNo=1&arrange=A&areaCode=1&eventStartDate=20260101&eventEndDate=20261231"
```

## 중지 명령

```bash
tailscale funnel --https=443 off
tailscale serve --https=443 off
curl -fsSI http://127.0.0.1:18080/
```

## 운영 주의사항

- 공개 데모 URL은 인터넷에서 접근 가능하므로 제출·시연 기간에만 유지한다.
- TourAPI 인증키, SSH 비밀번호, Tailscale 인증 정보는 저장소에 기록하지 않는다.
- 기존 서버의 다른 Docker 컨테이너는 변경하지 않는다.
- 앱 자체 로그인은 없는 MVP이므로 관리자 기능이나 민감한 입력을 공개 URL에 추가하지 않는다.
