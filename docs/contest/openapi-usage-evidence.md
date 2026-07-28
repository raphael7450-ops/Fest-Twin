# Fest-Twin OpenAPI 활용 증빙

## 기본 원칙

한국관광공사 OpenAPI는 공모전 필수 활용 API이며, Fest-Twin의 축제 후보 조회와 관광지 근거 산출의 중심 데이터로 사용한다. Naver DataLab과 YouTube는 수요 예측을 보강하는 외부 관심도 보조 API로 분리한다.

비밀키는 서버 환경변수로만 관리하며, 브라우저 번들, Git 저장소, PDF, 기능설명서 본문에는 기록하지 않는다.

## 한국관광공사 TourAPI 4.0 활용

| API | 서비스 내 활용 위치 | 제출 증빙 |
| :--- | :--- | :--- |
| `areaCode2` | 개최 지역을 시도/시군구 코드로 매핑 | 축제 기획안 입력 화면, 서버 `/api/tour/area-code` |
| `searchFestival2` | 지역·기간 기반 축제 후보 조회 | TourAPI 축제 후보 패널, 데이터 근거 패널 |
| `detailCommon2` | 선택 축제의 상세 정보, 주소, 좌표 조회 | 행사장 지도, 기획안 자동 채움 |
| `locationBasedList2` | 선택 축제 주변 관광지 조회 | 수요 예측 근거 Drawer, 주변 관광 매력도 산출 |

## 검색량·소셜 관심도 보조 API

| API | 서비스 내 활용 위치 | 제출 증빙 |
| :--- | :--- | :--- |
| Naver DataLab 통합검색어 트렌드 | 축제명·지역명 기반 사전 관심도 지수 산출 | KPI 근거, Metric Evidence Drawer, 보고서 |
| YouTube Data API Search | 축제 관련 영상 콘텐츠 언급 보조 지표 | 선택 기능, v1.0 일정 내 가능 시 포함 |
| Instagram/X | v2.0 확장 예정 | 제출판 완료 기능으로 표현하지 않음 |

## 화면 증빙 캡처 대상

1. 지역·기간 선택 후 TourAPI 후보 조회 결과
2. 후보 선택 후 행사장 지도와 기획안 자동 반영
3. 데이터 근거 패널의 TourAPI 실제 조회 또는 Fallback 상태
4. Naver DataLab 사전 관심도 지표와 검색량 보정 설명
5. 보고서의 활용 OpenAPI 및 산출 근거 섹션

## 제출 시 설명 문구

Fest-Twin은 한국관광공사 TourAPI 4.0을 통해 지역 코드, 축제 후보, 상세 좌표, 주변 관광지 데이터를 서버 프록시로 조회한다. 검색량 기반 사전 관심도는 Naver DataLab 통합검색어 트렌드 API를 통해 보조 지표로 활용하며, 실제 방문객 집계값이 아닌 수요 예측 보정 근거로 표시한다.
