# Fest-Twin 사용 데이터 상세 근거 설계

## 배경

현재 Fest-Twin 대시보드의 `근거 보기`는 지표별 데이터 출처, 산출 방식, 가정, 한계를 설명한다. 이 구조는 “왜 이런 수치가 나왔는가”를 이해시키는 데에는 도움이 되지만, 공공사업 심사나 지자체 담당자 검토 관점에서는 한 단계가 더 필요하다.

담당자는 다음 질문을 확인하고 싶어 한다.

- 실제로 어떤 TourAPI 조회를 했는가
- 어떤 지역, 기간, 축제 후보가 계산에 반영되었는가
- 어떤 레코드의 어떤 필드가 사용되었는가
- 사용자 입력값과 공공데이터 값이 어디에서 섞였는가
- 샘플 또는 보완 데이터가 들어갔다면 어디까지가 실제 데이터이고 어디부터가 추정인가

따라서 이번 설계의 목적은 결과 수치의 설득력을 높이기 위해 `정확한 사용 데이터 근거`를 화면에서 확인할 수 있게 하는 것이다.

## 목표

- 지표별 근거 패널에서 실제 사용 데이터의 조회 조건과 주요 레코드를 확인할 수 있게 한다.
- TourAPI, 사용자 입력, 파생 계산값, 샘플 보완값을 서로 구분해서 보여준다.
- API 키, 시크릿, 내부 서버 환경값은 절대 노출하지 않는다.
- 원본 JSON 전체를 그대로 보여주는 대신, 계산과 검토에 필요한 필드만 정규화해서 보여준다.
- 향후 보고서, PDF, 감사 로그 확장에도 재사용 가능한 데이터 구조를 만든다.

## 비목표

- TourAPI 원문 JSON 전체 다운로드 기능
- 데이터베이스 기반 장기 감사 로그 저장
- 실시간 소셜 API의 실제 연동
- 개인정보 또는 위치 추적 데이터 수집
- 모델 자체의 통계적 정확도 검증 보고서 작성

이번 범위는 “현재 데모 화면에서 어떤 데이터가 지표 산출에 사용되었는지 추적 가능하게 만드는 것”에 한정한다.

## 선택한 접근

### 1. 원문 전체가 아닌 정규화된 상세 근거

TourAPI 응답 전체를 화면에 노출하면 너무 복잡하고, 서비스 키나 불필요한 필드가 섞일 위험이 있다. 대신 `사용 데이터 상세` 모델을 추가해 다음 정보만 보존한다.

- 데이터 종류: TourAPI, 사용자 입력, 파생 계산값, 샘플 보완 데이터
- 조회 엔드포인트 또는 내부 프록시 경로
- 조회 조건: 지역 코드, 기간, 콘텐츠 타입, 반경 등
- 조회 시각
- 응답 상태 또는 fallback 상태
- 실제 사용 레코드의 핵심 필드
- 계산에 들어간 입력값
- 보완 데이터 사용 사유

이 방식은 심사위원이 “근거를 확인할 수 있다”고 느끼게 하면서도, 화면과 보안 부담을 적절히 제한한다.

### 2. 지표 근거 모델 확장

기존 `MetricEvidence`에 `sourceDetails`를 추가한다.

```ts
interface MetricEvidenceSourceDetail {
  sourceId: string;
  sourceName: string;
  sourceType: "tourapi" | "user-input" | "derived" | "sample";
  statusLabel: string;
  retrievedAt?: string;
  endpoint?: string;
  query?: Array<{
    label: string;
    value: string;
  }>;
  records?: Array<{
    label: string;
    fields: Array<{
      label: string;
      value: string;
    }>;
  }>;
  calculationInputs?: Array<{
    label: string;
    value: string;
  }>;
  note?: string;
}

interface MetricEvidence {
  metricId: string;
  title: string;
  summary: string;
  dataSources: string[];
  sourceDetails: MetricEvidenceSourceDetail[];
  formulaSummary: string;
  assumptions: string[];
  confidence: "high" | "medium" | "low";
  limitations: string[];
  contributors: Array<{
    label: string;
    value: string;
    effect: "positive" | "neutral" | "risk";
  }>;
}
```

`query`에는 `serviceKey`, `clientSecret`, `Authorization` 같은 민감값을 절대 포함하지 않는다. 내부 프록시가 실제 외부 API를 대신 호출하더라도 화면에는 안전한 조회 조건만 표시한다.

