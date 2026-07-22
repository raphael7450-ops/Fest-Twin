# Fest-Twin KTDB/View-T 교통량 근거 연동 설계

## 배경

Fest-Twin은 현재 TourAPI 기반 축제·관광지 데이터, 사용자 기획 입력값, 시뮬레이션 결과를 조합해 축제 수요와 현장 혼잡 리스크를 진단한다. 여기에 KTDB/View-T 교통량 데이터를 더하면 행사장 내부 혼잡뿐 아니라 행사장으로 접근하는 차량 흐름, 주차 부담, 교통안내 인력 필요성을 더 설득력 있게 설명할 수 있다.

사용자가 제안한 View-T API는 `LINKID`, `YEAR`, `WEEKTYPE`, `TIME` 조건으로 도로 링크별 교통량 정보를 조회한다. 이 데이터는 실시간 혼잡도가 아니라 기준년도 기반 교통량 데이터이므로, 화면과 문서에서는 `실시간 교통량`이 아닌 `기준년도 교통량 기반 접근 리스크`로 표현한다.

## 목표

- KTDB/View-T 도로 링크 교통량 데이터를 Fest-Twin의 안전·물류 판단 근거로 추가한다.
- 행사장 주변 대표 도로의 교통량을 바탕으로 `접근 교통 위험도`를 산출한다.
- 기존 `주차 수용 차오름 비율`과 안전/교통안내 인력 추천 근거에 교통량 보정값을 반영한다.
- `근거 보기`의 `사용 데이터 상세`에 KTDB 조회 조건과 사용 레코드를 표시한다.
- 데이터 기준년도와 한계를 명확히 표시해 공공 심사에서 과장된 실시간 데이터처럼 보이지 않게 한다.

## 비목표

- 도로망 Shape 파일 기반 자동 `LINKID` 매칭
- 실시간 교통 소통 정보 연동
- 길찾기, 경로 탐색, 내비게이션 기능
- 개인 단위 이동 경로 또는 차량 번호 기반 데이터 수집
- 교통 시뮬레이션 엔진 도입

이번 1차 범위는 수동/샘플 링크 매핑으로 대표 도로 교통량을 붙이고, 대시보드와 근거 패널에 접근 교통 리스크를 보여주는 것이다.

## 선택한 접근

### 접근 A: 즉시 실데이터 프록시 + 수동 LINKID 매핑

서버에 `/api/traffic/selected-link` 프록시를 추가하고, 클라이언트는 축제장에 매핑된 대표 `LINKID`를 조회한다. 지도 좌표에서 도로 링크를 자동 추출하지 않고, 데모용 대표 링크를 데이터 파일로 관리한다.

장점은 구현이 빠르고 심사 데모에 바로 쓰기 좋다는 점이다. 단점은 모든 축제장에 대해 자동 매칭되지 않으므로, 후보가 없는 지역에서는 샘플/보완 상태를 표시해야 한다.

### 접근 B: Shape 파일 기반 자동 LINKID 매칭

View-T 도로망 Shape 파일을 서버에 저장하고, 행사장 좌표와 가장 가까운 도로 링크를 자동 선택한다.

장점은 확장성이 좋다는 점이다. 단점은 Shape 파일 수급, 좌표계, 공간 인덱싱, 서버 저장공간과 배포 복잡도가 추가된다.

### 접근 C: 문서상 근거만 추가하고 계산은 미반영

KTDB 데이터를 근거 패널에만 표시하고, 주차/안전 계산에는 반영하지 않는다.

장점은 리스크가 낮다는 점이다. 단점은 대시보드 수치 설득력 개선이 약하다.

## 결정

1차 구현은 **접근 A**로 진행한다. 즉, `수동 LINKID 매핑 + 서버 프록시 + 접근 교통 위험도 + 근거 패널 표시`를 구현한다. 접근 B는 후속 차수로 문서화만 남긴다.

## 데이터 모델

새 도메인 타입을 추가한다.

