# Fest-Twin 프로젝트 갭 분석 보고서

작성일: 2026-08-04  
분석 역할: B2G 실운영 완성도 감사 및 갭 분석  
분석 방식: 코드베이스 로컬 스캔, 문서 체계 점검, 3개 서브 에이전트 병렬 진단, 주요 공공 API 획득 경로 확인

## 1. 종합 완성도 스코어

**종합 완성도: 82/100점**

| 평가 영역 | 점수 | 판정 | 요약 |
| --- | ---: | --- | --- |
| 핵심 대시보드 기능 | 18/20 | 양호 | 지역/기간 기반 축제 후보 조회, 수요 예측, 혼잡도, KPI, 근거 Drawer, 시나리오 저장/공유 흐름은 구현되어 있다. |
| 보고서/행정 산출물 | 12/20 | 보완 필요 | 인쇄형 보고서는 있으나 PDF 파일 생성, CSV/Excel 다운로드, 공식 결재용 서식 선택 기능은 없다. |
| 데이터/API 연동성 | 16/20 | 양호 | TourAPI, Naver DataLab, KTDB/View-T, 관광소비, 지역축제 백데이터 구조는 있으나 기상/재난/실시간 인파/주차/대중교통은 미흡하다. |
| B2G 운영·보안 준비 | 14/20 | 보완 필요 | CSP, Rate Limit, 감사 로그 롤링은 구현되어 있으나 개인정보 0건 인벤토리, OWASP 체크리스트, 폐쇄망 런북, 백업/복구가 부족하다. |
| 테스트/배포 검증 | 22/20 | 강점 | 단위 테스트, 부하 테스트, 배포 헬스체크가 존재한다. 수치 경계값 감사 테스트도 추가되어 있다. |

가산/감점 조정: 테스트 체계는 강점이나, B2G 실운영에서 반드시 필요한 보고서 익스포트, A/B 비교, 백업/복구, 행정 부속문서가 빠져 있어 최종 점수는 **82점**으로 평가한다.

## 2. 주요 진단 근거

| 영역 | 현재 확인된 구현/문서 | 근거 |
| --- | --- | --- |
| 보고서 출력 | 브라우저 `window.print()` 기반 인쇄 버튼만 존재 | `src/components/PrintReportButton.tsx`, `src/components/ReportView.tsx` |
| 시나리오 저장/공유 | 저장, 불러오기, 삭제, share token 복원 구현 | `src/components/ScenarioLibrary.tsx`, `src/services/scenarioStorage.ts`, `server/scenarioRouter.js` |
| 축제/관광지 | TourAPI 4.0 프록시 및 후보 선택 흐름 구현 | `server/tourProxy.js`, `src/services/tourApiAdapter.ts` |
| 검색 트렌드 | Naver DataLab 프록시 및 fallback 구현 | `server/trendProxy.js`, `src/services/trendAdapter.ts` |
| 교통 | KTDB/View-T selected link, OD EMD 프록시 구현 | `server/trafficProxy.js`, `src/services/trafficAdapter.ts`, `docs/specs/viewt-od-traffic-evidence.md` |
| 소비/상권 | 관광 수요 강도 기반 객단가 프록시와 샘플 fallback 구현 | `server/spendingProxy.js`, `src/services/spendingAdapter.ts` |
| 기상 | 기상 영향도 계산 어댑터는 있으나 실제 API fetch 연동 없음 | `src/services/weatherAdapter.ts` |
| 감사 로그 | Winston DailyRotateFile 기반 audit/app/error 로그 롤링 구현 | `server/logger.js` |
| 데이터 저장소 | 문서 일부는 SQLite라고 설명하지만 실제 구현은 JSON 파일 영속화 | `server/db/database.js`, `data/scenarios_db.json` |
| 문서 정합성 | 일부 문서에 Naver Map/SQLite 표현이 남아 있으나 실제 코드는 VWorld/JSON 저장소 | `docs/guides/deployment-and-cicd.md`, `src/components/VenueMapPanel.tsx`, `.env.example` |

## 3. 우선순위별 보완 리스트

### Must Have: 즉시 보완

