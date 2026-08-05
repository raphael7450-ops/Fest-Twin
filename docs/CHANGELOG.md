# Fest-Twin 변경 내역 (CHANGELOG)

최종 갱신: 2026-08-05
기준 커밋 범위: a9a1de8 ~ 353c877 (2026-08-05 이후 커밋 기준)

---

## v2.1.0 (2026-08-05) - UI/UX 고도화 및 공개 API 확장 통합

### 신규 기능

#### 1. 선택 축제 기본 정보 카드 (SelectedFestivalCard)

- 관련 파일: src/components/SelectedFestivalCard.tsx
- TourAPI 4.0 기반 선택 축제의 대표 이미지, 주최/주관 기관, 운영시간, 개최 기간, 주소를 대시보드 상단에 카드 형태로 표출
- 이미지 미제공 시 "이미지 준비중" 플레이스홀더 자동 표시
- contentId, GPS 좌표 등 내부 기술 필드 제거 완료 - 행정 제출용 정보만 표시

#### 2. 시나리오 A/B 병렬 비교 모드 (ScenarioLibrary 확장)

- 관련 파일: src/components/ScenarioLibrary.tsx
- 기존 단일 시나리오 조회에서 2개 시나리오 동시 체크박스 선택 후 Side-by-Side 비교 테이블 팝업 제공
- 비교 항목: 지역, 수용 인원, 총 예산, 시설 수, 각 항목별 수치 차이(Diff)
- 비교 후 선택 시나리오를 즉시 대시보드에 A안 또는 B안으로 적용 가능
- PROJECT_COMPREHENSIVE_AUDIT.md "Gap 2: 시나리오 A안 vs B안 비교 모드 미구현" 해결 완료

#### 3. LRU 캐시 용량 제한 및 Eviction 알고리즘 구현

- 관련 파일: server/cache.js
- 인메모리 캐시 최대 1,000개 슬롯 제한 (DEFAULT_MAX_CAPACITY = 1000)
- Map 삽입 순서를 이용한 O(1) LRU 순서 갱신 (조회 시 delete/set 재삽입으로 MRU 이동)
- setCacheCapacity() API를 통한 동적 용량 조정 지원 (테스트 및 운영 튜닝)
- getCacheStats() API로 현재 캐시 크기 및 최대 용량 실시간 조회 가능
- PROJECT_GAP_ANALYSIS_REPORT.md "Gap 1: 캐시 메모리 보호 미비" 해결 완료

#### 4. B2G 감사 로그 비동기 영구 저장 모듈 (auditLogger)

- 관련 파일: server/auditLogger.js
- setImmediate + fs.createWriteStream Append-Only 스트림 방식으로 메인 API 응답 지연 제로화
- 저장 필드: timestamp, action_type, scenario_id, client_ip, payload_summary
- LOG_DIR 환경변수 지원 (기본값: ./logs/audit-events.log)
- 파일 스트림 생성 실패 시 콘솔 출력 Graceful Fallback 적용
- B2G 행정 감사 규정 준수 영구 Audit Log 기반 마련

#### 5. 기상청(KMA) 단기예보 프록시 및 수요 예측 연동

- 관련 파일: server/index.js (/api/weather 라우터 등록)
- 기상청 단기예보 API 실시간 조회 및 강수확률, 기온, 풍속 기반 방문객 수요 보정계수 산출
- API 장애 시 동계/하계 평년 기후 샘플로 자동 Fallback
- PROJECT_GAP_ANALYSIS_REPORT.md "기상청 API 실서버 연동 Dead Code" 문제 해결 완료

#### 6. TAGO 대중교통 프록시 (/api/transit/nearby-stops)

- 관련 파일: server/transitProxy.js
- 국토교통부 버스정류소 및 노선 정보 조회
- DataBasisPanel에 "TAGO 대중교통" 상태 행 추가
- MetricEvidenceDrawer에 대중교통 출처 증빙 첨부

#### 7. 소상공인 상가정보 프록시 (/api/commercial/nearby-stores)

- 관련 파일: server/commercialProxy.js
- 소상공인시장진흥공단 행사장 반경 상권 밀도 조회
- DataBasisPanel에 "소상공인 상가정보" 상태 행 추가

#### 8. 응급의료기관/119 안전센터 프록시 (/api/emergency/nearby-facilities)

- 관련 파일: server/emergencyProxy.js
- 보건복지부/소방청 응급의료기관 및 119 안전센터 위치 정보 조회
- DataBasisPanel에 "응급의료/119 안전센터" 상태 행 추가

#### 9. 네이버 데이터랩 이중 엔드포인트 지원

- 관련 파일: server/trendProxy.js
- Naver Cloud Platform API HUB 및 Naver Developers DataLab 두 엔드포인트 자동 전환 지원
- 하나의 엔드포인트 실패 시 다른 엔드포인트로 자동 재시도

#### 10. 일별 유형(평일/주말/요약) 프로필 탭 분리

- 관련 파일: src/components/SafetyGuardAllocationPanel.tsx, src/components/InfrastructureCapacityPanel.tsx
- 전체 요약, 평일 평균, 주말 피크 3종 탭 UI 제공
- 탭 전환 시 해당 일별 유형의 안전요원 배치 및 인프라 용량 수치 재계산

#### 11. MetricEvidenceDrawer OpenAPI 4종 출처 상세 첨부

