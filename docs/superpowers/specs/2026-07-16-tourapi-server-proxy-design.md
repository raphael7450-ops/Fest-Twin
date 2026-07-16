# TourAPI 서버 프록시 설계

## 목적

Fest-Twin의 TourAPI 인증키를 브라우저 번들에서 제거하고 서버 환경변수에만 보관한다. 사용자는 기존 대시보드 주소와 화면 흐름을 그대로 사용하고, 앱은 서버 프록시를 통해 한국관광공사 TourAPI를 호출한다.

## 현재 문제

현재 로컬 개발 방식은 `VITE_TOUR_API_KEY`를 통해 React 앱에서 TourAPI를 직접 호출할 수 있다. Vite의 `VITE_` 환경변수는 브라우저 번들에 포함될 수 있으므로 내부 데모와 로컬 검증에는 충분하지만, 서버 배포나 시연 환경에서 실제 인증키를 쓰기에는 부적합하다.

Docker 내부 데모는 이 위험을 피하기 위해 인증키 없이 sample fallback으로 실행하고 있다. 다음 단계에서는 실제 TourAPI 활용을 서버에서만 수행하도록 프록시를 도입한다.

## 목표

- TourAPI 인증키를 Git, Docker 이미지, 브라우저 번들에 포함하지 않는다.
- 서버 런타임 환경변수 `TOUR_API_KEY`로만 인증키를 읽는다.
- 기존 대시보드 URL `http://192.168.55.223:18080/`을 유지한다.
- 기존 UI, 예측, 시뮬레이션, 리포트 흐름을 유지한다.
- 키가 없거나 TourAPI 호출이 실패하면 기존 sample fallback을 유지한다.
- 테스트와 빌드가 로컬 및 Docker 환경에서 재현 가능해야 한다.

## 비목표

- 사용자 로그인, 관리자 페이지, 키 관리 UI는 만들지 않는다.
- 데이터베이스를 추가하지 않는다.
- 외부 API 응답을 장기 저장하지 않는다.
- 운영용 CSAP 수준의 보안 체계 전체를 구현하지 않는다.
- 실시간 소셜 데이터 연동은 이번 범위에 포함하지 않는다.

## 권장 접근

Node 기반 경량 서버를 추가한다. 서버는 React 정적 파일을 서빙하고 `/api/tour/*` 요청을 TourAPI로 프록시한다. Docker 컨테이너는 이 Node 서버를 실행하며, 컨테이너 포트는 기존처럼 호스트 `18080`에 매핑한다.

이 방식은 nginx 정적 서빙보다 컨테이너 구성이 조금 커지지만, 단일 컨테이너와 단일 외부 포트를 유지하면서 인증키를 서버 런타임에만 둘 수 있다. 현재 내부 데모 운영 방식과 가장 잘 맞는다.

대안으로 nginx와 별도 Node 프록시를 같은 서버에서 두 컨테이너로 실행할 수 있지만, 현재 규모에서는 네트워크와 배포 절차가 불필요하게 복잡해진다. 서버리스 프록시는 키 보호에는 좋지만 내부 서버 Docker 배포 목표와 맞지 않는다.

## 서버 구조

새 서버 엔트리포인트를 추가한다.

- `server/`: TourAPI 프록시와 정적 파일 서빙을 담당한다.
- `server/index.ts` 또는 `server/index.js`: Express 서버 엔트리포인트다.
- `/api/tour/area-code`: TourAPI `areaCode2`를 호출한다.
- `/api/tour/festivals`: TourAPI `searchFestival2`를 호출한다.
- `/api/tour/detail`: TourAPI `detailCommon2`를 호출한다.
- `/api/tour/nearby`: TourAPI `locationBasedList2`를 호출한다.
- 그 외 경로: React SPA의 `index.html`로 fallback한다.

서버는 클라이언트가 보낸 허용된 query parameter만 TourAPI로 전달한다. `serviceKey`, 내부 키 이름, 서버 파일 경로, 임의 URL은 클라이언트 입력으로 받지 않는다.

## 클라이언트 변경

`src/services/tourApiAdapter.ts`는 브라우저에서 TourAPI 원본 URL을 직접 호출하지 않는다. 대신 같은 origin의 `/api/tour/*` 엔드포인트를 호출한다.

로컬 개발 편의를 위해 두 가지 모드를 둔다.

- 기본: `/api/tour/*` 프록시 호출
- 프록시가 없거나 실패: 기존 sample fallback 사용

