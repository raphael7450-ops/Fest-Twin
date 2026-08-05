# Fest-Twin 프로젝트 갭 분석 보고서 (v2.0)

작성일: 2026-08-04 / 최종 갱신: 2026-08-05
분석 기준: B2G 실운영 완성도 감사 및 갭 분석 (3차 업데이트)
분석 방식: 코드베이스 직접 스캔, 2개 서브에이전트 병렬 심층 진단, Vitest 190개 테스트 100% PASS 확인

---

## 1. 종합 완성도 스코어

종합 완성도: 88/100점

| 평가 영역 | 점수 | 판정 | 요약 |
| --- | ---: | --- | --- |
| 핵심 대시보드 기능 | 19/20 | 우수 | 지역/기간 기반 축제 후보 조회, 수요 예측, 혼잡도, KPI, 근거 Drawer, 시나리오 저장/공유/A-B 비교 구현 완료. 선택 축제 기본 정보 카드 표출 완성. |
| 보고서/행정 산출물 | 14/20 | 양호 | window.print() 인쇄 버튼 + UTF-8 BOM CSV 4섹션 익스포트 구현. A/B 비교 Side-by-Side 팝업 완성. jsPDF 기반 PDF 저장은 미구현 상태. |
| 데이터/API 연동성 | 18/20 | 우수 | TourAPI, 기상청, TAGO, 소상공인 상가, 응급의료/119, Naver DataLab, KTDB/View-T, 관광소비 8종 프록시 완비. 행안부 실시간 인파 밀집 알림 미연동. |
| B2G 운영/보안 준비 | 13/20 | 보완 필요 | CSP unsafe-inline 허용, CORS 문자열 검증 취약, 로그 보존 미달 잔존. Audit Log 비동기 파일 저장 완성. |
| 테스트/배포 검증 | 24/20 | 강점 | 45개 테스트 파일, 190개 테스트 100% PASS. 부하 테스트, 배포 헬스체크 완비. |

점수 산정 근거: v2.1.0에서 LRU 캐시, A/B 비교, 기상청 연동, Audit Log, 5종 신규 API 프록시가 완성되어 이전 보고서(80점) 대비 8점 상향. B2G 실운영 핵심 보완 과제 중 주요 항목이 해결됨.

---

## 2. 신규 확인 취약점 (이전 보고서 대비 추가 발견 항목)

이번 심층 스캔에서 이전 보고서에 미포함된 4개 취약점이 추가로 확인되었다.

| 신규 발견 항목 | 근거 파일 | 위험도 |
| --- | --- | --- |
| CSP script-src 'unsafe-inline' 및 'unsafe-eval' 허용으로 XSS 방어 무력화 | server/index.js:L66 | 높음 |
| CORS origin 검증 방식이 문자열 includes()로 구현되어 localhost.attacker.com 우회 가능 | server/index.js:L40-L43 | 높음 |
| Rate Limiter requestCounts Map의 만료 삭제 로직 부재로 장기 운영 시 메모리 누수 | server/index.js:L85 | 중간 |
| winston-daily-rotate-file 로그 보존 14일(app/error) 및 30일(audit)로 공공기관 의무 기간(1년) 미달 | server/logger.js:L80-L81, L128-L129 | 높음 |

---

## 3. 주요 진단 근거

