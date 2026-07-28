# 선택 축제 기준 데이터 갱신 흐름

## 목적

Fest-Twin은 사용자가 TourAPI 축제 후보를 선택하면 단순히 축제명만 바꾸지 않고, 선택한 후보의 `contentId`, 주소, 기간, 좌표를 대시보드 전체의 공통 기준으로 사용한다. 이 문서는 축제 후보 변경 시 어떤 데이터 컨텍스트가 다시 계산되는지 정리한다.

## 사용자 흐름

1. 사용자가 지역과 기간을 입력한다.
2. `TourAPI 후보 보기` 버튼으로 후보 패널을 연다.
3. 후보 목록에서 축제를 선택한다.
4. 선택 후보의 축제명, 주소, 기간, 좌표, `contentId`가 현재 기획안에 반영된다.
5. 문화체육관광부 지역축제 백데이터에서 가장 유사한 축제 실적을 찾아 총 예산과 예상 수용 인원 추천값을 자동 세팅한다.
6. TourAPI 관광 컨텍스트, 트렌드, 교통, 소비, 지도, KPI 근거, 보고서가 같은 선택 후보 기준으로 갱신된다.

## Refresh Coverage

| 영역 | 갱신 기준 | 확인 방식 |
| --- | --- | --- |
| TourAPI 관광 컨텍스트 | `selectedCandidate.id`, `mapX`, `mapY`, 축제명, 주소, 기간 | `/api/tour/detail`은 선택 `contentId`, `/api/tour/nearby`는 선택 좌표 사용 |
| 검색·소셜 트렌드 | 선택 축제명, 지역, 기간, 키워드 | Naver DataLab keyword group의 첫 키워드가 선택 축제명 |
| KTDB/View-T 교통 | 선택 후보 반영 후 주소, 지역, 축제명, 시작일, 선택 시간 | 행사장 매핑과 선택 시간 기준으로 재조회 |
| 관광소비 객단가 | 선택 후보 반영 후 지역, 주소, 축제명, 기간, `contentId` | 같은 지역·같은 시작일이어도 축제가 바뀌면 재조회 |
| 지도 | 선택 후보 좌표 우선 | `VenueMapPanel`은 `selectedCandidate.mapX/mapY`를 우선 사용 |
| 예산·수용 인원 입력값 | 선택 후보명과 지역 수요 백데이터 | 유사 축제 예산은 총 예산, 방문객 수의 20%는 피크 동시 수용 추정값으로 자동 추천 |
| KPI 근거 | 선택 축제 기준, 관광 맥락, 트렌드, 백데이터, 사용자 입력값 | `metricEvidence.sourceDetails`에 `tourapi-selected-festival-basis` 포함 |
| 보고서 | 선택 축제 기준 및 공개 URL 증빙 | ReportView의 데이터 출처 영역에 선택 `contentId` 표시 |

## 선택 후보 우선순위

선택 후보가 없으면 기존처럼 지역·기간 기반으로 `searchFestival2` 후보 조회와 샘플 fallback을 사용한다.

선택 후보가 있으면 다음 순서로 우선 처리한다.

1. 선택 후보의 `contentId`로 `/api/tour/detail` 조회
2. 상세 응답에 좌표가 있으면 해당 좌표 사용
3. 상세 조회가 실패하거나 좌표가 부족하면 후보 패널에서 받은 좌표 사용
4. 좌표가 있으면 `/api/tour/nearby`로 반경 5km 주변 관광지 조회
5. 좌표가 없으면 주변 관광지 조회를 생략하고 근거에 fallback 사유 표시

## 수동 입력과 선택 기준

사용자가 후보 선택 후 축제명, 지역, 주소, 시작일, 종료일을 직접 수정하면 기존 선택 후보 기준은 해제한다. 이렇게 해야 수동 입력값과 이전 TourAPI `contentId`가 섞여 잘못된 근거로 표시되는 일을 막을 수 있다.

사용자가 총 예산 또는 예상 수용 인원을 직접 수정한 뒤 다른 후보를 선택하면 해당 숫자는 덮어쓰지 않는다. 숫자를 수정하지 않은 상태에서 후보를 선택하면 유사 축제 실적 기반 추천값을 초기값으로 반영한다.

## 검증 기준

- 후보 선택 후 `getTourismContext`가 `selectedCandidate`를 인자로 받는다.
- 후보 선택 후 `getTrendContext`, `getTrafficContext`, `getSpendingContext`가 선택 후보 반영 후의 `FestivalPlan`으로 다시 호출된다.
- 후보 선택 후 유사 축제 백데이터의 예산과 방문객 수 기반 피크 동시 수용 추정값이 기획안 입력값에 반영된다.
- 같은 지역·같은 시작일의 다른 축제를 선택해도 소비 컨텍스트가 재조회된다.
- 트렌드 adapter는 선택된 축제명을 첫 검색 키워드로 보낸다.
- 지도, KPI 근거, 보고서에 같은 `contentId`와 좌표 기준이 표시된다.

## 관련 구현 파일

- `src/App.tsx`
- `src/services/tourApiAdapter.ts`
- `src/services/trendAdapter.ts`
- `src/services/trafficAdapter.ts`
- `src/services/spendingAdapter.ts`
- `src/services/festivalSelection.ts`
- `src/services/metricEvidence.ts`
- `src/components/VenueMapPanel.tsx`
- `src/components/DataBasisPanel.tsx`
- `src/components/ReportView.tsx`

## 관련 테스트

- `src/App.selectedBasis.test.tsx`
- `src/services/trendAdapter.test.ts`
- `src/services/trafficAdapter.test.ts`
- `src/services/spendingAdapter.test.ts`
- `src/services/dataAdapters.test.ts`
- `src/services/festivalSelection.test.ts`
- `src/services/metricEvidence.test.ts`
- `src/components/DataBasisPanel.test.tsx`
- `src/components/ReportView.selectedBasis.test.tsx`
