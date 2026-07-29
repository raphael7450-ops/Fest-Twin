# Fest-Twin 공모전 제출 요약 및 요구사항 대응 명세서

Fest-Twin (지자체 축제 기획 사전 진단 및 디지털 트윈 시뮬레이션 B2G SaaS) 공모전 제출 요구사항 대응 매트릭스, 서비스 소개 카피 및 시스템 검증 증빙 문서입니다.

---

## 1. 공모전 참가 및 제출 요약

- 서비스명: Fest-Twin (페스트트윈)
- 분야: 공공 빅데이터 활용 B2G 축제 기획 사전 진단 및 안전/경제성 시뮬레이션 SaaS
- 주요 대상: 지자체 축제 기획 담당 공무원, 안전관리팀, 지역 경제 진흥 과장
- 현재 작업 기준:
  - 브랜치: `codex/kpi-evidence-matrix`
  - 완료: KPI 근거 매트릭스, 데이터 상태 요약, 선택 TourAPI 후보 기반 보조 데이터 갱신
  - 다음 단계: 공개검토용 보고서 구조 정리 및 출력 품질 보강
- 구동 환경:
  - 공개 데모 URL: `https://cwserver.tail97dbc3.ts.net/`
  - 원격 서버 배포: `http://192.168.55.223:18080/`
  - Docker 이미지: `fest-twin-demo:latest`

---

## 2. 공모전 공고 대응 매트릭스 (Notice Response Matrix)

| 평가 항목 | 공고 요구사항 | Fest-Twin 구체적 대응 구현 내용 | 증빙 및 명세 위치 |
| :--- | :--- | :--- | :--- |
| 공공데이터 연동성 | 공공 빅데이터 활용 및 실시간 OpenAPI 연동 | 한국관광공사 TourAPI 4.0, Naver DataLab 검색량, 관광데이터랩 객단가 지출 데이터, 국가교통DB(KTDB View-T) 보조 데이터 연동 프록시 구현 | [architecture-and-api.md](../specs/architecture-and-api.md), [selected-festival-data-flow.md](../specs/selected-festival-data-flow.md) |
| 선택 축제 기준성 | OpenAPI 조회 결과가 서비스 분석 기준으로 실제 활용되어야 함 | TourAPI 후보 선택 시 축제명, 주소, 기간, 좌표, `contentId`가 기획안, 지도, 트렌드, 교통, 소비, KPI 근거로 함께 갱신 | [selected-festival-data-flow.md](../specs/selected-festival-data-flow.md) |
| 수치 산출 근거 | 예측 수치에 대한 투명한 근거 및 연산 수식 제시 | Metric Evidence Engine 구축. KPI별 원본 데이터, 사용자 입력값, 시뮬레이션 산출값을 분리하고 데이터 상태 요약과 근거 드로어 제공 | [data-and-simulation-methodology.md](../specs/data-and-simulation-methodology.md), [kpi-evidence-matrix.md](../specs/kpi-evidence-matrix.md) |
| 안전사고 예방 | 인파 밀집 및 안전관리 사전 시뮬레이션 | 5ms 이내 그리드 체류 인원 밀도($명/m^2$) 및 위험도 등급(관심/주의/경계/심각) 실시간 시뮬레이션 | [data-and-simulation-methodology.md](../specs/data-and-simulation-methodology.md) |
| 협업 및 영속성 | 부서 간 축제 기획안 공유 및 데이터 영속화 | SQLite REST API 기반 저장소 및 8자리 `share_token` 부서 공유 링크 복원 기능 구현 | [architecture-and-api.md](../specs/architecture-and-api.md) |
| 시스템 안정성 | 보안 및 프록시 쿼터 보호, 무중단 배포 | OWASP CSP 헤더, 2단계 Rate Limiter(100회/30회), LRU 캐시 및 Docker 무중단 자동 배포 | [deployment-and-cicd.md](../guides/deployment-and-cicd.md) |

---

## 3. 현재 구현 정리

| 구분 | 현재 상태 | 확인 기준 |
| :--- | :--- | :--- |
| KPI 근거 매트릭스 | 완료 | 모든 상위 KPI에 `sourceDetails`가 있고 흥행 예측 지수는 선택 TourAPI 기준, 주변 관광지, 검색 관심도, 지역 수요 백데이터, 사용자 입력값, 산출값을 분리 표시 |
| 데이터 상태 요약 | 완료 | `DataBasisPanel`에서 TourAPI, 검색 관심도, 교통 근거, 관광소비, 지역 수요 백데이터 상태를 실조회, 일부 보완, 파일 정규화, 샘플 대체로 요약 |
| 선택 후보 기반 갱신 | 완료 | 후보 변경 시 trend, traffic, spending 로더가 후보 계획 기준으로 재호출되고 지도, 보고서, KPI 근거에 같은 선택 기준이 유지 |
| 공개검토용 보고서 | 다음 단계 | 보고서 섹션을 예측 결과, 혼잡·안전 진단, 예산·경제 효과, 사용 데이터와 한계, 개선 권고로 재정렬 예정 |
| 시나리오 공유 보존 | 후속 단계 | 저장·공유 시 선택 TourAPI 후보 기준까지 복원되도록 보강 예정 |

---

## 4. 대표 서비스 소개 카피 (Copywriting)

> "깜깜이 축제 기획은 이제 그만! 빅데이터 기반 지자체 축제 사전 진단의 시작, Fest-Twin"

1. 데이터 기반 사전 검증: 예산 투입 전 예측 방문객 수, 예상 지역 경제 파급효과, 투자 대비 ROI를 수식 근거와 함께 투명하게 진단합니다.
2. 인파 밀집 안전 사고 사전 예방: 피크 시간대 인파 밀집도($명/m^2$)와 병목 구간을 디지털 트윈 격자로 시뮬레이션하여 안전 대책을 수립합니다.
3. 원클릭 부서 공유 및 보고서 생성: 공유 링크 하나로 기획안을 타 부서에 전달하고 표준화된 결재 보고서를 즉시 출력합니다.