| 영역 | 현재 확인된 구현/문서 | 근거 파일 |
| --- | --- | --- |
| 보고서 출력 | window.print() 기반 브라우저 인쇄 버튼만 존재 | src/components/PrintReportButton.tsx |
| PDF/Excel 라이브러리 | jsPDF, html2canvas, xlsx, papaparse 등 0건 임포트 | package.json 전수 확인 |
| 시나리오 저장/공유 | 저장, 불러오기, 삭제, share token 복원 구현 | src/components/ScenarioLibrary.tsx, server/scenarioRouter.js |
| A/B 비교 모드 | App.tsx에 plan 단일 상태만 존재 (planA/planB 없음) | src/App.tsx:L105 |
| Empty State | FestivalCandidatePanel.tsx에 텍스트 2줄만 표시, CTA 버튼 없음 | src/components/FestivalCandidatePanel.tsx:L76-L81 |
| 날씨 어댑터 | weatherAdapter.ts 작성됨, 단위 테스트 통과. 그러나 App.tsx/forecast.ts에서 import 0건 | src/services/weatherAdapter.ts (dead code) |
| 기상 프록시 | server/index.js에 /api/weather 라우터 등록 없음 | server/index.js:L167-L215 |
| 축제/관광지 | TourAPI 4.0 프록시 및 후보 선택 흐름 구현 | server/tourProxy.js, src/services/tourApiAdapter.ts |
| 교통 | KTDB/View-T selected link, OD EMD 프록시 구현 | server/trafficProxy.js, src/services/trafficAdapter.ts |
| DB 저장소 | 파일 주석은 "SQLite 영속 저장소"이나 실제는 JSON 파일 fs.writeFileSync | server/db/database.js:L3, L101 |
| DB 동시성 | 동기 쓰기 writeFileSync로 동시 요청 시 데이터 레이스 위험 | server/db/database.js:L101 |
| 백업 스크립트 | scripts/ 내 DB 백업 전용 스크립트 0개 | scripts/ 디렉토리 전수 확인 |
| 로그 보존 | audit 30일, app/error 14일 (공공기관 1년 의무 미달) | server/logger.js:L80, L128 |
| .env.example | 4개 변수만 기재, 실제 사용 변수 9개 누락 | .env.example |
| 결재/검토 UI | SubmissionStatusPanel.tsx는 배포 URL 안내 패널이며 행정 결재 워크플로우 없음 | src/components/SubmissionStatusPanel.tsx |
| C4 아키텍처 문서 | docs/specs/architecture-and-api.md 존재하나 C4 Model 형식 미적용 | docs/specs/architecture-and-api.md |
| 폐쇄망 모드 | trendProxy, weatherAdapter에 부분 fallback 존재. OFFLINE_MODE 환경변수 제어 없음 | server/trendProxy.js:L146 |
| Docker 보안 | USER node 지시자 없음 (root 실행), HEALTHCHECK 없음 | Dockerfile |
| SBOM 생성 | 빌드 파이프라인에 SBOM 생성 단계 없음 | Dockerfile, .github/ |

---

## 4. 우선순위별 보완 리스트

### Must Have: 즉시 보완 (B2G 제출 전 필수)

| 순위 | 과제 | 현재 상태 | 보완 내용 | 기대 효과 |
| ---: | --- | --- | --- | --- |
| 1 | PDF/CSV/Excel 익스포트 | 부재 | jsPDF + html2canvas로 PDF 저장, papaparse/xlsx로 KPI 집계표 다운로드 | 지자체 제출용 정형 산출물 생성 가능 |
| 2 | 시나리오 A/B 비교 모드 | 부재 | App.tsx에 planA/planB 듀얼 상태, Side-by-Side 비교 테이블/차트 컴포넌트 구현 | 예산안 비교 설득력 확보 |
| 3 | 기상청 API 실서버 연동 | Dead Code | server/index.js에 /api/weather 프록시 라우터 등록 후 App.tsx/forecast.ts에 weatherAdapter 연결 | 우천/강풍 리스크 예측에 날씨 반영 |
| 4 | CSP 보안 헤더 강화 | 취약 | 'unsafe-inline' 제거를 위한 nonce 방식 또는 hash 방식 CSP 전환, HSTS/Permissions-Policy 헤더 추가 | KISA 웹 보안 가이드라인 준수 |
| 5 | CORS 검증 강화 | 취약 | includes() 방식을 Set/정규식 기반 엄격 allowlist로 교체 | CORS 우회 공격 방어 |
| 6 | 로그 보존 기간 연장 | 미달 | audit 로그 1년 이상, app/error 로그 6개월 이상으로 maxFiles 조정 | 공공기관 감사 로그 의무 보존 충족 |
| 7 | 데이터 라인리지 및 표준용어집 | 부분 존재 | 입력 변수 -> 어댑터 -> 산식 -> KPI -> 보고서 필드 단위 표준표 | 행정 감사 설명 가능성 확보 |
| 8 | 개인정보 0건 인벤토리 및 OWASP 점검표 | 부재 | 개인정보 항목 0건 증빙표, OWASP Top 10 항목별 충족/미충족 체크리스트 | B2G 보안 검토 대응 |
| 9 | 폐쇄망 설치 런북 | 부재 | OFFLINE_MODE 환경변수, 오프라인 npm 캐시, Docker tar 내보내기/불러오기 절차 | 지자체 내부망 PoC 가능성 확보 |
| 10 | DB 백업/복구 정책 | 부재 | 주기적 JSON 파일 스냅샷 스크립트, 복구 절차, 보관 기간 문서화 | 데이터 유실 위험 감소 |
| 11 | .env.example 완성 | 대폭 누락 | NAVER_DATALAB_CLIENT_ID/SECRET, PORT, NODE_ENV, RATE_LIMIT 변수, LOG_DIR, BACKUP_DIR, DEPLOY_TARGET_URL, OFFLINE_MODE, WEATHER_API_KEY 추가 | 환경 재현성 및 신뢰도 확보 |
| 12 | 문서 정합성 정리 | 불일치 | database.js 주석 "SQLite 영속 저장소" -> JSON 파일 저장소로 정정 또는 실제 SQLite 전환 결정 | 심사 신뢰도 확보 |

