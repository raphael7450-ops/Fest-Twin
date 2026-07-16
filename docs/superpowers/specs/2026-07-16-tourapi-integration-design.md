# Fest-Twin TourAPI 점진 연동 설계

## 1. 목표

페스트트윈의 현재 샘플 기반 관광 데이터 흐름을 한국관광공사 TourAPI 실제 호출로 확장한다. 목표는 실데이터 활용 근거를 강화하되, API 장애나 브라우저 제약이 있어도 공모전 데모가 깨지지 않는 구조를 만드는 것이다.

## 2. 범위

이번 연동은 프론트엔드 단일 앱 안에서 `src/services/tourApiAdapter.ts`를 확장하는 방식으로 진행한다. 예측, 시뮬레이션, 리포트 생성 로직은 기존 `TourismContext` 타입을 계속 사용한다.

포함 범위:

- `.env.local`의 `VITE_TOUR_API_KEY` 기반 인증키 사용
- TourAPI 호출 성공 시 실제 축제·관광지 데이터를 `TourismContext`로 변환
- 호출 실패, 응답 부족, 지역 코드 매핑 실패, CORS 문제 발생 시 기존 샘플 데이터로 fallback
- 데이터 근거 패널에서 실제 API 사용 여부와 fallback 여부 표시
- API 인증키를 코드, 문서, Git 커밋에 포함하지 않는 운영 방식 문서화

비범위:

- 서버 프록시 구축
- 자체 DB 캐시
- 실시간 소셜 트렌드 API 연동
- 운영 수준의 API 호출 이력 저장
- 사용자 계정, 기관 테넌트, 권한 관리

## 3. 사용할 TourAPI 기능

첫 단계에서는 필요한 API만 제한적으로 사용한다.

| API | 목적 |
| --- | --- |
| `areaCode2` | 사용자가 입력한 개최 지역을 TourAPI 지역 코드로 매핑한다. |
| `searchFestival2` | 지역·기간 기반 행사/축제 후보를 조회한다. |
| `detailCommon2` | 축제 상세 주소, 좌표, 개요, 대표 이미지 등 공통 정보를 보강한다. |
| `locationBasedList2` | 행사장 좌표 기준 주변 관광지를 조회해 지역 관광 매력도 근거를 만든다. |

`detailIntro2`와 `detailImage2`는 이후 리포트 상세도와 시각 자료를 강화할 때 추가한다.

## 4. 데이터 흐름

```text
FestivalPlan
  -> areaCode2
  -> searchFestival2
  -> detailCommon2
  -> locationBasedList2
  -> TourismContext
  -> createForecast()
  -> createSimulation()
  -> createPlanningReport()
```

`FestivalPlan.region`은 지역 코드 조회의 기준이 된다. `searchFestival2` 결과가 현재 축제명과 직접 일치하지 않아도, 같은 지역 또는 유사 기간의 행사 정보를 유사 축제 수요 근거로 사용한다. 좌표가 확보되면 `locationBasedList2`로 주변 관광지를 조회한다.

## 5. 변환 규칙

TourAPI 응답은 현재 도메인 타입으로 변환한다.

`TourismSpot` 변환:

- `name`: TourAPI `title`
- `category`: 분류명 또는 content type 기반 설명
- `distanceKm`: `dist` 값이 있으면 km로 변환하고, 없으면 기본값 사용
- `appealScore`: 관광지 유형, 거리, 이미지 존재 여부를 기준으로 40-95 범위 점수 산정

`SimilarFestival` 변환:

- `name`: 행사 `title`
- `region`: 주소 또는 지역 코드 기반 문자열
- `visitors`: TourAPI에 방문객 수가 없으므로 행사 기간, 이미지/상세정보 존재 여부, 지역 관광지 수를 사용한 추정값
- `themeOverlap`: 현재 `FestivalPlan.keywords`와 제목/개요의 키워드 겹침 정도로 산정

`DataProvenance` 변환:

- 실제 API 성공 시 `sourceName`은 `한국관광공사 TourAPI`
- 일부 fallback 사용 시 `basisText`에 실제 조회와 샘플 보완을 함께 표시
- 전체 실패 시 기존 `sampleTourismContext`를 사용하고 fallback 문구를 유지
- `collectedPersonalData`는 항상 `false`

## 6. 오류 처리

모든 API 호출은 실패 가능성을 기본값으로 둔다.

- 인증키 없음: 샘플 데이터 사용
- HTTP 오류: 샘플 데이터 사용
- JSON 파싱 실패: 샘플 데이터 사용
- TourAPI 응답 구조 변경: 샘플 데이터 사용
- 지역 코드 미매핑: 지역명을 반영한 샘플 데이터 사용
- CORS 차단: 샘플 데이터 사용, 이후 서버 프록시 후보로 문서화

오류는 사용자에게 기술적 스택트레이스로 노출하지 않는다. 데이터 근거 패널에는 “실제 TourAPI 호출 실패로 샘플 데이터를 사용했습니다”처럼 공공 담당자가 이해할 수 있는 문구로 표시한다.

## 7. UI 표시

`DataBasisPanel`은 다음 상태를 구분해 보여준다.

- 실제 TourAPI 조회 성공
- 실제 TourAPI 일부 조회 성공 및 샘플 보완
- 샘플 데이터 대체 사용
- 개인정보 수집 여부: 수집하지 않음

상태는 색상만으로 표현하지 않고 텍스트로도 제공한다. 리포트에도 TourAPI 데이터 기준 시점 또는 샘플 대체 여부를 표시할 수 있도록 `DataProvenance` 문구를 재사용한다.

## 8. 보안과 키 관리

인증키는 `.env.local`의 `VITE_TOUR_API_KEY`에 저장한다. `.env.local`은 Git에 커밋하지 않는다.

프론트엔드 Vite 환경변수는 브라우저 번들에 포함될 수 있으므로, 이 방식은 데모와 개발용으로만 사용한다. 운영 또는 공개 배포 전에는 서버 프록시를 도입해 키가 브라우저에 노출되지 않게 해야 한다.

이미 대화나 화면에 노출된 인증키는 운영 전에 공공데이터포털에서 재발급하거나 폐기하는 것을 권장한다.

## 9. 테스트 기준

자동 테스트:

- 키가 없을 때 샘플 `TourismContext`를 반환한다.
- 지역명은 샘플 fallback 데이터에 반영된다.
- TourAPI 응답 변환 함수가 `TourismSpot`과 `SimilarFestival`을 생성한다.
- 응답이 비어 있어도 예측 서비스가 깨지지 않는다.

수동 검증:

- `.env.local`에 키가 없을 때 앱이 기존처럼 동작한다.
- `.env.local`에 키가 있을 때 네트워크 호출을 시도한다.
- 호출 실패 시 데이터 근거 패널에 fallback 상태가 표시된다.
- 수요 예측, 히트맵, 리포트가 계속 렌더링된다.

## 10. 향후 확장

서버 프록시를 도입하면 인증키 보호, 호출 이력 저장, 응답 캐시, 오류 관측, 공공기관 운영 로그까지 확장할 수 있다. 이번 단계에서는 앱 구조를 그 방향으로 막지 않기 위해 TourAPI 호출과 응답 변환을 `tourApiAdapter.ts` 내부 함수로 분리한다.
