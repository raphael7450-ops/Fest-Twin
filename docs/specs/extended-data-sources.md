# Fest-Twin 확장 공공 및 빅데이터셋 연동 명세 (Extended Data Sources Spec)

## 목적

본 문서는 Fest-Twin의 사전 진단 신뢰도와 '실현 근거(Metric Evidence)'를 고도화하기 위해 한국관광공사 TourAPI 외에 추가로 연동 가능한 5대 공공 및 빅데이터셋의 연동 구조, API 엔드포인트, 데이터 스키마, Fallback 전략 및 실현 가능성을 정의한다.

---

## 1. 한국관광공사 관광데이터랩 (DataLab 빅데이터)

### 통신사 유동인구 데이터 (KT / SKT)
- **제공 기관**: 한국관광공사 관광데이터랩 (관광 빅데이터 API)
- **API 형태**: REST Open API (JSON)
- **조회 조건**: `areaCode`, `signguCode`, `baseYm`, `timeRange`
- **핵심 수집 필드**:
  - `visitorCount`: 시간대별/성연령별 순 방문자 수
  - `avgStayTime`: 평균 체류시간 (분 단위)
  - `revisitRate`: 재방문율 (%)
- **Fest-Twin 반영 지표**: `forecast.ts` 예상 방문객 수 및 피크 시간대 수요 분포 보정
- **Fallback 전략**: API 호출 실패 또는 시군구 미배정 시 지역별 과거 동일 분기 평균 유동인구 샘플 데이터로 대체 표시

### 카드사 지역 상권 소비 데이터 (BC / 신한카드)
- **제공 기관**: 한국관광공사 관광데이터랩 / 공공데이터포털
- **API 형태**: REST Open API / 파일데이터 (CSV/JSON)
- **조회 조건**: `areaCode`, `catCode` (음식점, 숙박, 쇼핑, 문화재 등), `period`
- **핵심 수집 필드**:
  - `spendingAmount`: 축제 기간 전후 상권 매출액 (원)
  - `spendingTransactionCount`: 결제 건수
  - `avgPricePerPerson`: 1인당 평균 소비 단가
- **Fest-Twin 반영 지표**: `impactMetrics.ts` 예상 지역 소비 창출액 및 ROI 산출 기준선
- **Fallback 전략**: 카드 데이터 미수집 지역의 경우 문체부 지역축제 통계 기반 평균 소비 단가 추정치 적용

---

## 2. 국가교통정보센터 (ITS) & 대중교통 (TOPIS)

### ITS 실시간 도로 소통 데이터
- **제공 기관**: 국토교통부 국가교통정보센터 (its.go.kr)
- **API 형태**: REST API (XML/JSON)
- **조회 조건**: `bbox` (행사장 인근 경도/위도 반경), `linkId`
- **핵심 수집 필드**:
  - `speed`: 도로 링크별 평균 통행 속도 (km/h)
  - `travelTime`: 구간 통행 시간 (초)
  - `congestionIndex`: 정체 단계 (원활/서행/정체)
- **Fest-Twin 반영 지표**: `trafficAdapter.ts` 행사장 접근 도로 정체 지수 및 주차 차오름 보정
- **Fallback 전략**: KTDB 연간 기준년도 링크 교통량 기반 정적 수치로 자동 Fallback

### 대중교통 승하차 수용성 데이터 (TOPIS / T-Money)
- **제공 기관**: 서울시 TOPIS / 공공데이터포털
- **API 형태**: REST Open API
- **조회 조건**: `stationId` (행사장 1km 이내 지하철역 및 버스정류장 ID), `date`
- **핵심 수집 필드**:
  - `getOffCount`: 시간대별 승차/하차 승객 수
- **Fest-Twin 반영 지표**: `SafetyLogisticsPanel.tsx` 대중교통 이용 분산률 및 출입구 정체 진단
- **Fallback 전략**: 행사장 정문/후문 비율에 따른 분산 추정치 적용

---

## 3. 기상청 단기예보 데이터

- **제공 기관**: 기상청 (공공데이터포털 API)
- **API 형태**: REST Open API (JSON)
- **조회 조건**: `nx`, `ny` (행사장 위경도 변환 격자 좌표), `base_date`, `base_time`
- **핵심 수집 필드**:
  - `POP`: 강수확률 (%)
  - `TMP`: 1시간 기온 (°C)
  - `WSD`: 풍속 (m/s)
  - `PTY`: 강수형태 (없음/비/비·눈/눈)
- **Fest-Twin 반영 지표**: `forecast.ts` 우천/폭염/한파 가감율(Attractiveness Multiplier, 0.7~1.15) 반영
- **Fallback 전략**: 기상청 평년 기후 통계값(월별 평균 기온 및 강우일수) 적용

---

## 4. 행정안전부 & 소방청 군중 안전 기준 데이터

- **제공 기관**: 행정안전부 (인파 사고 재난안전 관리지침) & 소방청 (119 구급 출동 이력 데이터)
- **데이터 형태**: 표준 공공 가이드라인 / 오픈 데이터
- **조회 조건**: `densityPerSqm` (m²당 밀집 인원), `totalCapacity`
- **핵심 수집 필드**:
  - `requiredSafetyStaffPer1k`: 1,000명당 필요 안전관리 인원
  - `requiredMedicalBooths`: 예상 피크 인원당 필요 구급차/의료 부스 수
- **Fest-Twin 반영 지표**: `SafetyLogisticsPanel.tsx` 안전요원/의료진 권고 배치 수치 및 위험 알림
- **Fallback 전략**: 행안부 표준 인파안전 매뉴얼 권고 기준(1m²당 3명 초과 시 위험 경보) 고정 적용

---

## 5. 문화체육관광부 지역축제 종합 통계 데이터

- **제공 기관**: 문화체육관광부 / 한국문화관광연구원
- **데이터 형태**: 파일데이터 (CSV / JSON)
- **조회 조건**: `festivalCategory`, `budgetTier`, `region`
- **핵심 수집 필드**:
  - `actualVisitorCount`: Past 실제 집계 방문객 수
  - `totalBudget`: 과거 축제 예산
  - `satisfactionScore`: 종합 만족도 점수 (100점 만점)
- **Fest-Twin 반영 지표**: `demandBackdataAdapter.ts` 유사 축제 벤치마킹 기준선 및 예산 효율성 비교
- **Fallback 전략**: 서울/경기/지방 광역 단위 평균 지표 적용

---

## 데이터셋 종합 비교 요약

| 데이터셋 명 | 제공 기관 | 수집 방식 | 주요 반영 컴포넌트 / 로직 | Fallback 전략 |
| :--- | :--- | :--- | :--- | :--- |
| **관광데이터랩 유동인구/소비** | 한국관광공사 | REST API | `forecast.ts`, `impactMetrics.ts` | 과거 동일 분기 샘플 데이터 |
| **ITS & TOPIS 교통** | 국토교통부 / 서울시 | REST API | `trafficAdapter.ts`, `SafetyLogisticsPanel` | KTDB 기준년도 도로 링크 교통량 |
| **기상청 단기예보** | 기상청 | REST API | `forecast.ts` (집객 가감율) | 평년 월별 평균 기수치 데이터 |
| **행안부 인파안전 매뉴얼** | 행정안전부 / 소방청 | 표준 명세 | `SafetyLogisticsPanel.tsx` | 행안부 1m²당 3명 안전 기준 |
| **문체부 지역축제 통계** | 문화체육관광부 | CSV/JSON | `demandBackdataAdapter.ts` | 광역 단위 축제 평균 지표 |