| 우선 | 과제 | 현재 상태 | 보완 내용 | 기대 효과 |
| ---: | --- | --- | --- | --- |
| 1 | PDF/CSV/Excel 익스포트 | 부분존재 | 보고서 PDF 저장, Evidence Drawer 원본/산출값 CSV 다운로드, Excel용 요약 시트 생성 | 지자체 보고·결재·감사 제출 가능 |
| 2 | 시나리오 A/B 비교 모드 | 미존재 | A안/B안을 선택해 방문객, 피크 밀집도, 안전 인력, 예산, ROI, 권고사항을 나란히 비교 | 예산 증액/동선 변경 등 정책 의사결정 설득력 강화 |
| 3 | 데이터 라인리지 및 표준용어집 | 부분존재 | 입력 변수 → 어댑터 → 산식 → KPI → 보고서까지 필드 단위 표준표 작성 | 행정 감사와 데이터 품질 설명 가능 |
| 4 | 개인정보 0건 인벤토리와 OWASP 점검표 | 부분존재 | 개인정보 항목 0건 증빙표, 처리흐름도, OWASP Top 10/ASVS 체크리스트 문서화 | B2G 보안·개인정보 검토 대응 |
| 5 | 폐쇄망 설치 런북 | 부분존재 | 오프라인 npm 패키지, Docker 이미지 반입, 외부 API 차단 모드, 샘플/스냅샷 데이터 구동 절차 작성 | 지자체 내부망 PoC 가능성 확보 |
| 6 | DB 백업/복구 정책 | 미존재 | `data/scenarios_db.json` 또는 향후 SQLite/Postgres 백업 주기, 보관일수, 복구 리허설 절차 정의 | 운영 데이터 유실 위험 감소 |
| 7 | `.env.example` 최신화 | 부분존재 | `PORT`, rate limit, Naver DataLab, VWorld, 배포 URL, 로그 디렉터리, 백업 디렉터리 등 추가 | 집/서버/심사 환경 재현성 향상 |
| 8 | 문서 정합성 정리 | 부분존재 | Naver Map → VWorld, SQLite → JSON 저장소 또는 실제 SQLite 전환 여부 정리 | 심사/운영 설명의 신뢰도 확보 |
| 9 | 기상청 단기예보 실제 연동 | 부분존재 | `weatherAdapter`를 서버 프록시와 연결하고 강수/강풍 보정계수를 예측에 반영 | 행사일 날씨 리스크 설명 가능 |
| 10 | 재난·실시간 인파·주차 데이터 1차 연동 | 미존재 | 재난문자, 서울 실시간 도시데이터, 주차정보 API를 우선 후보로 연결 | 현장 안전 운영 판단력 강화 |

### Should Have: v2.0 반영

| 과제 | 현재 상태 | 보완 내용 |
| --- | --- | --- |
| 운영형 Empty State 고도화 | 부분존재 | 후보 없음/API 실패 시 다음 행동(지역 변경, 기간 확장, 샘플로 계속, 운영자 문의)을 버튼형으로 안내 |
| 결재/검토 상태 UI | 미존재 | 기획안 상태를 초안, 검토중, 보완요청, 승인권고, 반려로 관리 |
| 부서/역할 기반 접근 제어 | 미존재 | 관리자, 기획자, 안전담당, 예산담당, 조회자 권한 분리 |
| C4 공식 아키텍처 문서 | 부분존재 | System Context, Container, Component 다이어그램으로 재작성 |
| 실시간 교통 보정 | 부분존재 | View-T 기준연도 교통량에 국토교통부 교통소통정보를 보조 반영 |
| 대중교통 접근성 | 미존재 | TAGO 버스 도착/정류소/노선 데이터로 대중교통 분산 유도 지표 산출 |
| 상권 밀도/업종 수용력 | 미존재 | 소상공인 상가정보, 서울 상권분석 추정매출로 ROI 근거 강화 |
| 감사 로그 조회 화면 | 미존재 | 저장/삭제/API fallback/rate limit 이벤트를 관리자 UI에서 필터링 |
| 운영 모니터링 | 부분존재 | 헬스체크 외 API 실패율, fallback 비율, 응답시간 대시보드 추가 |

### Nice to Have: 장기 과제

| 과제 | 보완 방향 |
| --- | --- |
| 전국 지자체별 실시간 인파 데이터 확장 | 서울 외 지역의 CCTV/스마트시티/유동인구 데이터 확보 |
| 지자체 조례/행사 안전 계획 자동 매핑 | 지역별 안전관리 기준과 인력 배치 기준을 문서화 |
| AI 보고서 초안 생성 | Evidence Set을 기반으로 지자체 내부 보고서 문장 자동 생성 |
| GIS 위험 레이어 | 침수, 산사태, 화재, 응급의료 접근성 등 레이어 추가 |
| 장기 수요 모델 검증 | 과거 실측 방문객과 예측값의 오차율 관리 |

