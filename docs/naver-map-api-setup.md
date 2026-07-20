# 네이버 지도 API 설정

## 목적

페스트트윈은 TourAPI에서 확인한 `강남 미디어 윈터페스타` 좌표를 기준으로 실제 행사장 위치를 네이버 지도 위에 표시한다. 지도는 수요 예측 계산식을 바꾸지 않고, 심사자와 지자체 담당자가 행사장 맥락을 빠르게 이해하도록 돕는 화면 근거로 사용한다.

## 사용하는 API

- NAVER Maps JavaScript API v3
- 공식 로드 방식: `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=YOUR_CLIENT_ID`
- 참고 문서: https://navermaps.github.io/maps.js.ncp/docs/tutorial-2-Getting-Started.html

## 환경변수

로컬에서 실제 지도를 보려면 `.env.local`에 다음 값을 넣는다.

```env
VITE_NAVER_MAP_NCP_KEY_ID=발급받은_네이버_지도_ncpKeyId
```

`VITE_NAVER_MAP_NCP_KEY_ID`는 브라우저에서 지도 SDK를 로드하는 공개 Client ID다. 그래도 실제 프로젝트 키는 Git에 커밋하지 않는다.

## 키가 없을 때

키가 없거나 SDK 로드가 실패하면 앱은 지도를 요청하지 않고 같은 패널에 다음 정보를 표시한다.

- 네이버 지도 API 키 미설정 상태
- 행사장명: `강남 미디어 윈터페스타`
- 주소: `서울특별시 강남구 영동대로 511 (삼성동)`
- TourAPI 조회 좌표: `127.0610512042`, `37.5103955843`
- 주요 지점: 행사장 중심, 삼성역 출입구, 코엑스 동문, 미디어월 관람 구역

## 보안 원칙

- TourAPI 서버 키는 `TOUR_API_KEY`로만 관리한다.
- 네이버 지도 Client ID는 `.env.local`에만 둔다.
- `.env.local`, 실제 키, 서버 비밀번호, GitHub 토큰은 저장소에 기록하지 않는다.

## 집에서 확인

```powershell
git pull origin main
npm install
npm run dev
```

지도 키가 없으면 fallback 패널을 확인한다. 지도 키가 있으면 `.env.local`을 만든 뒤 개발 서버를 다시 시작하고 `http://127.0.0.1:5173/`에서 `실제 행사장 지도` 패널을 확인한다.
