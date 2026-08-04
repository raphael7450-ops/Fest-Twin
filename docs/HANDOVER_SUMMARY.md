# Fest-Twin 프로젝트 인수인계 및 작업 내역 정리 문서

작성일시: 2026-08-04
작성목적: 집 또는 외부 환경에서 프로젝트 작업을 원활하게 이어가기 위한 최신 구현 내역, 코드 구조, 배포 환경 및 실행 방법 정리

---

## 1. Git 저장소 및 원격 배포 현황

- 저장소 경로: https://github.com/raphael7450-ops/Fest-Twin.git
- 작업 브랜치: codex/phase2-operational-v1
- 브랜치 상태: 원격 origin 저장소와 100% 동기화 완료 (Working tree clean)
- 원격 서버 배포 대상: Tailscale IP 100.104.94.112:18080 (Docker 컨테이너: fest-twin-demo)
- 공개 데모 URL: https://cwserver.tail97dbc3.ts.net/
- 배포 스크립트: scripts/remote-deploy.js (PuTTY plink/pscp 기반 자동화)
- 헬스체크 검증: 5개 항목 전원 PASSED (deploy-check.js)

---

## 2. 주요 신규 개발 및 개편 내역

### 가. B2G 행정 제출용 고품질 CSV 리포트 유틸리티 개편
- 관련 파일:
  - src/utils/csvExport.ts
  - src/components/CsvExportButton.tsx
  - tests/csvExport.test.ts
- 주요 기능:
  - Windows Excel 한글 깨짐 방지를 위한 UTF-8 BOM (\uFEFF) 헤더 필수 적용
  - 4대 체계적 구획 구조화 (구획 1 행정 메타데이터, 구획 2 핵심 시뮬레이션 요약, 구획 3 4단계 수치 산출 근거 상세, 구획 4 데이터 출처 및 감사 라벨)
  - 감사 무결성 검증 토큰 (AUDIT-HASH-SHA256-...) 및 ISO 서버 수신 시각 자동 바인딩
  - 파일명 표준화 규격 적용 (Fest-Twin_시나리오명_YYYYMMDD_HHmm.csv)

### 나. [모델 1] 인프라 수용성 & 대기시간 예측 모델 구현
- 관련 파일:
  - src/services/capacityAndSafetyForecast.ts
  - src/components/InfrastructureCapacityPanel.tsx
- 주요 산출 지표:
  - 주차 수용 및 만차 예상 시점: 국토교통부 지침 승용차 분담률 18%, 탑승인원 2.5명/대 기반 만차 시각 연산
  - 임시 화장실 수용 한계 및 대기시간: 행안부/문체부 지침 피크 250명당 1칸 기준 부족량 및 회전율 대기 지연 연산
  - 폐기물 배출량 예측: 환경부 1인당 0.4kg 통계 기준 총 배출 톤수 및 일반(60%)/재활용(40%) 분리 연산

### 다. [모델 2] 인파 사고 리스크 & 구역별 필수 안전요원 배치 모델 구현
- 관련 파일:
  - src/services/capacityAndSafetyForecast.ts
  - src/components/SafetyGuardAllocationPanel.tsx
- 주요 산출 지표:
  - 구역별 추천 안전요원 배치 명세: 행안부 인파 지침(무대 2,200명/명, 게이트 4,200명/명) 및 2D 시뮬레이션 고위험 셀 비례 배치
  - 예상 응급환자 발생률 및 의료 지원: 소방청 응급의료 지침 기반 시간당 발생 건수, 필요 의료진(명) 및 구급차(대) 수량 계산
  - 비상 탈출 골든타임 소요시간: 국립재난안전연구원 NDMI 및 SFPE 피난 유동 방정식 기반 100m 비상 탈출 소요시간 및 등급(양호/주의/경고) 진단

### 라. 전용 근거보기(EvidenceButton) 1:1 바인딩 및 슬라이딩 드로어 강화
- 관련 파일:
  - src/components/EvidenceButton.tsx
  - src/components/MetricEvidenceDrawer.tsx
  - src/services/metricEvidence.ts
  - src/styles.css
- 주요 변경 사항:
  - 각 모델 카드 및 패널 헤더 우측 상단에 알약 형태의 근거보기 버튼 적용
  - dedicated evidence ID 추가 (infrastructure-capacity, restroom-capacity, waste-generation, safety-guards-allocation, evacuation-golden-time)
  - 근거 보기 클릭 시 해당 지표의 출처, 법령 기준, 연산 수식, 단계별 연산 흐름도 1:1 맞춤 표시

### 마. B2G 컴플라이언스 및 보안 규정 문서화 완료
- 관련 파일:
  - docs/compliance/DATA_LINEAGE_AND_GLOSSARY.md
  - docs/compliance/PII_ZERO_INVENTORY.md
  - docs/compliance/OWASP_TOP10_CHECKLIST.md
  - docs/compliance/SECURITY_REMEDIATION_LOG.md
  - docs/operations/AIR_GAP_RUNBOOK.md
  - docs/operations/BACKUP_RESTORE_POLICY.md

---

## 3. 집에서 이어서 작업 시 안내 및 실행 가이드

### 가. Git 저장소 동기화
새로운 환경에서 아래 명령어로 최신 변경 사항을 받아옵니다:
git fetch origin
git checkout codex/phase2-operational-v1
git pull origin codex/phase2-operational-v1

### 나. 개발 환경 실행 및 빌드/테스트
1. 패키지 설치: npm ci
2. 테스트 수행: npm test (전체 38개 파일, 172개 테스트 100% PASS 확인)
3. 정적 빌드 검증: npm run build
4. 로컬 개발 서버 실행: npm run dev

### 다. 원격 배포 명령어 (Tailscale 접속 환경)
코드 수정 완료 후 아래 명령어로 원격 서버 Docker 컨테이너 재배포 및 헬스체크를 실행합니다:
npm run deploy:remote

---

## 4. 전체 테스트 슈트 상태
- 실행 명령어: npm test
- 검증 결과: 38개 테스트 파일, 172개 단위 테스트 전원 PASS (0 failures, 0 warnings)