```ts
export type TrafficSourceStatus = "live" | "mapped-sample" | "sample-fallback";

export interface TrafficLinkRecord {
  linkId: string;
  roadName: string;
  roadRank?: string;
  lanes?: number;
  inboundVolume: number;
  outboundVolume: number;
  totalVolume: number;
}

export interface TrafficContext {
  status: TrafficSourceStatus;
  year: number;
  weekType: "weekday" | "weekend";
  time: string;
  riskScore: number;
  riskLabel: "낮음" | "보통" | "높음";
  links: TrafficLinkRecord[];
  provenance: DataProvenance;
  sourceDetails: MetricEvidenceSourceDetail[];
}
```

`TrafficContext`는 안전·물류 계산과 근거 패널에서 함께 사용한다.

## 서버 프록시 설계

새 서버 라우터 `server/trafficProxy.js`를 추가한다.

엔드포인트:

```txt
GET /api/traffic/selected-link?linkId=<LINKID>&year=<YEAR>&weekType=<weekday|weekend>&time=<HH|ALL>
```

서버는 이 요청을 View-T API로 변환한다.

```txt
https://viewt.ktdb.go.kr/cong/api/moveAPI.do?url=detail_selectedLink_road&LINKID=...&YEAR=...&WEEKTYPE=...&TIME=...
```

검증 기준:

- `linkId`: 숫자 또는 영문/숫자 링크 ID만 허용
- `year`: 2019~2025 사이만 허용
- `weekType`: `weekday`, `weekend`만 허용하고 내부적으로 View-T의 `WEEKTYPE` 값으로 변환
- `time`: `ALL` 또는 0~23시만 허용
- 빈 값, `Infinity`, `NaN`, 임의 URL, 인증 관련 키는 거부

이 API는 별도 개인 인증키를 요구하지 않는 공개 문서형 API로 시작한다. 만약 향후 키가 필요해지면 TourAPI처럼 서버 환경변수로만 관리한다.

## 클라이언트 어댑터 설계

새 파일 `src/services/trafficAdapter.ts`를 추가한다.

역할:

- 축제 계획에서 대표 교통 링크를 선택한다.
- 서버 프록시를 호출한다.
- View-T 응답을 `TrafficContext`로 정규화한다.
- 응답 실패 시 샘플 교통량 컨텍스트를 반환한다.
- `MetricEvidenceSourceDetail`을 생성해 근거 패널에 전달한다.

초기 링크 매핑은 별도 데이터 파일로 둔다.

```ts
interface TrafficLinkMapping {
  id: string;
  regionKeyword: string;
  venueKeyword?: string;
  linkId: string;
  roadName: string;
  note: string;
}
```

1차 데모에서는 서울/강남, 광화문 등 현재 TourAPI 최근 축제 예시에 맞는 대표 링크를 우선 넣는다. 정확한 `LINKID`는 View-T 도로망 자료 확인 후 갱신 가능하도록 데이터 파일에 분리한다.

## 접근 교통 위험도 산출

`TrafficContext.riskScore`는 다음 요소로 계산한다.

- 링크별 총 교통량
- 차선당 교통량
- 주말/피크 시간 가중치
- 조회 실패 또는 샘플 데이터 사용 시 신뢰도 하향

초기 공식:

```txt
차선당 교통량 = totalVolume / max(lanes, 1)
위험점수 = min(100, round(차선당 교통량 / 1800 * 100 + weekendBonus + peakHourBonus))
```

라벨:

- 0~39: 낮음
- 40~69: 보통
- 70 이상: 높음

이 공식은 교통공학 정식 용량 분석이 아니라 사전 기획 단계의 접근 리스크 지표임을 근거 패널과 문서에 표시한다.

## 대시보드 반영

### 안전 및 물류 수용성 패널

`SafetyLogisticsPanel`에 다음 항목을 추가한다.

- 접근 교통 위험도
- 기준 도로명
- 기준년도/주말·시간 조건

기존 `주차 수용 차오름 비율`은 교통 위험도가 높을수록 소폭 보정한다.

