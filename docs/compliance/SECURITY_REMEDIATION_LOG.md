# Fest-Twin 보안 취약점 점검 및 조치 결과서

작성일: 2026-08-04  
문서 성격: 2차 심층 감사에서 발견된 보안 취약점 조치 내역  

---

## 1. 취약점 발견 및 조치 종합 결과

| 번호 | 취약점 항목 | 조치 전 상태 | 조치 후 상태 | 적용 소스 파일 |
| --- | --- | --- | --- | --- |
| 1 | **로그 보존 기간 미달** | app/error 14일, audit 30일 | app/error 180일, audit 365일(1년)으로 연장 | `server/logger.js` |
| 2 | **CORS Origin 문자열 검증 취약** | `origin.includes("localhost")` 우회 위험 | `URL.hostname` 정밀 비교 검증으로 전환 | `server/index.js:corsMiddleware` |
| 3 | **OWASP 보안 헤더 누락** | HSTS, Permissions-Policy 미설정 | `Strict-Transport-Security`, `Permissions-Policy` 추가 | `server/index.js:securityHeadersMiddleware` |
| 4 | **환경변수 `.env.example` 누락** | 4개 변수만 기재 | 9개 수치/설정 변수 전체 명시 완비 | `.env.example` |
| 5 | **DB 설명 불일치** | 주석 "SQLite 영속 저장소" 표기 | "JSON 파일 기반 영속 저장소"로 주석 정정 | `server/db/database.js` |

---

## 2. 세부 조치 내역

### 1) 감사 로그 보존 기간 1년 충족 (`server/logger.js`)
- 공공기록물 관리법 및 개인정보보호법 시행령에 의거하여 행정 감사 로그 (`audit-%DATE%.log`)의 보존 기한을 기존 30일에서 `365d`(1년)로 연장
- 일반 Operational 로그 (`app-%DATE%.log`, `error-%DATE%.log`)는 `180d`(6개월)로 연장

### 2) CORS AllowlistHostname 단위 정밀 검증 (`server/index.js`)
- 기존 `origin.includes(...)` 문맥 검증의 우회 가능성을 차단하기 위해 `new URL(origin).hostname` 파싱 기반 허용 세트 비교로 교체

### 3) OWASP HSTS & Permissions Policy 적용 (`server/index.js`)
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` 헤더 추가로 강제 HTTPS 통신 유도
- `Permissions-Policy: geolocation=(), camera=(), microphone=()` 헤더 추가로 불필요한 브라우저 장치 권한 차단
