# 페스트트윈 제출 시연 가이드

## 접속 정보

- 공개 데모: https://cwserver.tail97dbc3.ts.net/
- 내부 데모: http://192.168.55.223:18080/
- GitHub 저장소: https://github.com/raphael7450-ops/Fest-Twin
- 병합된 PR: https://github.com/raphael7450-ops/Fest-Twin/pull/1
- 제출 요약서: [submission-summary.md](../contest/submission-summary.md)
- 제출 문구: [contest-submission-copy.md](../contest/contest-submission-copy.md)
- 작업 기준 브랜치: `main`

## 5분 시연 순서

1. 첫 화면에서 `페스트트윈(Fest-Twin)` 서비스명과 정부 지침 기반 B2G SaaS 목적을 확인한다.
2. `축제 기획안 입력` 영역에서 TourAPI 실제 예시인 `강남 미디어 윈터페스타`, 지역, 기간, 예산, 예상 수용 인원을 확인한다.
3. `데이터 근거` 영역에서 TourAPI 실제 조회, 일부 조회 및 샘플 보완, 또는 샘플 대체 상태를 확인한다.
4. `시간대별 수요 예측` 그래프에서 예상 방문객, 피크 시간대, 예측 신뢰도를 설명한다.
5. `혼잡도 시뮬레이션` 히트맵에서 병목 구역과 시간대별 밀집 위험을 확인한다.
6. `주요 리스크`와 `기획 보완 리포트`에서 예산 낭비, 만족도 저하, 안전 리스크를 함께 설명한다.
7. `시나리오 저장`과 `리포트 인쇄` 버튼으로 심사 자리에서 비교·출력할 수 있는 흐름을 보여준다.

## 핵심 설명 포인트

- 페스트트윈은 축제 예산 집행 전 수요와 혼잡 리스크를 사전 진단하는 지자체용 SaaS MVP다.
- 기본 데모는 공개 데모 TourAPI 프록시로 확인한 `강남 미디어 윈터페스타`를 사용한다.
- 한국관광공사 TourAPI의 축제·관광지 데이터를 우선 사용하고, 호출 실패나 응답 부족이 있으면 TourAPI 형태의 샘플 공공데이터로 보완한다.
- TourAPI 인증키는 브라우저 번들에 넣지 않고 서버 런타임 환경변수로만 주입한다.
- 입력 기간 직접 일치 결과가 0건이면 같은 지역의 연간 축제 데이터를 참고하고, 데이터 근거 패널에 기간 완화 사유를 표시한다.
- 현재 소셜 관심도는 실시간 외부 연동이 아니라 비개인 사전 정의 샘플이다.
- MVP는 담당자 실명, 연락처, 개인별 위치 이력, 결제정보를 수집하지 않는다.

## 심사자가 확인할 가치

- 지자체 담당자가 주관적 경험만으로 축제를 기획하지 않고, 공공데이터 근거와 리스크 점수를 함께 볼 수 있다.
- 축제 흥행 가능성과 군중 안전 리스크를 같은 화면에서 비교한다.
- API 장애나 데이터 부족이 있어도 화면이 중단되지 않고, 어떤 근거를 사용했는지 사용자에게 표시한다.
- 정부 디지털서비스, 개인정보 최소수집, 공공데이터 출처 표시를 MVP 설계 기준에 포함했다.

## 예상 질문 답변

### 실제 방문객 통계인가?

아니다. TourAPI는 유사 축제의 실제 방문객 집계값을 제공하지 않으므로, 현재 값은 행사 기간, 이미지·개요 유무, 주변 관광정보 수, 비개인 트렌드 샘플을 조합한 추정 프록시다. 이 한계는 리포트와 산정 기준 문서에 명시되어 있다.

### TourAPI 결과가 없으면 어떻게 되는가?

정확한 입력 기간 검색 결과가 0건이면 같은 지역의 해당 연도 전체 행사 데이터를 한 번 더 조회한다. 그래도 부족하면 샘플 공공데이터를 보완하고, 데이터 근거 패널에 그 사유를 표시한다.

### 개인정보를 저장하는가?

저장하지 않는다. 시나리오 저장 기능은 축제 기획안과 진단 시간대를 브라우저 `localStorage`에만 보관하며, 담당자 개인정보나 개인 위치 이력은 입력받지 않는다.

### 운영 서버에 인증키가 노출되는가?

브라우저에는 노출하지 않는다. 인증키는 서버의 환경변수로만 주입되고, Git, Docker 이미지, README, 검증 문서에 실제 값을 기록하지 않는다.

## 로컬 재현

```powershell
git clone https://github.com/raphael7450-ops/Fest-Twin.git
cd Fest-Twin
npm install
npm run test
npm run build
npm run dev
```

브라우저에서 `http://127.0.0.1:5173/`을 열어 대시보드를 확인한다. Vite 개발 서버만 실행하면 서버 프록시가 없으므로 TourAPI는 샘플 fallback으로 동작한다. 실제 TourAPI 프록시까지 로컬에서 확인하려면 `npm run build` 후 서버 환경변수 `TOUR_API_KEY`를 제공하고 `npm start`를 실행한다.

## 관련 문서

- [제출 요약서](../contest/submission-summary.md)
- [TourAPI 실제 축제 예시](../specs/tourapi-recent-festival-example.md)
- [공모전 제출용 문구](../contest/contest-submission-copy.md)
- [데모 검증 체크리스트](demo-verification.md)
- [정부 지침 기반 설계 체크리스트](../specs/government-readiness-checklist.md)
- [수요 예측·혼잡 진단·리포트 산정 기준](../specs/forecast-simulation-report-method.md)
- [공공데이터 및 개인정보 최소수집 정책](../specs/public-data-and-privacy-policy.md)
- [내부 Docker 배포](internal-docker-deploy.md)
