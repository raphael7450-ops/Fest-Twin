# 페스트트윈(Fest-Twin)

페스트트윈은 한국관광공사 TourAPI와 공공·비개인 보완 데이터를 결합해 축제 수요, 수용성, 안전 운영, 경제 효과를 사전 검토하는 B2G 분석 대시보드입니다.

## 빠른 시작

권장 환경은 Node.js 20 이상과 npm입니다. 프론트엔드와 Express API를 함께 실행하려면 다음 PowerShell 명령을 사용합니다.

```powershell
npm install
$env:VITE_VWORLD_API_KEY="발급받은_VWorld_API_키"
npm run build
$env:TOUR_API_KEY="발급받은_TourAPI_Decoding_인증키"
$env:PORT="3000"
npm start
```

통합 애플리케이션은 `http://127.0.0.1:3000/`에서 실행됩니다. `VITE_VWORLD_API_KEY`는 VWorld 2D 지도를 위한 빌드 환경변수이므로 `npm run build` 전에 설정해야 합니다. `TOUR_API_KEY`는 실제 TourAPI 조회를 위한 서버 런타임 환경변수입니다. 키가 없거나 외부 API가 실패하면 해당 기능은 상태를 명시한 보완 화면 또는 데이터로 전환합니다.

프론트엔드만 빠르게 개발할 때는 `npm run dev`를 실행하고 `http://127.0.0.1:5173/`에 접속합니다. 이 모드에는 Express API 프록시가 없으므로 통합 TourAPI 및 시나리오 저장 흐름을 재현하지 않습니다.

## 검증

```powershell
npm test
npm run test:docs
npx tsc -b --pretty false
npm run build
```

문서 링크 검사는 README와 문서 인덱스의 로컬 링크를 확인합니다. 테스트 개수는 변경될 수 있으므로 고정 수치 대신 최종 실행 결과를 기준으로 판단합니다.

## 분석 일관성

- 데이터 조회가 끝나면 하나의 `FestivalAnalysisSnapshot`을 커밋합니다.
- 대시보드, 리포트, 인쇄 보고서, CSV는 같은 분석 ID와 모델 버전을 사용합니다.
- 예상 방문객, 흥행 가능성, 수용 정원률, 물리 밀도와 대피 시간은 커밋된 스냅샷 값을 사용합니다.
- 필수 행사장 면적, 출구 폭, 피난 거리 등 물리 지오메트리가 없으면 물리 밀도 또는 대피 시간은 `산출 불가`로 표시합니다.
- 각 데이터셋은 `live`, `cached`, `supplemented`, `unavailable` 상태를 별도로 공개하며, 보완 또는 사용 불가 데이터가 있으면 전체를 실시간 데이터로 표시하지 않습니다.

## 데이터와 저장소

현재 시나리오 저장 구현은 `JSON 파일 저장소`입니다. PostgreSQL 전환은 현재 기능이 아니라 Phase 2 계획입니다.

MVP는 담당자 실명, 연락처, 이메일, 주민등록번호, 결제정보, 개인별 위치 이력을 수집하지 않습니다.

## TourAPI 연동

실제 TourAPI 조회가 필요한 통합 환경에서는 인증키를 서버 런타임 환경변수로 제공합니다.

```env
TOUR_API_KEY=발급받은_일반_인증키_Decoding_값
```

React 앱은 같은 origin의 `/api/tour/*` 프록시를 호출합니다. 인증키가 없거나 응답 검증에 실패하면 출처와 상태를 명시한 보완 데이터로 전환합니다.

## 현재 기능

- 축제 기획안 및 TourAPI 후보 선택
- 시간대·평일·주말 수요 예측
- 수용성, 혼잡, 안전 인력, 대피 지표
- 데이터 근거와 한계 확인
- 시나리오 저장·복원
- 공공 검토 리포트, 인쇄 보고서, UTF-8 BOM CSV 출력

## 문서

- [기술 문서 종합 안내](docs/README.md)
- [데이터 신뢰도 평가 보고서](docs/DATA_RELIABILITY_REPORT.md)
- [아키텍처와 API](docs/specs/architecture-and-api.md)
- [데이터와 시뮬레이션 방법론](docs/specs/data-and-simulation-methodology.md)
- [선택 축제 데이터 흐름](docs/specs/selected-festival-data-flow.md)
- [배포와 CI/CD](docs/guides/deployment-and-cicd.md)
- [시연과 운영](docs/guides/demo-and-operations.md)
- [공모전 제출 패키지](docs/contest/submission-package.md)
- [제출 체크리스트](docs/contest/submission-checklist.md)
- [OpenAPI 활용 증빙](docs/contest/openapi-usage-evidence.md)
- [Phase 2 로드맵](docs/PHASE2_ROADMAP_PLAN.md)
