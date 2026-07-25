# Fest-Twin 공모전 제출 요약 및 요구사항 대응 명세서

Fest-Twin (지자체 축제 기획 사전 진단 및 디지털 트윈 시뮬레이션 B2G SaaS) 공모전 제출 요구사항 대응 매트릭스, 서비스 소개 카피 및 시스템 검증 증빙 문서입니다.

---

## 1. 공모전 참가 및 제출 요약

- 서비스명: Fest-Twin (페스트트윈)
- 분야: 공공 빅데이터 활용 B2G 축제 기획 사전 진단 및 안전/경제성 시뮬레이션 SaaS
- 주요 대상: 지자체 축제 기획 담당 공무원, 안전관리팀, 지역 경제 진흥 과장
- 구동 환경:
  - 공개 데모 URL: `https://cwserver.tail97dbc3.ts.net/`
  - 원격 서버 배포: `http://192.168.55.223:18080/`
  - Docker 이미지: `fest-twin-demo:latest`

---

## 2. 공모전 공고 대응 매트릭스 (Notice Response Matrix)

| 평가 항목 | 공고 요구사항 | Fest-Twin 구체적 대응 구현 내용 | 증빙 및 명세 위치 |
| :--- | :--- | :--- | :--- |
| 공공데이터 연동성 | 공공 빅데이터 활용 및 실시간 OpenAPI 연동 | 한국관광공사 TourAPI 4.0, 관광데이터랩 객단가 지출 데이터, 국가교통DB(KTDB View-T) 3대 공공 데이터 연동 프록시 구현 | [architecture-and-api.md](../specs/architecture-and-api.md) |
| 수치 산출 근거 | 예측 수치에 대한 투명한 근거 및 연산 수식 제시 | Metric Evidence Engine 구축. 수식 100% 공개, 산출 근거 드로어(Drawer) 및 비식별 정화 적용 | [data-and-simulation-methodology.md](../specs/data-and-simulation-methodology.md) |
| 안전사고 예방 | 인파 밀집 및 안전관리 사전 시뮬레이션 | 5ms 이내 그리드 체류 인원 밀도($명/m^2$) 및 위험도 등급(관심/주의/경계/심각) 실시간 시뮬레이션 | [data-and-simulation-methodology.md](../specs/data-and-simulation-methodology.md) |
| 협업 및 영속성 | 부서 간 축제 기획안 공유 및 데이터 영속화 | SQLite REST API 기반 저장소 및 8자리 `share_token` 부서 공유 링크 복원 기능 구현 | [architecture-and-api.md](../specs/architecture-and-api.md) |
| 시스템 안정성 | 보안 및 프록시 쿼터 보호, 무중단 배포 | OWASP CSP 헤더, 2단계 Rate Limiter(100회/30회), LRU 캐시 및 Docker 무중단 자동 배포 | [deployment-and-cicd.md](../guides/deployment-and-cicd.md) |

---

## 3. 대표 서비스 소개 카피 (Copywriting)

> "깜깜이 축제 기획은 이제 그만! 빅데이터 기반 지자체 축제 사전 진단의 시작, Fest-Twin"

1. 데이터 기반 사전 검증: 예산 투입 전 예측 방문객 수, 예상 지역 경제 파급효과, 투자 대비 ROI를 수식 근거와 함께 투명하게 진단합니다.
2. 인파 밀집 안전 사고 사전 예방: 피크 시간대 인파 밀집도($명/m^2$)와 병목 구간을 디지털 트윈 격자로 시뮬레이션하여 안전 대책을 수립합니다.
3. 원클릭 부서 공유 및 보고서 생성: 공유 링크 하나로 기획안을 타 부서에 전달하고 표준화된 결재 보고서를 즉시 출력합니다.
