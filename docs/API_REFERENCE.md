# Fest-Twin 백엔드 REST API 명세서 (API Reference)

본 문서는 **Fest-Twin Express 백엔드 서버**가 제공하는 RESTful API 엔드포인트, 요청/응답 스키마, Rate Limit 정책 및 공공 OpenAPI 프록시 동작 명세를 기술합니다.

---

## 1. 전역 헤더 및 공통 응답 규격

### 1.1 HTTP 보안 헤더 (Security Headers)
모든 REST API 응답에는 다음 OWASP 보안 헤더가 포함됩니다.

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; script-src 'self' ... https://oapi.map.naver.com ...
X-RateLimit-Limit: 100 (또는 프록시 30)
X-RateLimit-Remaining: 99
```

### 1.2 공통 에러 응답 규격 (Error Response Format)
API 처리 중 오류 발생 시 표준 에러 객체를 반환합니다.

```json
{
  "error": {
    "code": "ERROR_CODE_NAME",
    "message": "상세 오류 설명 메시지"
  }
}
```

---

## 2. 시나리오 영속 REST API (`/api/scenarios`)

### 2.1 저장된 전체 시나리오 목록 조회
- **GET** `/api/scenarios`
- **Rate Limit**: 1분당 최대 100회
- **응답 (HTTP 200 OK)**:
```json
{
  "scenarios": [
    {
      "id": "scen_sample_01",
      "title": "2026 강남 미디어 윈터페스타 (기본 기획안)",
      "description": "관광데이터랩 객단가 117,000원 및 KTDB 영동대로 정체 시뮬레이션 적용안",
      "parameters": {
        "selectedHour": 20,
        "plan": { "name": "2026 강남 미디어 윈터페스타", "totalBudgetMillionKrw": 350, "expectedCapacity": 15000 }
      },
      "results_summary": { "roiMultiplier": 2.1, "peakDensity": 4.8 },
      "share_token": "token_gn_winter_2026",
      "created_at": "2026-07-24T12:00:00.000Z",
      "updated_at": "2026-07-24T12:00:00.000Z"
    }
  ],
  "count": 1
}
```

### 2.2 부서 공유 토큰 기반 시나리오 조회
- **GET** `/api/scenarios/share/:token`
- **Rate Limit**: 1분당 최대 100회
- **응답 (HTTP 200 OK)**: 해당 공유 토큰과 일치하는 단일 시나리오 JSON 반환
- **에러 (HTTP 404 Not Found)**: `{ "error": { "code": "SHARE_TOKEN_NOT_FOUND", "message": "..." } }`

### 2.3 특정 시나리오 상세 조회
- **GET** `/api/scenarios/:id`
- **응답 (HTTP 200 OK)**: 시나리오 상세 객체 반환

### 2.4 신규 시나리오 저장 (공유 토큰 자동 생성)
- **POST** `/api/scenarios`
- **Content-Type**: `application/json`
- **요청 본문**:
```json
{
  "title": "2026 여의도 봄꽃 축제",
  "description": "영등포구 여의도동 행사장",
  "parameters": { "plan": { ... }, "selectedHour": 18 },
  "results_summary": { "targetVisitors": 150000 }
}
```
- **응답 (HTTP 201 Created)**: 고유 `id` 및 8자리 난수 `share_token`이 부여된 생성 시나리오 객체 반환

### 2.5 시나리오 수정 & 삭제
- **PUT** `/api/scenarios/:id`: 시나리오 파라미터/결과 수정 (HTTP 200 OK)
- **DELETE** `/api/scenarios/:id`: 시나리오 삭제 (HTTP 200 OK `{ "success": true, "id": "scen_..." }`)

---

## 3. 공공 OpenAPI 프록시 API (`/api/tour`, `/api/spending`, `/api/traffic`)

모든 OpenAPI 프록시 요청은 쿼터 보호를 위해 **1분당 최대 30회 요청으로 제한 (`X-RateLimit-Limit: 30`)** 되며, **10분 TTL LRU 인메모리 캐시 스토어**를 적용받아 초당 수십 회 재호출 발생 시 외부 API 없이 캐시 데이터를 즉시 반환합니다.

### 3.1 관광공사 지역코드 및 축제 정보 프록시
- **GET** `/api/tour/area-code`: 관광공사 지역코드 데이터 반환
- **GET** `/api/tour/search-festival`: 축제 정보 목록 반환 (`detailCommon2` Y-플래그 자동 포함)

### 3.2 관광데이터랩 소비 지출 프록시
- **GET** `/api/spending/consumer-strength`: 카드 소비 지출 객단가 정보 반환
- **쿼리 파라미터**: `baseYm` (YYYYMM), `areaCd`, `signguCd`

### 3.3 국가교통DB(KTDB) 선택 링크 교통량 프록시
- **GET** `/api/traffic/selected-link`: 도로 링크별 통행량 및 정체 위험도 반환
- **쿼리 파라미터**: `linkId` (7자리 숫자), `year` (2019~2025), `weekType` (`weekday`|`weekend`), `time` (`0`~`23`|`ALL`)
