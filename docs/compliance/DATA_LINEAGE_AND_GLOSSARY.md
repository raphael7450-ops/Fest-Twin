# Fest-Twin 데이터 라인리지 및 표준 용어집 (Data Lineage & Glossary)

작성일: 2026-08-04  
문서 성격: B2G 행정 감사 및 데이터 품질 검증용 명세서  

---

## 1. 데이터 라인리지 (Data Lineage)

Fest-Twin의 입력 파라미터부터 수집 API, 중간 가공 알고리즘, 최종 대시보드 KPI 표출까지의 전체 파이프라인 흐름도입니다.

```
[입력 데이터]
 - 지자체 기획안 (지역, 기간, 예산, 예상인원, 프로그램)
 - 외부 공공데이터 (TourAPI 4.0, Naver DataLab, KTDB/View-T, 관광데이터랩)

      │
      ▼

[어댑터 & 서버 프록시 레이어]
 - tourApiAdapter.ts  (/api/tour/*)      : 축제 후보, 문화시설 상세, 위치 좌표
 - trendAdapter.ts    (/api/trends/*)    : 네이버 키워드 검색량 관심도 추이
 - trafficAdapter.ts  (/api/traffic/*)   : KTDB 통행량 & 도로링크 혼잡도
 - spendingAdapter.ts (/api/spending/*)  : 시군구별 관광객 1인당 평균 소비액

      │
      ▼

[시뮬레이션 & 연산 엔진]
 - forecast.ts        : 시간대별 인파 유입 추정 및 피크 시간 산출
 - simulation.ts      : 2D 그리드 혼잡도 계산, 병목 보행로 탐지
 - weatherAdapter.ts  : 기온/강수/풍속 감쇄 보정계수 (weatherMultiplier)
 - impactMetrics.ts   : ROI 경제파급효과 배율 계산

      │
      ▼

[최종 표출 KPI & 리포트]
 - SummaryKpiCards    : 예상 방문객, 피크 밀집도, ROI, 안전예산 비율
 - MetricEvidence     : 산출 산식, 데이터 출처, 가공 로직, 한계점 설명 Drawer
 - ReportView         : 지자체 공공검토 보고서 (인쇄 및 CSV 익스포트)
```

---

## 2. 데이터 흐름 세부 필드 매핑표

| 입력 필드 | 처리 어댑터 / 엔진 | 가공 연산 산식 | 최종 표출 KPI 필드 |
| --- | --- | --- | --- |
| `plan.region`, `plan.startDate` | `tourApiAdapter.ts` | 지역 코드 매핑 및 TourAPI 4.0 후보 검색 | 축제 후보 목록, 기준 축제 `selectedFestivalBasis` |
| `plan.keywords` | `trendAdapter.ts` | 네이버 검색 트렌드 상대지수 (0~100) 평균화 | 검색 관심도 지수, 수요 지수 보정 |
| `plan.venueAddress` | `trafficAdapter.ts` | EMD 행정동 코드로 매핑 후 시간대별 통행량 결합 | 시간대별 정체율, 대중교통 분산 권고 |
| `plan.totalBudgetMillionKrw` | `spendingAdapter.ts` | (방문객 수 × 평균 소비액) ÷ 총 투입 예산 | 경제 파급효과 ROI 배율 (`roiMultiplier`) |
| `plan.gridWidth`, `facilities` | `simulation.ts` | 위치 기반 가우시안 커널 밀도 추정 (KDE) | 피크 시간대 최대 밀집도 (`peakDensity` 명/m²) |

---

## 3. 표준 행정 용어집 (Data Glossary)

| 표준 용어 | 영문 명칭 | 정의 및 산식 | 비고 |
| --- | --- | --- | --- |
| **방문객 수요지수** | Demand Index | 역사적 백데이터, 검색 관심도, 기상 보정계수의 가중 합산값 | 기본값 1.0 기준 |
| **피크 밀집도** | Peak Density | 행사장 피크 시간대 1m²당 최대 상주 인원 (명/m²) | 4.0명/m² 초과 시 위험 경고 |
| **경제 효과 ROI** | Economic ROI | (예상 방문객 수 × 시군구 객단가) ÷ 총 투입 예산 (배율) | 지자체 예산 타당성 근거 |
| **데이터 오염키 정화** | Redaction | 개인식별 가능 정보나 오염된 출처 데이터를 `[비식별 정화됨]` 처리 | B2G 보안 준수 |
| **기후 감쇄 보정계수** | Weather Multiplier | 강황, 강풍, 폭염 조건 시 방문객 감소 비율 (0.5~1.0) | weatherAdapter 연동 |