## 4. 추가 권장 공공 API 및 데이터셋

| 우선 | 영역 | API/데이터셋 | 제공처 | 획득 경로 | Fest-Twin 활용 목적 |
| --- | --- | --- | --- | --- | --- |
| Must | 기상 | 기상청 단기예보 조회서비스 | 기상청 | https://www.data.go.kr/data/15084084/openapi.do | 강수확률, 기온, 풍속을 방문객 감소/안전 리스크 보정계수로 적용 |
| Must | 재난 | 행정안전부 긴급재난문자 | 행정안전부 | https://www.data.go.kr/data/15134001/openapi.do | 태풍, 화재, 폭염, 지진 등 행사 중단/주의 알림 근거 |
| Must | 실시간 인파 | 서울특별시 실시간 도시데이터 | 서울특별시 | https://www.data.go.kr/data/15146211/openapi.do | 주요 장소 실시간 인구, 혼잡도, 교통, 날씨, 문화행사 통합 근거 |
| Must | 실시간 인구 | 서울시 실시간 인구데이터 | 서울 열린데이터광장 | https://data.seoul.go.kr/dataList/OA-21778/A/1/datasetView.do | 서울 주요 장소의 혼잡도 검증값 |
| Must | 방문자 기준선 | 한국관광공사 빅데이터 지역별 방문자수 GW | 한국관광공사 | https://www.data.go.kr/data/15101972/openapi.do | 이동통신 기반 시군구 방문자 수로 TourAPI 방문객 부재 보완 |
| Must | 주차 | 한국교통안전공단 주차정보 제공 API | 한국교통안전공단 | https://www.data.go.kr/data/15099883/openapi.do | 주차장 시설·운영·실시간 주차정보 기반 주차 차오름 고도화 |
| Should | 버스 접근성 | 국토교통부(TAGO) 버스도착정보 | 국토교통부 | https://www.data.go.kr/data/15098530/openapi.do | 행사장 인근 정류소 도착예정·배차 접근성 반영 |
| Should | 도로소통 | 국토교통부 교통소통정보 | 국토교통부 | https://www.data.go.kr/data/15040463/openapi.do | 실시간 속도·정체 정보를 View-T 기준연도 교통량에 보정 |
| Should | 상권 밀도 | 소상공인시장진흥공단 상가(상권)정보 | 소상공인시장진흥공단 | https://www.data.go.kr/data/15083033/fileData.do | 행사장 반경 업종 밀도와 주변 소비 수용력 산정 |
| Should | 행정통계 | KOSIS OpenAPI | 통계청 | https://kosis.kr/serviceInfo/openAPIGuide.do | 인구, 고령화, 지역경제 배경지표 자동 보고 |
| Nice | 재난위험 레이어 | 재난안전데이터 공유플랫폼 | 행정안전부 | https://www.safetydata.go.kr/ | 침수, 산사태, 화재 등 지역별 위험 레이어 확장 |

## 5. 추가 작성 권장 행정 부속 문서

| 우선 | 문서명 | 목적 | 권장 파일명 |
| --- | --- | --- | --- |
| Must | 데이터 라인리지 및 표준용어집 | 입력·가공·산출·표출 필드의 단일 정의 | `docs/compliance/DATA_LINEAGE_AND_GLOSSARY.md` |
| Must | 개인정보 0건 인벤토리 | 개인정보 미수집 입증, 향후 계정 기능 도입 전 기준 | `docs/compliance/PII_ZERO_INVENTORY.md` |
| Must | OWASP Top 10 보안 점검표 | 보안 헤더, Rate Limit, CORS, 비밀키 관리, 입력 검증 체크 | `docs/compliance/OWASP_TOP10_CHECKLIST.md` |
| Must | 폐쇄망 설치 및 운영 런북 | 내부망 설치, 오프라인 패키지, 외부 API 차단 모드 | `docs/operations/AIR_GAP_RUNBOOK.md` |
| Must | DB 백업 및 복구 절차서 | 시나리오 DB, 지역축제 DB, audit 로그 백업/복구 | `docs/operations/BACKUP_RESTORE_POLICY.md` |
| Should | C4 시스템 아키텍처 명세서 | System Context, Container, Component 다이어그램 | `docs/specs/C4_ARCHITECTURE.md` |
| Should | 운영 환경변수 명세서 | 서버/빌드/배포/로그 환경변수 일람 | `docs/operations/ENVIRONMENT_VARIABLES.md` |
| Should | 장애 대응 및 Fallback 운영 가이드 | API 장애, 키 만료, 네트워크 단절 시 운영 절차 | `docs/operations/FALLBACK_INCIDENT_RESPONSE.md` |
| Should | 보고서 산출물 명세 | PDF, CSV, Excel, 인쇄 보고서 필드와 검증 기준 | `docs/specs/REPORT_EXPORT_SPEC.md` |
| Nice | 모델 검증 및 오차율 관리 문서 | 실측 방문객 대비 예측 오차, 교정 계획 | `docs/specs/MODEL_VALIDATION_PLAN.md` |