### 3. TourAPI 어댑터에서 근거 메타데이터 생성

현재 TourAPI 어댑터는 축제 후보와 관광지 맥락 데이터를 화면용 형태로 변환한다. 여기에 근거 메타데이터를 추가한다.

추가할 정보는 다음과 같다.

- 축제 후보 조회
  - endpoint: `/api/tour/festivals`
  - query: `areaCode`, `eventStartDate`, `eventEndDate`, `numOfRows`, `pageNo`
  - records: `contentid`, `title`, `addr1`, `eventstartdate`, `eventenddate`, `mapx`, `mapy`

- 행사장 주변 관광지 조회
  - endpoint: `/api/tour/location`
  - query: `mapX`, `mapY`, `radius`, `contentTypeId`
  - records: `contentid`, `title`, `addr1`, `dist`, `mapx`, `mapy`

- 축제 상세 정보 조회
  - endpoint: `/api/tour/detail`
  - query: `contentId`
  - records: 행사 기간, 주소, 좌표, 이미지 등 화면과 계산에 쓰는 핵심 필드

TourAPI 장애, 키 누락, 응답 없음, 후보 없음 같은 경우에도 빈 값으로 끝내지 않고 `statusLabel`과 `note`에 사유를 남긴다.

### 4. 사용자 입력과 파생 계산값도 같은 구조로 표시

정확한 근거는 공공데이터만으로 완성되지 않는다. 예산, 예상 수용 인원, 계획 지역, 선택 시간대 같은 사용자 입력값도 지표에 직접 영향을 준다.

따라서 `sourceType: "user-input"` 상세 근거를 추가해 다음을 보여준다.

- 계획 지역
- 축제명 또는 선택 후보
- 축제 기간
- 총 예산
- 수용 인원
- 현재 선택 시간대

그리고 `sourceType: "derived"` 상세 근거에는 다음을 보여준다.

- 피크 시간대 예상 방문객
- 최고 밀집 셀
- 방문객 1인당 예산
- 평균 소비 단가
- ROI 계산 입력값

이렇게 하면 “공공데이터로 가져온 값”과 “사용자가 입력한 값”과 “시스템이 계산한 값”이 분리되어 보인다.

## 화면 설계

### 근거 패널 구조

`MetricEvidenceDrawer`의 순서를 다음처럼 바꾼다.

1. 요약
2. 사용 데이터
3. 사용 데이터 상세
4. 산출 방식
5. 주요 영향 요인
6. 가정
7. 한계

`사용 데이터 상세`는 접히지 않는 기본 섹션으로 둔다. 다만 레코드가 많을 경우에는 처음 3~5개만 보여주고, 나머지는 “외 N건” 형태로 요약한다.

### 표시 예시

축제 후보를 TourAPI에서 찾은 경우:

- 출처: TourAPI 축제 후보 조회
- 상태: 실시간 조회 성공
- 조회 시각: 2026-07-22 14:35
- 조회 조건: 서울, 2026-01-01~2026-12-31
- 사용 레코드:
  - contentid: 3439947
  - title: 강남 미디어 윈터페스타
  - addr1: 서울특별시 강남구 일대
  - eventstartdate: 2026-12-01
  - eventenddate: 2026-12-31
  - mapx/mapy: 127.0..., 37.5...

샘플 보완 데이터가 들어간 경우:

- 출처: 혼잡도 시뮬레이션 보완값
- 상태: 공공데이터 외 추정값 사용
- 사유: 실시간 유동 인구 API가 연결되지 않아 계획 수용 인원과 시간대별 수요 곡선을 기준으로 계산
- 사용 입력값: 총 예산, 수용 인원, 피크 시간대 예상 방문객

## 데이터 흐름

1. 사용자가 지역과 기간을 선택한다.
2. TourAPI 프록시가 축제 후보를 조회한다.
3. 어댑터가 축제 후보 목록과 `candidateSourceDetails`를 함께 만든다.
4. 사용자가 축제 후보를 선택한다.
5. TourAPI 프록시가 상세 정보와 주변 관광지 정보를 조회한다.
6. 어댑터가 `TourismContext`와 `sourceDetails`를 함께 만든다.
7. 대시보드 산출 로직이 예측, 혼잡도, 경제효과 지표를 계산한다.
8. `metricEvidence.ts`가 지표별 근거를 만들면서 TourAPI 상세 근거, 사용자 입력 근거, 파생 계산 근거를 조합한다.
9. `MetricEvidenceDrawer`가 `사용 데이터 상세` 섹션에 조합된 근거를 표시한다.