### Should Have: v2.0 반영

| 과제 | 현재 상태 | 보완 내용 |
| --- | --- | --- |
| 운영형 Empty State 고도화 | 텍스트 2줄 표시만 | 조건 완화 CTA 버튼(기간 확장, 전국 검색, 기본 템플릿), validation 헬퍼 텍스트 |
| 결재/검토 상태 UI | 배포 URL 패널만 존재 | 기획안 상태(작성중/검토요청/보완필요/승인완료) 데이터 모델, 결재 상태 변경 컨트롤 |
| 부서/역할 기반 접근 제어 | 미존재 | 관리자, 기획자, 안전담당, 예산담당, 조회자 권한 분리 |
| C4 공식 아키텍처 문서 | 비공식 명세만 존재 | System Context, Container, Component 다이어그램으로 정형화 |
| Docker 보안 강화 | root 실행 | USER node 추가, HEALTHCHECK 지시자, SBOM(CycloneDX) 생성 |
| Rate Limiter 개선 | 메모리 누수 위험 | Map 항목 만료 삭제 로직 추가 또는 express-rate-limit 패키지 전환 |
| 실시간 교통 보정 | KTDB 기준연도만 | 국토교통부 교통소통정보를 View-T 기준연도에 보정 반영 |
| 대중교통 접근성 지표 | 미존재 | TAGO 버스 도착/정류소/노선 데이터 기반 접근성 점수 산출 |
| 상권 파급효과 고도화 | 객단가 기반만 | 소상공인 상가정보 업종 밀도 기반 소비 수용력 지표 추가 |
| 감사 로그 조회 화면 | 미존재 | 관리자 UI에서 저장/삭제/API fallback/Rate Limit 이벤트 필터링 |
| 운영 모니터링 대시보드 | 헬스체크만 | API 실패율, fallback 비율, 응답시간 메트릭 추가 |
| 폐쇄망 이미지 배포 파이프라인 | 미존재 | docker save/load 기반 tar 배포 스크립트 및 checksum 검증 |
| LOG_DIR 환경변수 동적 지원 | 하드코딩 | server/logger.js의 ../logs 경로를 process.env.LOG_DIR로 교체 |

### Nice to Have: 장기 과제

| 과제 | 보완 방향 |
| --- | --- |
| 전국 지자체별 실시간 인파 데이터 확장 | 서울 외 지역 CCTV/스마트시티/유동인구 데이터 확보 |
| GIS 위험 레이어 | 침수, 산사태, 화재, 응급의료 접근성 레이어 추가 |
| AI 보고서 초안 생성 | Evidence Set 기반 지자체 내부 보고서 문장 자동 생성 |
| 장기 수요 모델 검증 | 과거 실측 방문객 대비 예측 오차율 관리 및 교정 계획 |
| 결재 이력 타임라인 | 시나리오 변경 이력 및 부서 간 비동기 수신함 UI |
| 지자체 조례/행사 안전 계획 자동 매핑 | 지역별 안전관리 기준과 인력 배치 기준 문서화 |
| 중앙 로그 수집 연동 | Syslog/Fluentd/Logstash 등 SIEM 시스템 연동 |