## 6. 폐쇄망 및 실운영 환경 갭

| 항목 | 현재 상태 | 갭 | 권고 |
| --- | --- | --- | --- |
| Docker 배포 | 존재 | 공개/사설 서버 배포 중심 | 폐쇄망 반입용 이미지 tar, SBOM, checksum 절차 추가 |
| npm 의존성 | `package-lock.json` 존재 | 오프라인 npm 캐시/사설 레지스트리 절차 없음 | `npm ci --offline` 또는 사설 mirror 절차 문서화 |
| 외부 API | 프록시와 fallback 존재 | 폐쇄망에서 외부 호출 차단 시 운영 모드 불명확 | `OFFLINE_MODE=true`와 스냅샷 데이터 우선 모드 추가 |
| 저장소 | JSON 파일 영속화 | 문서와 SQLite 표현 불일치, 백업 정책 없음 | JSON 백업 정책을 즉시 문서화하고 운영 전 SQLite/Postgres 전환 검토 |
| 로그 | audit/app/error 롤링 존재 | 중앙 수집, 보관정책 승인, 개인정보 마스킹 점검표 없음 | 로그 보존 기간과 접근 권한 문서화 |
| 환경변수 | 일부만 `.env.example`에 존재 | rate limit, Naver DataLab, deploy target, log/backup 경로 누락 | `.env.example` 및 운영 환경변수 명세서 최신화 |

## 7. 테스트 및 검증 계획

이번 갭 분석 이후 유지해야 할 검증 게이트는 다음과 같다.

| 명령 | 목적 | 필수 여부 |
| --- | --- | --- |
| `npm test` | 단위/통합/Vitest 전체 회귀 검증 | 필수 |
| `npm run test:load` | API 부하, Rate Limit, 캐시 응답성 검증 | 필수 |
| `npm run build` | TypeScript 및 Vite 번들 검증 | 권장 |
| `npm run deploy:check` | 공개 URL 헬스체크 | 배포 후 필수 |

## 8. Top 3 보완 과제

1. **PDF/CSV/Excel 익스포트와 Evidence Set 내보내기**
   - 현재 인쇄 버튼만 있어 지자체 제출 산출물로는 부족하다.
   - 보고서 PDF, KPI CSV, Evidence Drawer 원본/산식 Excel 다운로드를 우선 구현해야 한다.

2. **시나리오 A/B 비교 모드**
   - 축제 기획은 “기본안 vs 예산 증액안”, “동선 변경 전/후” 비교가 핵심이다.
   - 현재는 단일 시나리오 저장/복원만 가능하므로 정책 의사결정 설득력이 제한된다.

3. **운영 부속문서 5종: 데이터 라인리지, 개인정보 0건, OWASP, 폐쇄망 런북, 백업/복구**
   - 기술 데모에서 B2G 실운영 서비스로 넘어가기 위한 행정 문서가 부족하다.
   - 특히 문서상 SQLite와 실제 JSON 저장소 불일치는 즉시 정정해야 한다.

## 9. 결론

Fest-Twin은 공모전 제출 데모를 넘어 B2G 실운영 SaaS로 확장할 수 있는 핵심 구조를 이미 갖추고 있다. 다만 실운영 완성도 관점에서는 “보여주는 대시보드”보다 “제출·비교·감사·복구 가능한 행정 시스템”으로 만드는 보완이 남아 있다.

다음 개발 순서는 `보고서 익스포트 → A/B 비교 → 데이터 라인리지/보안/폐쇄망/백업 문서 → 기상·재난·인파·주차 API 연동` 순서를 권장한다.