## 보안 및 개인정보 기준

- `serviceKey`, `clientSecret`, `Authorization`, `Cookie` 값은 모델에 저장하지 않고 화면에도 표시하지 않는다.
- 내부 서버 환경변수명과 실제 값은 표시하지 않는다.
- TourAPI 공공데이터 필드 중 화면과 계산에 쓰는 최소 필드만 표시한다.
- 개인 단위 위치 정보, 휴대폰 번호, 결제 정보, 실명 정보는 수집하지 않는다는 설명을 한계 또는 방법론 문서에 유지한다.
- 조회 실패 메시지는 원인을 설명하되, 서버 내부 경로나 비밀값은 노출하지 않는다.

## 오류 및 fallback 처리

다음 상황은 화면에 구분해서 표시한다.

- `실시간 조회 성공`: TourAPI에서 정상 응답을 받은 경우
- `일부 데이터 보완`: TourAPI 일부 필드가 비어 있어 기존 입력값 또는 보완값을 사용한 경우
- `샘플 데이터 사용`: API 키 누락, 네트워크 오류, 후보 없음 등으로 샘플 컨텍스트를 사용한 경우
- `사용자 입력 기준`: 공공데이터가 아니라 사용자가 직접 입력한 값인 경우
- `시스템 산출값`: 예측 또는 시뮬레이션 결과에서 파생된 값인 경우

이 상태 라벨은 공공사업 데모에서 “좋은 척하는 수치”가 아니라 “어디까지가 실제이고 어디부터가 추정인지 아는 시스템”이라는 인상을 주기 위한 핵심 요소다.

## 테스트 계획

- `metricEvidence` 단위 테스트
  - 지표별 `sourceDetails`가 생성되는지 확인한다.
  - 사용자 입력, TourAPI, 파생 계산값이 구분되는지 확인한다.
  - 민감 키 이름과 값이 포함되지 않는지 확인한다.

- TourAPI 어댑터 테스트
  - 축제 후보 조회 결과에서 endpoint, query, 주요 레코드가 생성되는지 확인한다.
  - 주변 관광지 조회 결과에서 좌표, 반경, 콘텐츠 타입 근거가 생성되는지 확인한다.
  - 조회 실패 또는 fallback 상태에서도 근거 상태가 남는지 확인한다.

- 화면 테스트
  - `근거 보기`를 열면 `사용 데이터 상세` 문구가 보이는지 확인한다.
  - TourAPI 후보를 선택한 상태에서 `contentid`, 기간, 주소, 좌표가 표시되는지 확인한다.
  - 샘플 데이터 상태에서는 샘플 사용 사유가 표시되는지 확인한다.

- 전체 검증
  - `npm run test`
  - `npm run build`
  - 로컬 화면에서 근거 패널 직접 확인
  - 원격 Docker 배포 후 공개 URL에서 TourAPI 조회와 근거 패널 확인

## 문서 반영

구현 후 다음 문서를 갱신한다.

- `docs/data-methodology.md`
  - 사용 데이터 상세 근거 항목 추가
  - TourAPI 조회 조건과 필드 설명 추가
  - 샘플/보완 데이터 표시 기준 추가

- 필요 시 `README.md`
  - 데모 검증 포인트에 “지표별 사용 데이터 상세 근거 확인” 추가

## 승인 기준

- 주요 KPI와 안전/물류/ROI 지표에서 `근거 보기`를 누르면 `사용 데이터 상세`가 보인다.
- TourAPI를 통해 선택한 실제 축제의 `contentid`, 제목, 주소, 기간, 좌표가 근거에 표시된다.
- 사용자 입력값과 시스템 산출값이 공공데이터와 분리되어 표시된다.
- 샘플 또는 보완 데이터 사용 시 그 사유가 명확히 표시된다.
- API 키와 시크릿은 화면, 테스트 스냅샷, 커밋 파일 어디에도 노출되지 않는다.
- 테스트와 빌드가 통과한다.
- 변경 내용이 GitHub에 push되어 다른 장소에서도 이어서 확인할 수 있다.
