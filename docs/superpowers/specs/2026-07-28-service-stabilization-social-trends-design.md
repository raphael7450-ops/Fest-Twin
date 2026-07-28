# 제출 안정화 및 검색량·소셜 관심도 연동 설계

## 배경

2026 관광데이터 활용 공모전 웹·앱 구현 부문 OT 자료 기준으로 Fest-Twin은 2026년 9월 21일 16:00까지 단순 데모가 아니라 접속 가능한 완제품 웹 서비스로 제출되어야 한다. 또한 한국관광공사 OpenAPI 활용은 필수이며, 파일 데이터만 사용한 구현은 인정되지 않는다.

현재 Fest-Twin은 TourAPI, 관광데이터랩 지출 데이터, KTDB/View-T 교통량, 지도, 시나리오 저장, 보고서 출력의 골격을 갖추고 있다. 다만 “축제 수요 예측 실패” 과제를 더 설득력 있게 해결하려면 개최 전 사전 관심도 지표가 필요하다. 따라서 제출 안정화 작업에 검색량·소셜 관심도 지표를 포함한다.

## 목표

1. 9월 21일 제출 시 공개 URL에서 전체 서비스 흐름이 끊기지 않게 한다.
2. 한국관광공사 TourAPI 실제 활용 내역을 화면과 제출 문서에서 확인 가능하게 한다.
3. 축제 수요 예측 근거에 검색량·소셜 관심도 지표를 추가한다.
4. API 실패, 키 미설정, 응답 부족 상황에서도 제출 시연이 유지되도록 Fallback 상태를 명확히 표시한다.
5. 기능설명서와 보고서에서 사용 API, 사용 위치, 한계, 보완 데이터를 설명한다.

## 추천 접근

### 1. Naver DataLab 검색량을 1차 관심도 지표로 사용

Naver DataLab 통합검색어 트렌드 API를 서버 프록시로 호출한다. 축제명, 지역명, 대표 키워드를 묶어 기간별 검색 관심도 흐름을 산출하고, 이를 `searchInterestScore`와 `trendAcceleration`으로 정규화한다.

이 API는 “축제 개최 전 관심이 증가하고 있는가”를 보여주기 좋다. 심사 관점에서도 수요 예측 실패 문제와 직접 연결된다.

### 2. YouTube 검색 반응은 보조 지표로 사용

YouTube Data API는 축제명 또는 지역명 관련 최신 영상 검색 결과를 기반으로 `socialMentionScore`를 계산하는 보조 지표로 둔다. API 키 준비가 늦어져도 핵심 기능이 무너지지 않도록 Naver DataLab 이후의 선택적 보정값으로 사용한다.

### 3. Instagram/X는 v2.0 확장 예정으로 문서화

Instagram Hashtag API와 X API는 권한 심사, 비용, 정책 변경 리스크가 커서 9월 제출 안정화 범위에는 넣지 않는다. 대신 아키텍처와 발표자료에서는 v2.0 확장 가능 모듈로 표현한다.

## 비추천 접근

### 모든 소셜 채널을 동시에 붙이는 방식

검색량, YouTube, Instagram, X, 블로그 언급량을 한꺼번에 붙이면 기능은 풍성해 보이지만 제출 리스크가 커진다. 특히 권한 심사나 API 과금 정책에 막히면 시연 직전에 핵심 화면이 흔들릴 수 있다.

### 소셜 데이터를 샘플로만 넣는 방식

샘플 데이터만 넣으면 개발은 빠르지만 OT 자료의 “OpenAPI 형태 인정” 기준과 서비스 설득력에 약하다. 샘플은 API 장애 대응 Fallback으로만 사용하고, 실제 조회가 가능한 채널을 최소 하나 이상 운영해야 한다.

## 안정화 범위

### 제출판 v1.0 필수

- 지역/기간 기반 TourAPI 축제 후보 조회
- 후보 선택 후 기획안 자동 반영
- Naver DataLab 검색량 기반 사전 관심도 지표
- 관심도 지표를 수요 예측 근거와 보고서에 반영
- 검색량 API 키 미설정 또는 실패 시 검증 스냅샷 또는 샘플 Fallback 표시
- 공개 URL, 보고서 출력, 공유 링크 복원, Docker 배포 검증

### 제출판 v1.0 선택

- YouTube 검색 결과 기반 소셜 콘텐츠 언급 지표
- 소셜 관심도 차트 또는 미니 카드

### v2.0 확장

- Instagram Hashtag API
- X API
- 블로그·뉴스 언급량
- 축제별 장기 관심도 예측 모델

## 데이터 모델

```ts
export type TrendSourceStatus =
  | "live"
  | "verified-snapshot"
  | "sample-fallback";

export interface TrendKeywordGroup {
  groupName: string;
  keywords: string[];
}

export interface TrendPoint {
  period: string;
  ratio: number;
}

export interface TrendContext {
  sourceStatus: TrendSourceStatus;
  sourceName: string;
  basisLabel: string;
  keywordGroups: TrendKeywordGroup[];
  searchInterestScore: number;
  trendAcceleration: number;
  socialMentionScore?: number;
  points: TrendPoint[];
  fallbackReason?: string;
  sourceDetails: Array<{
    sourceName: string;
    endpoint: string;
    querySummary: string;
    status: TrendSourceStatus;
    note: string;
  }>;
}
```

## 서버 API

### `POST /api/trends/naver-search`

Request:

