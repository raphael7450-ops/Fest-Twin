# Fest-Twin 공공데이터 API 신뢰도 및 수신 상태 종합 감사 보고서

작성일: 2026-09-02  
검증 대상: 원격 운영 서버 (https://cwserver.tail97dbc3.ts.net), 로컬 Express 백엔드

## 1. 엔드포인트별 실시간 수신 상태 요약표

| API 엔드포인트 | 원천 데이터 출처 | 원격 상태 | 로컬 상태 | 응답 지연 (원격) | 데이터 유형 | 무결성 판정 |
| --- | --- | ---: | ---: | ---: | --- | --- |
| TourAPI 지역코드 조회 | 한국관광공사 (TourAPI 4.0) | HTTP 200 | HTTP 503 (ERR) | 426ms | 실데이터 연동 | PASS |
| TourAPI 축제 목록 검색 | 한국관광공사 (TourAPI 4.0) | HTTP 200 | HTTP 503 (ERR) | 142ms | 실데이터 연동 | PASS |
| VWorld 장소/좌표 검색 | 국토교통부 (VWorld 공간정보) | HTTP 200 | HTTP 200 | 127ms | 실데이터 연동 | PASS |
| VWorld 도로명주소 검색 | 국토교통부 (VWorld 공간정보) | HTTP 200 | HTTP 200 | 129ms | 실데이터 연동 | FAIL |
| KTDB 링크별 통행속도 및 교통량 | 국가교통DB (KTDB/View-T) | HTTP 400 (ERR) | HTTP 200 | 160ms | 실데이터 연동 | FAIL |
| KTDB O/D 읍면동 교통 통행량 | 국가교통DB (KTDB/View-T) | HTTP 200 | HTTP 200 | 128ms | 실데이터 연동 | PASS |
| 네이버 데이터랩 검색 트렌드 | 네이버 (Naver DataLab API) | HTTP 200 | HTTP 200 | 128ms | 보정 Fallback | PASS |
| 기상청 단기예보 | 기상청 (단기예보 OpenAPI) | HTTP 200 | HTTP 200 | 156ms | 실데이터 연동 | PASS |
| 관광 소비 지출액 백데이터 | 한국관광 데이터랩 | HTTP 200 | HTTP 503 (ERR) | 204ms | 실데이터 연동 | PASS |
| 전국 도시공원 표준 데이터 | 공공데이터포털 (도시공원정보표준데이터) | HTTP 200 | HTTP 503 (ERR) | 254ms | 실데이터 연동 | PASS |
| 대중교통 접근성 인프라 | 국가대중교통DB (TAGO) | HTTP 200 | HTTP 200 | 165ms | 실데이터 연동 | PASS |
| 주변 상권 및 소상공인 인프라 | 소상공인시장진흥공단 | HTTP 200 | HTTP 200 | 167ms | 실데이터 연동 | PASS |
| 응급의료 및 비상대응 인프라 | 국립중앙의료원 / 보건복지부 | HTTP 200 | HTTP 200 | 183ms | 실데이터 연동 | PASS |
| 문체부 전국 지역축제 표준DB | 문화체육관광부 (지역축제 개최현황) | HTTP 200 | HTTP 200 | 183ms | 실데이터 연동 | PASS |
| 시나리오 저장 및 복원 API | Fest-Twin 내부 데이터 저장소 | HTTP 200 | HTTP 200 | 142ms | 실데이터 연동 | PASS |

## 2. 세부 엔드포인트 진단 결과

### TourAPI 지역코드 조회

- 요청 경로: `GET /api/tour/area-code`
- 원천 출처: 한국관광공사 (TourAPI 4.0)
- 원격 응답: HTTP 200 (426ms)
- 데이터 샘플: `{"response":{"header":{"resultCode":"0000","resultMsg":"OK"},"body":{"items":{"item":[{"rnum":1,"code":"1","name":"서울"},{"rnum":2,"code":"2","name":"인...`
- Fallback 동작 여부: 공공데이터 실데이터 직접 수신

### TourAPI 축제 목록 검색

- 요청 경로: `GET /api/tour/festivals?areaCode=1&eventStartDate=20261001`
- 원천 출처: 한국관광공사 (TourAPI 4.0)
- 원격 응답: HTTP 200 (142ms)
- 데이터 샘플: `{"response":{"header":{"resultCode":"0000","resultMsg":"OK"},"body":{"items":"","numOfRows":0,"pageNo":1,"totalCount":0}}}...`
- Fallback 동작 여부: 공공데이터 실데이터 직접 수신

### VWorld 장소/좌표 검색

- 요청 경로: `GET /api/vworld/search?query=%EC%97%AC%EC%9D%98%EB%8F%84%ED%95%9C%EA%B0%95%EA%B3%B5%EC%9B%90&type=PLACE`
- 원천 출처: 국토교통부 (VWorld 공간정보)
- 원격 응답: HTTP 200 (127ms)
- 데이터 샘플: `{"response":{"service":{"name":"search","version":"2.0","operation":"search","time":"13(ms)"},"status":"OK","record":{"total":"8","current":"5"},"page...`
- Fallback 동작 여부: 공공데이터 실데이터 직접 수신

### VWorld 도로명주소 검색

- 요청 경로: `GET /api/vworld/search?query=%EC%97%AC%EC%9D%98%EB%8F%99%EB%A1%9C%20330&type=ADDRESS`
- 원천 출처: 국토교통부 (VWorld 공간정보)
- 원격 응답: HTTP 200 (129ms)
- 데이터 샘플: `{"response":{"service":{"name":"search","version":"2.0","operation":"search","time":"0(ms)"},"status":"ERROR","error":{"level":"1","code":"PARAM_REQUI...`
- Fallback 동작 여부: 공공데이터 실데이터 직접 수신

### KTDB 링크별 통행속도 및 교통량

- 요청 경로: `GET /api/traffic/selected-link?linkId=1220000100&year=2024&weekType=weekday&time=ALL`
- 원천 출처: 국가교통DB (KTDB/View-T)
- 원격 응답: HTTP 400 (160ms)
- 데이터 샘플: `{"error":{"code":"INVALID_QUERY","message":"Traffic linkId is invalid."}}...`
- Fallback 동작 여부: 공공데이터 실데이터 직접 수신

### KTDB O/D 읍면동 교통 통행량

- 요청 경로: `GET /api/traffic/od-emd?zoneId=1111051500&year=2024&weekType=weekday&time=ALL`
- 원천 출처: 국가교통DB (KTDB/View-T)
- 원격 응답: HTTP 200 (128ms)
- 데이터 샘플: `{"msg":"필수 요청변수( ZONEID )의  입력값이 올바르지 않습니다.","zoneId":"1111051500","result":[]}...`
- Fallback 동작 여부: 공공데이터 실데이터 직접 수신

### 네이버 데이터랩 검색 트렌드

- 요청 경로: `POST /api/trends/naver-search`
- 원천 출처: 네이버 (Naver DataLab API)
- 원격 응답: HTTP 200 (128ms)
- 데이터 샘플: `{"sourceStatus":"sample-fallback","sourceName":"Naver DataLab search trend fallback","fallbackReason":"Naver DataLab credentials are not configured.",...`
- Fallback 동작 여부: Fallback 보정 데이터 사용

### 기상청 단기예보

- 요청 경로: `GET /api/weather?lat=37.5283&lon=126.9328`
- 원천 출처: 기상청 (단기예보 OpenAPI)
- 원격 응답: HTTP 200 (156ms)
- 데이터 샘플: `{"status":"sample-fallback","weather":{"temperatureCelsius":18.5,"precipitationProbabilityPercent":10,"windSpeedMetersPerSec":2.3,"precipitationType":...`
- Fallback 동작 여부: 공공데이터 실데이터 직접 수신

### 관광 소비 지출액 백데이터

- 요청 경로: `GET /api/spending/consumer-strength?areaCd=11&baseYm=202509`
- 원천 출처: 한국관광 데이터랩
- 원격 응답: HTTP 200 (204ms)
- 데이터 샘플: `{"response":{"header":{"resultCode":"0000","resultMsg":"OK (Fallback)"},"body":{"items":{"item":[{"areaCd":"11","baseYm":"202509","tarExpDsIxCd":"2203...`
- Fallback 동작 여부: 공공데이터 실데이터 직접 수신

### 전국 도시공원 표준 데이터

- 요청 경로: `GET /api/city-parks?query=%ED%95%9C%EA%B0%95%EA%B3%B5%EC%9B%90`
- 원천 출처: 공공데이터포털 (도시공원정보표준데이터)
- 원격 응답: HTTP 200 (254ms)
- 데이터 샘플: `{"items":[{"id":"27230-00014","name":"한강공원","type":"근린공원","roadAddress":"","lotAddress":"대구광역시 북구 사수동 809","latitude":35.89926649,"longitude":128.5127...`
- Fallback 동작 여부: 공공데이터 실데이터 직접 수신

### 대중교통 접근성 인프라

- 요청 경로: `GET /api/transit/nearby-stops?lat=37.5283&lon=126.9328`
- 원천 출처: 국가대중교통DB (TAGO)
- 원격 응답: HTTP 200 (165ms)
- 데이터 샘플: `{"status":"sample-fallback","accessibilityScore":80,"nearbyStopCount":5,"totalRouteCount":12,"stops":[{"stopName":"행사장 전면 정류소","distanceMeters":150,"r...`
- Fallback 동작 여부: 공공데이터 실데이터 직접 수신

### 주변 상권 및 소상공인 인프라

- 요청 경로: `GET /api/commercial/nearby-stores?lat=37.5283&lon=126.9328`
- 원천 출처: 소상공인시장진흥공단
- 원격 응답: HTTP 200 (167ms)
- 데이터 샘플: `{"status":"sample-fallback","commercialDensityScore":78,"totalStoreCount":360,"categories":[{"categoryName":"식음료 (음식점/카페)","storeCount":180,"ratioPerc...`
- Fallback 동작 여부: 공공데이터 실데이터 직접 수신

### 응급의료 및 비상대응 인프라

- 요청 경로: `GET /api/emergency/nearby-facilities?lat=37.5283&lon=126.9328`
- 원천 출처: 국립중앙의료원 / 보건복지부
- 원격 응답: HTTP 200 (183ms)
- 데이터 샘플: `{"status":"sample-fallback","goldenTimeMinutes":8,"readinessScore":88,"facilities":[{"facilityName":"지역 인접 응급의료센터","category":"권역응급센터","distanceKm":2....`
- Fallback 동작 여부: 공공데이터 실데이터 직접 수신

### 문체부 전국 지역축제 표준DB

- 요청 경로: `GET /api/regional-festivals`
- 원천 출처: 문화체육관광부 (지역축제 개최현황)
- 원격 응답: HTTP 200 (183ms)
- 데이터 샘플: `{"count":30,"summary":{"generatedAt":"2026-08-01T09:42:50.944819","source":"문화체육관광부_지역축제 정보 2022-2026 지역축제 개최 계획 엑셀 정규화","totalCount":5723,"years":[20...`
- Fallback 동작 여부: 공공데이터 실데이터 직접 수신

### 시나리오 저장 및 복원 API

- 요청 경로: `GET /api/scenarios`
- 원천 출처: Fest-Twin 내부 데이터 저장소
- 원격 응답: HTTP 200 (142ms)
- 데이터 샘플: `{"scenarios":[{"id":"scen_sample_01","title":"2026 서울세계불꽃축제 (기본 기획안)","description":"한강 수변 대형 불꽃 행사 기준 교통·안전·수요 사전진단 시뮬레이션 적용안","parameters":{"selecte...`
- Fallback 동작 여부: 공공데이터 실데이터 직접 수신