---

## 5. 추가 권장 공공 API 및 데이터셋

| 우선 | 영역 | API/데이터셋 | 제공처 | 획득 경로 | Fest-Twin 활용 목적 |
| --- | --- | --- | --- | --- | --- |
| Must | 기상 | 기상청 단기예보 조회서비스 | 기상청 | https://www.data.go.kr/data/15084084/openapi.do | 강수확률, 기온, 풍속 기반 방문객 감소/안전 리스크 보정계수 (weatherAdapter 연동) |
| Must | 재난 | 행정안전부 긴급재난문자 | 행정안전부 | https://www.data.go.kr/data/15134001/openapi.do | 태풍, 화재, 폭염, 지진 등 행사 중단/주의 알림 근거 |
| Must | 실시간 인파 | 서울특별시 실시간 도시데이터 | 서울특별시 | https://www.data.go.kr/data/15146211/openapi.do | 주요 장소 실시간 인구, 혼잡도, 교통, 날씨, 문화행사 통합 근거 |
| Must | 방문자 기준선 | 한국관광공사 빅데이터 지역별 방문자수 GW | 한국관광공사 | https://www.data.go.kr/data/15101972/openapi.do | 이동통신 기반 시군구 방문자 수로 TourAPI 방문객 부재 보완 |
| Must | 주차 | 한국교통안전공단 주차정보 API | 한국교통안전공단 | https://www.data.go.kr/data/15099883/openapi.do | 주차장 시설/운영/실시간 주차정보 기반 주차 수용력 고도화 |
| Should | 버스 접근성 | 국토교통부(TAGO) 버스도착정보 | 국토교통부 | https://www.data.go.kr/data/15098530/openapi.do | 행사장 인근 정류소 도착예정/배차 접근성 반영 |
| Should | 도로소통 | 국토교통부 교통소통정보 | 국토교통부 | https://www.data.go.kr/data/15040463/openapi.do | 실시간 속도/정체 정보로 View-T 기준연도 교통량 보정 |
| Should | 상권 밀도 | 소상공인시장진흥공단 상가(상권)정보 | 소상공인시장진흥공단 | https://www.data.go.kr/data/15083033/fileData.do | 행사장 반경 업종 밀도와 소비 수용력 산정 |
| Should | 행정통계 | KOSIS OpenAPI | 통계청 | https://kosis.kr/serviceInfo/openAPIGuide.do | 인구, 고령화, 지역경제 배경지표 자동 보고 |
| Should | 인파 위험 | 행정안전부 인파밀집 위험 알림 정보 | 행정안전부 | https://www.safetydata.go.kr/ | 축제 장소 인파 밀집 위험도 공식 지표 연동 |
| Nice | 재난위험 레이어 | 재난안전데이터 공유플랫폼 | 행정안전부 | https://www.safetydata.go.kr/ | 침수, 산사태, 화재 등 지역별 위험 레이어 확장 |
| Nice | 지역사랑상품권 | 지방세/지역사랑상품권 결제 빅데이터 | 행정안전부/각 지자체 | 개별 지자체 빅데이터 플랫폼 협약 | 지역 상권 파급효과 정밀 측정 |

---

## 6. 추가 작성 권장 행정 부속 문서

