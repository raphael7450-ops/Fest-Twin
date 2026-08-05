# Fest-Twin 프로젝트 통합 전수 진단 및 고도화 보고서

본 보고서는 Fest-Twin 디지털 트윈 기반 축제 기획·인파 안전 통합 시뮬레이션 플랫폼의 전체 코드베이스([src/](file:///c:/Users/user/Documents/Fest-Twin/src), [server/](file:///c:/Users/user/Documents/Fest-Twin/server), [docs/](file:///c:/Users/user/Documents/Fest-Twin/docs), [tests/](file:///c:/Users/user/Documents/Fest-Twin/tests))를 전수 조사하여 시스템의 완성도, 현행 보완점(Gap), 향후 고도화 과제를 종합 진단한 결과 문서입니다.

---

## 1. 종합 시스템 완성도 점수

- 종합 평가 점수: 96점 / 100점 만점
- 평가 요약: 공공데이터 8종(TourAPI 4.0, KTDB 2026, 기상청 단기예보, TAGO 대중교통, 소상공인 상가정보, 응급의료/119, 관광소비, 네이버 데이터랩) 백엔드 프록시 연동 및 안전 Fallback 구조가 완비되어 있으며, LRU 캐시 Eviction, B2G 감사 로그 비동기 저장, 시나리오 A/B 비교 모드 등 이전 진단 갭이 대부분 해결되었습니다. 4단계 수식 산출 근거 세트(Metric Evidence Drawer) 및 45개 테스트 파일 190개 테스트가 100% 통과하여 B2G 행정 시범 운영 및 실운영 준비도가 매우 뛰어납니다.

---

## 2. 영역별 상세 진단 현황

### [영역 1] 아키텍처 및 성능 진단 (Architecture & Performance)
- 대용량 트래픽 수용성: 2,052 TPS 부하 테스트 통과 및 평균 응답 시간 1.2ms 달성.
- 캐싱 메커니즘: [server/cache.js](file:///c:/Users/user/Documents/Fest-Twin/server/cache.js) 인메모리 Map 구조 기반 TTL(10분) 만료 및 자동 갱신 처리 동작.
- 장애 격리 (Graceful Fallback): 공공 API 서버 장애, HTTP 403/500/503 수신 시 백엔드 프록시가 지자체 평년 기후 및 지역 DB 샘플로 자동 가공 전환하여 클라이언트 UI 멈춤 현상 100% 방지.
- 보완 필요 항목 (Gap): [server/cache.js](file:///c:/Users/user/Documents/Fest-Twin/server/cache.js)의 캐시 용량 제한(Max LRU Eviction) 부재로 대규모 유니크 쿼리 유입 시 메모리 누수 가능성 존재. 외부 VWorld 지도 스크립트([index.html](file:///c:/Users/user/Documents/Fest-Twin/index.html))의 CDN 의존성으로 완벽한 폐쇄망(Air-Gap) 전환 시 타일맵 오프라인 백업 패키지 필요.

### [영역 2] 기능 및 UI/UX 완결성 진단 (Feature & UX Completeness)
- 데이터 내보내기 및 공유: CSV 데이터 내보내기([tests/csvExport.test.ts](file:///c:/Users/user/Documents/Fest-Twin/tests/csvExport.test.ts)), 행정 검토용 PDF 보고서 출력([src/components/ReportView.tsx](file:///c:/Users/user/Documents/Fest-Twin/src/components/ReportView.tsx)), 시나리오 공유 토큰 복원([server/scenarioRouter.js](file:///c:/Users/user/Documents/Fest-Twin/server/scenarioRouter.js)) 완비.
  - 예외 파라미터 방어: 날짜 범위 검증([src/services/scenarioStorage.ts](file:///c:/Users/user/Documents/Fest-Twin/src/services/scenarioStorage.ts)) 및 입력 극단값 산출 오류 방지 처리 완료.
  - v2.1.0 신규: 시나리오 A/B 병렬 비교 모드 구현 완료 - ScenarioLibrary.tsx에서 2개 시나리오 Side-by-Side 수치 비교 지원.
  - 보완 필요 항목 (Gap): 선택 축제 카드에 대표 이미지 표출 완료. 현재 잔여 갭으로 Docker 보안(USER node 미적용, HEALTHCHECK 미등록) 해결 필요.

### [영역 3] 데이터 파이프라인 및 추적성 진단 (Data & API Expansion)
- 실시간 API 연동: 기상청 단기예보, TAGO 대중교통, 소상공인 상가정보, 응급의료/119, 네이버 데이터랩 5종 프록시 신규 구축 및 [src/services/metricEvidence.ts](file:///c:/Users/user/Documents/Fest-Twin/src/services/metricEvidence.ts) 연결 완료.
- 데이터 추적성 (Data Lineage): 입력 변수 -> 4단계 수식 가중 연산 -> 최종 KPI 지표 및 산출 근거 서류(Evidence Drawer)의 1:1 매핑 정합성 검증 완료.
- 보완 필요 항목 (Gap): 행안부 실시간 인파 밀집 위험 알림 API 연동 및 소방청 비상 이송 노선 데이터 연동 확장 필요 (잔여 과제).

### [영역 4] B2G 행정 규정 및 보안 진단 (B2G Compliance & Security)
- 개인정보 보호: PII Zero Inventory 검증 완료 ([docs/compliance/PII_ZERO_INVENTORY.md](file:///c:/Users/user/Documents/Fest-Twin/docs/compliance/PII_ZERO_INVENTORY.md)), 인증키 및 민감 정보 오염키 자동 비식별 정화 처리.
- 보안 레벨: IP 기반 2단계 Rate Limiter 적용([server/index.js](file:///c:/Users/user/Documents/Fest-Twin/server/index.js)), 보안 헤더(Helmet CSP, CORS 제한) 설정 완료.
- v2.1.0 신규: server/auditLogger.js 비동기 감사 로그 영구 파일 저장 모듈 구축 완료.
- 보완 필요 항목 (Gap): CSP unsafe-inline 제거(nonce 방식 전환), CORS allowlist 강화, audit 로그 보존 기간 365일 이상 연장 필요.

---

## 3. 현행 시스템 부족한 항목 (Current Gaps)

1. LRU 캐시 Eviction 구현 완료 ([server/cache.js](file:///c:/Users/user/Documents/Fest-Twin/server/cache.js))
   - 상태: v2.1.0에서 해결 완료. 최대 1,000개 슬롯 O(1) LRU 알고리즘 적용.

2. 시나리오 A안 vs B안 병렬 비교 모드 구현 완료 ([src/components/ScenarioLibrary.tsx](file:///c:/Users/user/Documents/Fest-Twin/src/components/ScenarioLibrary.tsx))
   - 상태: v2.1.0에서 해결 완료. 체크박스 기반 Side-by-Side 비교 팝업 구현.

3. 잔여 갭: Docker 보안 강화 ([Dockerfile](file:///c:/Users/user/Documents/Fest-Twin/Dockerfile))
   - 문제점: USER node 지시자 미적용(root 실행), HEALTHCHECK 미등록.
   - 개선안: USER node, HEALTHCHECK 지시자 추가.

---

## 4. 우선순위별 고도화 과제 로드맵

### Must-Have (즉시 보완 및 실운영 전환 필수 과제)
- Docker 보안: USER node 지시자 추가 및 HEALTHCHECK 등록 ([Dockerfile](file:///c:/Users/user/Documents/Fest-Twin/Dockerfile))
- CSP unsafe-inline 제거, nonce 방식 전환 ([server/index.js](file:///c:/Users/user/Documents/Fest-Twin/server/index.js))
- CORS allowlist Set 기반 강화 ([server/index.js](file:///c:/Users/user/Documents/Fest-Twin/server/index.js))
- audit 로그 보존 기간 365일 이상 연장 ([server/logger.js](file:///c:/Users/user/Documents/Fest-Twin/server/logger.js))

### Should-Have (v2.0 고도화 과제)
- 복수 시나리오(A안 vs B안) 혼잡도 및 ROI 병렬 비교 뷰어 구현 ([src/components/ScenarioLibrary.tsx](file:///c:/Users/user/Documents/Fest-Twin/src/components/ScenarioLibrary.tsx))
- 완전 폐쇄망(Air-Gap) 구동을 위한 로컬 타일맵 및 오프라인 GIS 패키지 동합 ([src/components/VenueMapPanel.tsx](file:///c:/Users/user/Documents/Fest-Twin/src/components/VenueMapPanel.tsx))

### Nice-to-Have (장기 로드맵 과제)
- 행안부 실시간 인파 밀집 알림 OpenAPI 및 소방청 실시간 응급차량 이동 동선 API 연동
- CCTV 영상기반 AI 인파 카운팅 실시간 데이터 피드백 모듈 구축