로컬에서 실제 TourAPI를 검증하려면 Node 프록시 서버를 실행하고 `TOUR_API_KEY`를 로컬 환경변수 또는 `.env.local`이 아닌 서버 전용 env 파일로 제공한다. 브라우저용 `VITE_TOUR_API_KEY` 사용은 문서에서 deprecated로 표시한다.

## 환경변수

서버 런타임 환경변수:

- `TOUR_API_KEY`: 한국관광공사 TourAPI 일반 인증키 Decoding 값
- `PORT`: 서버 listen 포트, 기본값 `80`

Docker 이미지 빌드에는 TourAPI 키를 전달하지 않는다. 키는 `docker run --env-file` 또는 서버 환경변수 주입으로만 전달한다. `.env*` 파일은 계속 Docker build context에서 제외한다.

## 오류 처리

서버 프록시는 다음 상황에서 안전하게 실패해야 한다.

- `TOUR_API_KEY`가 없으면 `503`과 명확한 JSON 오류를 반환한다.
- TourAPI 네트워크 오류는 `502`로 반환한다.
- TourAPI 응답 형식이 예상과 다르면 `502`로 반환한다.
- 허용되지 않은 query parameter나 잘못된 숫자 값은 `400`으로 반환한다.

클라이언트는 프록시 오류를 기존 데이터 어댑터 흐름과 동일하게 처리한다. live 호출 실패 시 partial fallback 또는 sample fallback으로 내려가고, 데이터 근거 패널에 그 상태가 표시되어야 한다.

## 보안 기준

- 인증키는 클라이언트 응답, 로그, 에러 메시지에 포함하지 않는다.
- 서버는 임의 외부 URL을 프록시하지 않는다.
- 허용된 TourAPI endpoint와 허용된 query parameter만 사용한다.
- 로그는 endpoint 이름, 상태 코드, 응답 시간 정도만 남긴다.
- Dockerfile, README, 배포 문서에는 실제 키 값을 쓰지 않는다.

## Docker 배포 변경

Dockerfile은 React 앱을 빌드한 뒤 Node 서버 런타임 이미지를 만든다. 컨테이너는 `PORT=80`으로 Node 서버를 실행하고, 호스트 포트 매핑은 기존 `18080:80`을 유지한다.

서버 배포 문서에는 두 가지 실행 모드를 명시한다.

- 키 없는 데모 모드: `TOUR_API_KEY` 없이 실행하며 sample fallback을 사용한다.
- 실제 TourAPI 모드: 서버에만 있는 env 파일로 `TOUR_API_KEY`를 주입한다.

재배포 절차는 기존 ownership label, rollback, port conflict 방침을 유지한다.

## 테스트

다음 테스트를 추가하거나 갱신한다.

- 서버 프록시가 `serviceKey`를 서버 환경변수에서만 붙이는지 검증한다.
- 허용되지 않은 query parameter를 거부하는지 검증한다.
- 키 없음, TourAPI 실패, 잘못된 응답을 적절한 상태 코드로 반환하는지 검증한다.
- 클라이언트 어댑터가 프록시 실패 시 기존 sample fallback으로 내려가는지 검증한다.
- 기존 예측, 시뮬레이션, 리포트 테스트가 계속 통과하는지 검증한다.

## 배포 검증

구현 후 검증 명령:

```powershell
npm run test
npm run build
```

서버 검증:

```bash
docker ps --filter name=fest-twin-demo
curl -fsSI http://127.0.0.1:18080/
curl -fsS http://127.0.0.1:18080/api/tour/area-code
```

외부 확인:

```powershell
curl.exe -I http://192.168.55.223:18080/
```

실제 TourAPI 모드에서는 데이터 근거 패널이 live 또는 partial fallback 상태를 정확히 표시해야 한다. 키 없는 데모 모드에서는 sample fallback이 정상 상태로 표시되어야 한다.

## 성공 기준

- 브라우저 번들에서 TourAPI 키가 제거된다.
- Docker 이미지 히스토리와 Git 작업트리에 실제 키가 남지 않는다.
- `http://192.168.55.223:18080/` 접속 주소가 유지된다.
- 키 없는 상태에서도 현재 내부 데모가 깨지지 않는다.
- 서버에 `TOUR_API_KEY`를 주입하면 실제 TourAPI 호출이 서버를 통해 수행된다.
- 전체 테스트와 빌드가 통과한다.