```txt
보정 주차 수용률 = 기존 주차 수용률 + round(trafficRiskScore * 0.12)
```

상한은 100%로 제한한다.

### 근거 패널

`parking-occupancy`, `safety-staff`, `medical-staff` 지표의 `sourceDetails`에 KTDB 교통량 근거를 포함한다.

표시 필드:

- sourceName: `KTDB/View-T 도로 교통량 조회`
- endpoint: `/api/traffic/selected-link`
- query: `linkId`, `year`, `weekType`, `time`
- record: 도로명, 도로등급, 차선수, 진입 차량 수, 진출 차량 수, 총 교통량
- note: `기준년도 교통량 기반 접근 리스크이며 실시간 교통정보가 아닙니다.`

## 오류 및 fallback 처리

- View-T 응답 실패: `sample-fallback`
- 링크 매핑 없음: `mapped-sample`
- 일부 필드 누락: 가능한 필드는 사용하고 누락 필드는 `-`로 표시
- 데이터 기준년도 없음: 2025년으로 제한하고 화면에 기준년도 표시

fallback 상태에서도 `sourceDetails`를 비워두지 않는다. 어떤 샘플 링크와 어떤 가정을 사용했는지 표시한다.

## 보안 및 개인정보

- 개인 단위 이동 경로, 차량 번호, 단말 위치 정보는 수집하지 않는다.
- 서버 프록시에는 허용된 파라미터만 전달한다.
- 외부 API URL 전체를 화면에 노출하지 않고 내부 프록시 경로만 표시한다.
- 기존 evidence drawer의 `[비공개]` redaction 규칙을 KTDB 근거에도 동일하게 적용한다.

## 테스트 계획

- 서버 프록시 테스트
  - 정상 요청이 View-T URL로 변환되는지 확인
  - 허용되지 않는 `year`, `weekType`, `time`, URL형 파라미터를 거부하는지 확인
  - 응답 정규화와 오류 처리를 확인

- trafficAdapter 테스트
  - 링크 매핑이 있는 계획에서 `TrafficContext`가 생성되는지 확인
  - 실패 시 샘플 fallback과 근거 상세가 생성되는지 확인
  - sourceDetails에 endpoint/query/record가 포함되고 민감값은 없는지 확인

- 안전·물류 테스트
  - 교통 위험도가 높을 때 주차 수용률이 보정되는지 확인
  - 위험도 상한이 100%를 넘지 않는지 확인

- UI 테스트
  - 안전 및 물류 패널에 `접근 교통 위험도`가 표시되는지 확인
  - 근거 drawer에 `KTDB/View-T 도로 교통량 조회`와 `LINKID` 근거가 표시되는지 확인

- 전체 검증
  - `npm run test`
  - `npm run build`
  - 원격 Docker 배포 후 공개 URL에서 API와 화면 확인

## 문서 반영

구현 후 다음 문서를 갱신한다.

- `docs/data-methodology.md`
  - KTDB/View-T 교통량 데이터 출처와 기준년도 설명
  - 접근 교통 위험도 산출 방식
  - 실시간 데이터가 아니라 기준년도 기반 사전 추정값이라는 한계

필요하면 `README.md`의 데모 검증 포인트에도 `접근 교통 위험도`를 추가한다. 단, 기존 미반영 로컬 변경과 섞이지 않도록 파일 상태를 먼저 확인한다.

## 승인 기준

- 안전 및 물류 패널에서 `접근 교통 위험도`를 확인할 수 있다.
- 주차 수용률 계산에 교통량 기반 보정이 반영된다.
- 근거 drawer에서 KTDB/View-T 조회 조건과 사용 도로 링크 레코드를 볼 수 있다.
- fallback 상태에서도 어떤 샘플 링크/가정이 사용됐는지 표시된다.
- 민감값 또는 외부 원본 URL 전체가 화면에 노출되지 않는다.
- 전체 테스트와 빌드가 통과한다.
- GitHub push와 원격 Docker 배포까지 완료된다.