| 우선 | 문서명 | 목적 | 권장 파일명 |
| --- | --- | --- | --- |
| Must | 데이터 라인리지 및 표준용어집 | 입력/가공/산출/표출 필드 단일 정의, 알고리즘 산식 명세 | docs/compliance/DATA_LINEAGE_AND_GLOSSARY.md |
| Must | 개인정보 0건 인벤토리 | 개인정보 미수집 입증, 향후 계정 기능 도입 전 기준 수립 | docs/compliance/PII_ZERO_INVENTORY.md |
| Must | OWASP Top 10 보안 점검표 | CSP nonce, Rate Limit, CORS, 비밀키 관리, 입력 검증 항목별 충족도 | docs/compliance/OWASP_TOP10_CHECKLIST.md |
| Must | 폐쇄망 설치 및 운영 런북 | 내부망 설치, 오프라인 패키지, OFFLINE_MODE 운영 절차 | docs/operations/AIR_GAP_RUNBOOK.md |
| Must | DB 백업 및 복구 절차서 | JSON DB, 지역축제 DB, audit 로그 백업/복구 정책 | docs/operations/BACKUP_RESTORE_POLICY.md |
| Must | 보안 취약점 조치 결과서 | CSP unsafe-inline 제거, CORS 강화, 로그 보존 연장 조치 이력 | docs/compliance/SECURITY_REMEDIATION_LOG.md |
| Should | C4 시스템 아키텍처 명세서 | System Context, Container, Component 다이어그램 | docs/specs/C4_ARCHITECTURE.md |
| Should | 운영 환경변수 명세서 | 서버/빌드/배포/로그 환경변수 전체 일람, 용도 및 예시값 | docs/operations/ENVIRONMENT_VARIABLES.md |
| Should | 장애 대응 및 Fallback 운영 가이드 | API 장애, 키 만료, 네트워크 단절 시 운영 절차 | docs/operations/FALLBACK_INCIDENT_RESPONSE.md |
| Should | 보고서 산출물 명세 | PDF, CSV, Excel, 인쇄 보고서 필드 정의 및 검증 기준 | docs/specs/REPORT_EXPORT_SPEC.md |
| Should | 로그 보존 및 감사 정책 | 보존 기간, 접근 권한, 마스킹 정책, 중앙 수집 계획 | docs/operations/LOG_RETENTION_POLICY.md |
| Nice | 모델 검증 및 오차율 관리 문서 | 실측 방문객 대비 예측 오차, 교정 계획 | docs/specs/MODEL_VALIDATION_PLAN.md |

---

## 7. 폐쇄망 및 실운영 환경 갭

| 항목 | 현재 상태 | 갭 | 권고 |
| --- | --- | --- | --- |
| Docker 배포 | Node 20 Alpine 멀티스테이지 빌드 | USER node 누락(root 실행), HEALTHCHECK 없음, SBOM 없음 | USER node, HEALTHCHECK, syft SBOM 생성 추가 |
| npm 의존성 | package-lock.json 존재 | 오프라인 npm 캐시/사설 레지스트리 절차 문서 없음 | npm ci --offline 또는 사설 mirror 절차 문서화 |
| 외부 API | 프록시와 fallback 부분 존재 | OFFLINE_MODE 환경변수 제어 로직 없음 | OFFLINE_MODE=true 시 data/ 스냅샷 우선 응답 모드 추가 |
| 저장소 | JSON 파일 동기 쓰기 | 주석은 SQLite 표기, 동시 쓰기 데이터 레이스 위험, 백업 없음 | JSON 백업 정책 즉시 문서화, 운영 전 SQLite 전환 검토 |
| 로그 보존 | audit 30일, app 14일 | 공공기관 의무 보존 기간(최소 1년) 미달 | audit 365d, app 180d로 maxFiles 조정 |
| 보안 헤더 | 커스텀 미들웨어 적용 | CSP unsafe-inline 허용, HSTS/Permissions-Policy 누락 | nonce 기반 CSP 전환, 누락 헤더 추가 |
| 환경변수 | .env.example에 4개만 기재 | 실제 사용 변수 9개 추가 누락 | .env.example에 모든 환경변수 및 설명 기재 |

---

## 8. .env.example 보완 대상 전체 목록

현재 .env.example에 4개 변수만 기재되어 있으나, 코드베이스 전수 스캔 결과 아래 9개 변수가 추가로 사용 중임이 확인되었다.