- 관련 파일: src/services/metricEvidence.ts
- 기상청, 대중교통(TAGO), 소상공인 상가, 응급의료/119 4종 OpenAPI 수집 시각, 출처, 신청 URL 자동 첨부
- 근거 보기 Drawer에서 각 지표의 공공데이터 수집 원본 확인 가능

#### 12. 모바일 반응형 CSS (768px, 480px 브레이크포인트)

- 관련 파일: src/styles.css
- 768px 이하: 3단 그리드를 단일 열 레이아웃으로 전환
- 480px 이하: 폰트 크기 축소, 패딩 최소화, 터치 타깃 44px 이상 확보

---

### 개선 사항

#### UI/UX 3대 개선 (CSS 토큰 적용)

- 관련 파일: src/styles.css
- Tabular Numbers 적용: .metric-card strong 등 대시보드 숫자 셀렉터에 font-variant-numeric: tabular-nums 전역 적용 (레이아웃 흔들림 방지)
- KWCAG 2.2 보조 텍스트 명암비 개선: #94a3b8 서브라벨을 #475569 (명암비 4.6:1)로 상향 조정
- 카드 패딩 16px 표준 통일: .panel, .metric-card, .selected-festival-card 패딩 16px 단일 디자인 토큰 적용

#### contentId 및 GPS 좌표 노출 제거

- 관련 파일: src/components/DataBasisPanel.tsx, src/components/ReportView.tsx
- DataBasisPanel 선택 축제 기준 섹션에서 contentId, mapx, mapy 등 내부 기술 식별자 숨김
- ReportView 보고서 출력 영역에서 동일 필드 완전 제거
- 행정 제출용 보고서에 주최/주관, 운영시간, 주소, 개최 기간만 표시

#### 축제 후보 목록 시작일 오름차순 정렬

- 관련 파일: src/services/festivalSelection.ts, server/tourProxy.js
- TourAPI 축제 후보 목록을 startDate 기준 오름차순(ASC)으로 정렬
- 기획 담당자가 가장 가까운 일정부터 확인 가능

#### 기상청 운영시간 파싱 및 주간 피크 시간 보정

- 관련 파일: src/services/tourApiAdapter.ts
- 기본 낮 행사 운영시간을 09:00 AM 표준으로 설정
- TourAPI playtime 필드 기반 운영시간 파싱 및 피크 방문객 수요 곡선 정합성 개선

#### API 신뢰도 진단 스크립트 추가

- 관련 파일: scripts/api-reliability-check.js
- 백엔드 OpenAPI 엔드포인트 8종을 일괄 실호출하여 응답 상태, 출처 구분, 데이터 요약을 콘솔 출력
- 실행 명령: node --experimental-vm-modules scripts/api-reliability-check.js

---

### 해결된 갭 (Gap Resolution)

| 이전 진단 갭 | 해결 여부 | 해결 내용 |
| --- | --- | --- |
| 캐시 LRU 용량 제한 미구현 | 해결 완료 | server/cache.js LRU 1,000개 용량 제한 및 O(1) Eviction 구현 |
| 시나리오 A/B 비교 모드 미구현 | 해결 완료 | ScenarioLibrary.tsx Side-by-Side 비교 팝업 구현 |
| 기상청 API Dead Code 상태 | 해결 완료 | /api/weather 프록시 라우터 등록 및 수요 예측 연동 완료 |
| B2G Audit Log 영구 저장 미비 | 해결 완료 | server/auditLogger.js 비동기 파일 저장 모듈 신규 구축 |
| 대중교통/상가/응급기관 API 미연동 | 해결 완료 | TAGO, 소상공인, 응급의료 3종 프록시 및 DataBasisPanel 연동 |
| 수치 Tabular Numbers 미적용 | 해결 완료 | CSS font-variant-numeric: tabular-nums 전역 적용 |
| KWCAG 서브라벨 명암비 미달 | 해결 완료 | #94a3b8 -> #475569 조정 (명암비 2.8 -> 4.6:1) |
| 카드 패딩 통일성 미흡 | 해결 완료 | 16px 표준 패딩 디자인 토큰 통일 |
| contentId/GPS 좌표 노출 | 해결 완료 | DataBasisPanel, ReportView 전역 제거 |

---

### 테스트 상태

- 테스트 파일: 43개
- 테스트 케이스: 184개
- PASS: 184개 (100%)
- FAIL: 0개
- 신규 테스트 추가 내역:
  - server/auditLogger.test.ts: 비동기 감사 로그 저장 및 스트림 안전 종료 테스트
  - server/cache.test.ts: LRU Eviction, 용량 제한, getCacheStats 테스트
  - server/commercialProxy.test.ts: 소상공인 상가정보 프록시 단위 테스트
  - server/emergencyProxy.test.ts: 응급의료기관 프록시 단위 테스트
  - server/transitProxy.test.ts: TAGO 대중교통 프록시 단위 테스트
  - src/components/ScenarioLibrary.test.tsx: A/B 비교 체크박스, 비교 모달 렌더링 테스트
  - src/components/SelectedFestivalCard.test.tsx: 이미지 카드 및 플레이스홀더 렌더링 테스트

---

### 남은 과제

- Docker 보안: USER node 지시자 추가 및 HEALTHCHECK 등록 (Dockerfile)
- 로그 보존: audit 30일을 365일 이상으로 연장 (server/logger.js)
- CSP: unsafe-inline 제거, nonce 방식 전환 (server/index.js)
- CORS: includes() 검증을 Set 기반 allowlist로 교체 (server/index.js)
- 오프라인 지도: VWorld CDN 의존 제거, 로컬 타일 서버 대안 검토