```json
{
  "startDate": "2026-10-01",
  "endDate": "2026-12-31",
  "timeUnit": "week",
  "keywordGroups": [
    {
      "groupName": "강남 미디어 윈터페스타",
      "keywords": ["강남 미디어 윈터페스타", "강남 겨울 축제"]
    }
  ]
}
```

Response:

```json
{
  "sourceStatus": "live",
  "sourceName": "Naver DataLab 통합검색어 트렌드",
  "points": [
    { "period": "2026-10-01", "ratio": 32.1 },
    { "period": "2026-10-08", "ratio": 41.8 }
  ]
}
```

### `GET /api/social/youtube-search`

초기 제출판에서는 선택 기능으로 둔다. 응답이 없어도 Naver DataLab 기반 관심도는 유지된다.

## 클라이언트 흐름

1. 사용자가 지역과 기간을 선택한다.
2. TourAPI 후보 조회로 축제 후보를 가져온다.
3. 후보를 선택하면 축제명, 지역명, 기간을 기준으로 Naver DataLab 검색량을 조회한다.
4. `TrendContext`를 생성해 예측 모델에 전달한다.
5. Forecast는 검색 관심도와 증가율을 보정 계수로 사용한다.
6. KPI 카드와 Metric Evidence Drawer는 관심도 지표와 사용 API 상태를 표시한다.
7. 보고서는 “사전 관심도 근거” 섹션을 포함한다.

## 예측 반영 방식

검색량은 예상 방문객 수를 직접 대체하지 않고 보정 계수로만 사용한다.

```txt
trendBoost = clamp((searchInterestScore - 50) / 100 * 0.18, -0.08, 0.18)
accelerationBoost = clamp(trendAcceleration / 100 * 0.12, -0.05, 0.12)
finalVisitors = baselineVisitors * (1 + trendBoost + accelerationBoost)
```

이 방식은 검색량이 높다고 방문객 수를 과도하게 부풀리는 문제를 줄인다. 화면에는 “검색량은 실제 방문객 집계값이 아니라 사전 관심도 보정 지표”라고 표시한다.

## 오류 처리

- Naver DataLab 키가 없으면 `verified-snapshot` 또는 `sample-fallback`으로 전환한다.
- API 응답이 비어 있으면 검색량 차트는 비우지 않고 Fallback 상태와 사유를 표시한다.
- YouTube API 실패는 전체 예측 실패로 처리하지 않는다.
- 모든 TrendContext는 `sourceDetails`를 가져야 하며, 비밀키나 원문 토큰은 포함하지 않는다.

## UI 변경

### KPI

기존 `흥행 예측 지수`의 근거 안에 “사전 관심도 지수”를 추가한다. 카드 수를 늘리기보다 현재 KPI 구조 안에 하위 근거로 넣는 편이 화면 안정성이 좋다.

### 데이터 근거 패널

다음 상태를 표시한다.

- Naver DataLab 실제 조회
- 검증 스냅샷 사용
- 샘플 관심도 대체 사용

### Metric Evidence Drawer

예상 방문객 산출 단계에 다음 항목을 추가한다.

- 검색 키워드 그룹
- 검색 관심도 점수
- 관심도 증가율
- 검색량 보정 계수
- 지표 해석 한계

### 보고서

보고서에는 “사전 관심도 및 소셜 근거” 섹션을 추가한다.

## 테스트 전략

- 서버 프록시는 허용 파라미터만 통과시키고 비밀키를 응답에 포함하지 않는지 테스트한다.
- Trend Adapter는 live, verified-snapshot, sample-fallback 상태를 모두 테스트한다.
- Forecast는 trendBoost가 상한과 하한을 넘지 않는지 테스트한다.
- Metric Evidence Drawer는 검색량 보정 계수와 한계 문구를 표시하는지 테스트한다.
- ReportView는 활용 API 목록에 Naver DataLab을 포함하는지 테스트한다.

## 문서화

- `docs/contest/openapi-usage-evidence.md`에 Naver DataLab은 “수요 예측 보조 API”로 분리 기록한다.
- 공모전 필수 API는 한국관광공사 TourAPI임을 유지한다.
- `docs/contest/feature-description.md`에는 검색량·소셜 관심도 지표가 수요 예측 보조 근거임을 명시한다.
- 제출 자료에서 Instagram/X 실시간 연동을 완료 기능처럼 표현하지 않는다.

## 구현 순서

1. 제출 안정화 문서 3종 작성
2. Naver DataLab 프록시와 TrendContext 샘플/Fallback 추가
3. Forecast에 검색량 보정 계수 연결
4. KPI, Evidence Drawer, ReportView에 관심도 근거 표시
5. 배포 체크에 Trend API 상태 확인 추가
6. GitHub 푸시 및 원격 Docker 재배포

## 승인된 결정

- 9월 제출 안정화를 최우선으로 한다.
- Naver DataLab 검색량 체크는 제출판 v1.0에 포함한다.
- YouTube 검색 반응은 가능하면 포함하되, 일정 리스크가 있으면 보조 기능으로 남긴다.
- Instagram/X는 v2.0 확장 예정으로 문서화한다.
- 소셜/검색량 지표는 실제 방문객 수가 아니라 사전 관심도 보정 지표로 표현한다.

## 자체 검토

- Placeholder 없음.
- OT 자료의 OpenAPI 필수 활용 기준과 충돌하지 않는다.
- 검색량·소셜 지표를 과장하지 않고 보조 근거로 제한했다.
- 제출 안정화 범위와 v2.0 확장 범위를 분리했다.