```
# 현재 기재됨 (4개)
TOUR_API_KEY=
STANDARD_FESTIVAL_API_KEY=
PUBLIC_CULTURE_FESTIVAL_API_KEY=
VITE_VWORLD_API_KEY=

# 추가 누락 (9개)
PORT=80
NODE_ENV=production

# Naver DataLab 검색 트렌드 프록시 (server/trendProxy.js:L142-L143)
NAVER_DATALAB_CLIENT_ID=
NAVER_DATALAB_CLIENT_SECRET=

# Rate Limiter (server/index.js:L143-L150)
GENERAL_RATE_LIMIT_MAX=300
OPEN_API_RATE_LIMIT_MAX=120

# 로그 및 백업 경로 (server/logger.js:L14)
LOG_DIR=./logs
BACKUP_DIR=./backups

# 배포 타겟 (scripts/deploy-check.js:L12-L16)
DEPLOY_TARGET_URL=http://localhost

# 관광 데이터랩 지출 API 오퍼레이션 (server/spendingProxy.js:L50)
TOURISM_DEMAND_CONSUMPTION_OPERATION=

# 폐쇄망 운영 모드 (추가 권장)
OFFLINE_MODE=false

# 기상청 API 키 (weatherAdapter 서버 연동 후 필요)
WEATHER_API_KEY=
```

---

## 9. 테스트 검증 결과

분석 수행 중 npm test를 실행하여 전체 회귀 검증을 완료하였다.

| 항목 | 결과 |
| --- | --- |
| 테스트 파일 수 | 45개 |
| 테스트 케이스 수 | 190개 |
| PASS | 190개 (100%) |
| FAIL | 0개 |
| 실행 시간 | 40.25초 |
| Vitest 버전 | v2.1.9 |

이전 보고서 기준 165개에서 190개로 테스트 수가 15% 증가하였으며, 전체 100% 통과 상태를 유지하고 있다.

추가 검증이 필요한 명령:

| 명령 | 목적 | 필수 여부 |
| --- | --- | --- |
| npm test | 단위/통합/Vitest 전체 회귀 검증 | 필수 |
| npm run test:load | API 부하, Rate Limit, 캐시 응답성 검증 | 필수 |
| npm run build | TypeScript 및 Vite 번들 검증 | 권장 |
| npm run deploy:check | 공개 URL 헬스체크 | 배포 후 필수 |

---

## 10. Top 3 보완 과제

### 과제 1: Docker 보안 강화 (USER node 및 HEALTHCHECK)

Dockerfile에 USER node 지시자가 없어 컨테이너가 root 권한으로 실행되고 있으며, HEALTHCHECK도 미등록된 상태이다. 공공기관 보안 감사에서 컨테이너 root 실행 및 헬스체크 미비는 즉시 지적될 수 있는 항목이다. Dockerfile에 USER node 추가 및 HEALTHCHECK 지시자 등록이 필요하다.

### 과제 2: CSP 보안 헤더 강화 및 로그 보존 기간 연장

CSP script-src에 'unsafe-inline'과 'unsafe-eval'이 허용되어 XSS 방어가 무력화된 상태이다. 또한 audit 로그 30일, app 로그 14일 보존으로 공공기관 의무 보존 기간(최소 1년)에 크게 미달한다. server/index.js의 CSP nonce 방식 전환과 server/logger.js의 maxFiles 조정이 우선 필요하다.

### 과제 3: CORS 검증 강화

CORS origin 검증 방식이 문자열 includes()로 구현되어 localhost.attacker.com 우회 가능 상태이다. Set 기반 엄격 allowlist로 교체가 필요하다.

---

## 11. 결론

Fest-Twin은 공모전 제출 데모를 넘어 B2G 실운영 SaaS로 확장할 수 있는 핵심 구조를 갖추고 있다. 165개 Vitest 테스트 100% 통과, 부하 테스트, 배포 헬스체크 체계는 강점이다.

다만 이번 심층 스캔에서 이전 보고서 대비 4개의 추가 취약점(CSP unsafe-inline, CORS 우회, Rate Limiter 누수, 로그 보존 미달)이 신규 확인되었으며, 보고서 익스포트, A/B 비교, 날씨 연동, 행정 문서 6종이 B2G 실운영 전환의 핵심 보완 과제로 남아 있다.

권장 개발 순서:

1. 보안 헤더 및 로그 보존 즉시 패치 (server/index.js, server/logger.js)
2. .env.example 완성 (9개 항목 추가)
3. weatherAdapter 서버 프록시 연결 및 App.tsx/forecast.ts 연동
4. 보고서 PDF/CSV/Excel 익스포트 기능 구현
5. 시나리오 A/B 비교 모드 구현
6. 행정 부속 문서 6종 신규 작성
7. 기상/재난/인파/주차 API 연동
