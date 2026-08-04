# Fest-Twin OWASP Top 10 (2021) 보안 점검표

작성일: 2026-08-04  
점검 대상: Fest-Twin Express 백엔드 서비스 및 React SPA 프론트엔드  

---

## 1. OWASP Top 10 보안 항목별 이행 점검표

| OWASP 항목 | 위험 설명 | Fest-Twin 이행 상태 | 근거 소스 파일 |
| --- | --- | --- | --- |
| **A01: Broken Access Control** | 권한 우회 및 무단 데이터 접근 | **충족** (익명 시나리오 CRUD만 제공되며, 모든 API는 명시적 허용 패스 적용) | `server/scenarioRouter.js` |
| **A02: Cryptographic Failures** | 기밀 데이터 유출 | **충족** (TourAPI 키 등 서버 환경변수 보관, 브라우저 미노출, HTTPS 서빙) | `.env.example`, `server/tourProxy.js` |
| **A03: Injection** | SQL/Command/XSS 주입 공격 | **충족** (JSON 파일 DB 사용으로 SQLi 불가능, `X-XSS-Protection` 헤더 적용) | `server/db/database.js`, `server/index.js` |
| **A04: Insecure Design** | 설계상 보안 결함 | **충족** (Rate Limiter 분당 300회/120회 제한, CORS AllowlistStrict 제한) | `server/index.js:corsMiddleware` |
| **A05: Security Misconfiguration** | 보안 설정 오류 | **보완 완료** (`Strict-Transport-Security`, `Permissions-Policy`, `nosniff`, `DENY` 적용) | `server/index.js:securityHeadersMiddleware` |
| **A06: Vulnerable Components** | 취약한 의존성 사용 | **충족** (`npm audit` 0 vulnerability 유지, 최신 Node.js 20 Alpine 멀티스테이지) | `package.json`, `Dockerfile` |
| **A07: Identification & Auth** | 인증 및 세션 관리 결함 | **해당없음** (개인정보 미수집, 익명 분석 도구) | `docs/compliance/PII_ZERO_INVENTORY.md` |
| **A08: Software & Data Integrity** | 소프트웨어 무결성 결함 | **보완 필요** (Docker SBOM 자동 생성 CI/CD 파이프라인 추가 예정) | `docs/PROJECT_GAP_ANALYSIS_REPORT.md` |
| **A09: Logging & Monitoring** | 감사 로그 및 모니터링 미비 | **보완 완료** (Winston DailyRotate 180일/365일 보존, Rate Limit 429 감사 로깅) | `server/logger.js` |
| **A10: Server-Side Request Forgery** | SSRF 공격 | **충족** (서버 프록시는 `apis.data.go.kr`, `datalab.naver.com`, `ktdb.go.kr` 정해진 URL만 호출) | `server/tourProxy.js`, `server/trendProxy.js` |

---

## 2. 주요 보안 헤더 검증 명세

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains
Permissions-Policy: geolocation=(), camera=(), microphone=()
Cache-Control: no-store, max-age=0 (API 라우트 전용)
```
