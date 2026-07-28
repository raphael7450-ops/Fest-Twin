# 선택 축제 기준 실데이터 반영 증빙

## 요약

Fest-Twin은 TourAPI 후보 축제를 선택하면 해당 후보의 `contentId`를 현재 분석 기준으로 고정한다. 이후 상세 정보와 주변 관광지는 선택 후보 기준으로 다시 조회되며, 그 결과가 수요 예측, 지도, KPI 근거, 리포트에 반영된다.

## 공모전 설명 문구

Fest-Twin은 지역·기간 기반으로 한국관광공사 TourAPI 축제 후보를 조회한 뒤, 사용자가 선택한 후보의 `contentId`를 기준으로 상세 정보와 주변 관광지를 다시 조회합니다. 따라서 축제 후보를 변경하면 행사장 좌표, 주변 관광지 맥락, 흥행 예측 근거, 리포트의 기준 데이터가 함께 갱신됩니다.

## TourAPI 활용 흐름

| 단계 | TourAPI 기능 | Fest-Twin 활용 |
| :--- | :--- | :--- |
| 1 | `areaCode2` | 사용자가 선택한 개최 지역을 TourAPI 지역 코드로 변환 |
| 2 | `searchFestival2` | 지역·기간 기반 축제 후보 목록 조회 |
| 3 | `detailCommon2` | 선택 후보의 `contentId`로 상세 정보, 주소, 좌표 확인 |
| 4 | `locationBasedList2` | 선택 후보 좌표 기준 반경 5km 주변 관광지 조회 |

## 화면에서 확인할 위치

1. `축제 기획안 입력` 영역에서 지역과 기간을 선택한다.
2. `TourAPI 축제 후보 보기`를 눌러 후보를 확인한다.
3. 후보를 선택한다.
4. `데이터 근거` 패널의 `선택 TourAPI 축제 기준`에서 축제명과 `contentId`를 확인한다.
5. `흥행 예측 지수`의 `근거 보기`를 열어 선택 축제 기준 source detail을 확인한다.
6. 리포트의 OpenAPI 증빙 영역에서 같은 선택 축제 기준이 표시되는지 확인한다.

## 심사 대응 포인트

- 축제 변경 시 이전 후보의 주변 관광지와 좌표가 남지 않도록 `contentId` 기준으로 재조회한다.
- 실제 방문객 수는 TourAPI에서 직접 제공하지 않으므로, 방문객 수는 선택 축제 메타데이터와 주변 관광지, 검색 관심도, 지역 백데이터, 사용자 입력값을 결합한 설명 가능한 예측값이다.
- API 호출 실패 시에도 화면은 중단되지 않으며, 후보 패널에서 확보한 메타데이터와 fallback 데이터를 근거로 계속 진단한다.

## 검증 결과

2026-07-28 기준 다음 테스트로 검증했다.

- `src/services/dataAdapters.test.ts`: 선택 후보가 있으면 `detailCommon2`와 `locationBasedList2`가 선택 후보 기준으로 호출되는지 검증
- `src/App.selectedBasis.test.tsx`: 후보 선택 후 `getTourismContext`에 `selectedCandidate`가 전달되는지 검증
- `src/services/metricEvidence.test.ts`: KPI 근거에 선택 축제 기준 source detail이 포함되는지 검증
- `src/components/DataBasisPanel.test.tsx`: 데이터 근거 패널에 선택 축제 기준이 표시되는지 검증
- `src/components/ReportView.selectedBasis.test.tsx`: 리포트에 선택 축제 기준이 표시되는지 검증
