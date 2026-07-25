# Fest-Twin REST API 명세서

Fest-Twin 백엔드 서버(Express)에서 제공하는 RESTful API 엔드포인트, 요청 및 응답 규격, 보안 헤더 정책을 안내합니다.

---

## 1. 공통 정책

### 1.1 HTTP 보안 헤더
모든 응답에는 웹 보안 강화를 위해 아래 보안 헤더가 설정됩니다.

- `X-Content-Type-Options`: nosniff
- `X-Frame-Options`: DENY
- `X-XSS-Protection`: 1; mode=block
- `Referrer-Policy`: strict-origin-when-cross-origin
- `Content-Security-Policy`: Naver Map API, Google Fonts, 공공 API 허용 범위 설정

### 1.2 에러 응답 구조
처리 중 문제가 발생한 경우 아래 형식으로 에러 정보를 전달합니다.

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "상세 에러 안내"
  }
}
```

---

## 2. 시나리오 보관 API (`/api/scenarios`)

| 메소드 | 엔드포인트 | 역할 | 비고 |
| :--- | :--- | :--- | :--- |
| GET | `/api/scenarios` | 저장된 시나리오 목록 조회 | 최신순 정렬 (분당 100회 제한) |
| GET | `/api/scenarios/:id` | 특정 시나리오 상세 정보 조회 | ID 기반 조회 |
| GET | `/api/scenarios/share/:token` | 부서 공유 링크 시나리오 조회 | 공유 토큰 기반 조회 |
| POST | `/api/scenarios` | 신규 시나리오 저장 | 공유 토큰 자동 생성 |
| PUT | `/api/scenarios/:id` | 기존 시나리오 수정 | |
| DELETE | `/api/scenarios/:id` | 시나리오 삭제 | |

### 2.1 시나리오 요청 및 응답 예시

#### 시나리오 목록 응답
```json
{
  "scenarios": [
    {
      "id": "scen_sample_01",
      "title": "2026 강남 미디어 윈터페스타",
      "description": "관광데이터랩 객단가 117,000원 및 KTDB 영동대로 정체 시뮬레이션 적용안",
      "parameters": {
        "selectedHour": 20,
        "plan": { "name": "2026 강남 미디어 윈터페스타", "totalBudgetMillionKrw": 350, "expectedCapacity": 15000 }
      },
      "results_summary": { "roiMultiplier": 2.1, "peakDensity": 4.8 },
      "share_token": "token_gn_winter_2026",
      "created_at": "2026-07-24T12:00:00.000Z"
    }
  ],
  "count": 1
}
```

#### 신규 시나리오 저장 요청 (POST `/api/scenarios`)
```json
{
  "title": "2026 여의도 봄꽃 축제",
  "description": "영등포구 여의도동 행사장",
  "parameters": {
    "selectedHour": 18,
    "plan": { "name": "2026 여의도 봄꽃 축제" }
  },
  "results_summary": { "targetVisitors": 150000 }
}
```

---

## 3. 외부 공공데이터 프록시 API

외부 OpenAPI 쿼터 보호를 위하여 프록시 요청은 분당 30회로 제한되며, 10분 LRU 인메모리 캐시가 적용됩니다.

| 메소드 | 엔드포인트 | 연동 출처 | 주요 파라미터 |
| :--- | :--- | :--- | :--- |
| GET | `/api/tour/area-code` | 한국관광공사 TourAPI 4.0 | 지역코드 목록 |
| GET | `/api/tour/search-festival` | 한국관광공사 TourAPI 4.0 | `areaCode`, `sigunguCode` |
| GET | `/api/spending/consumer-strength` | 관광데이터랩 지출 데이터 | `baseYm`, `areaCd`, `signguCd` |
| GET | `/api/traffic/selected-link` | 국가교통DB (View-T) | `linkId`, `year`, `weekType`, `time` |
