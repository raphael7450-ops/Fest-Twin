# 제출 시연 패키지 구현 계획

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Goal: 심사자와 협업자가 내부 데모, TourAPI 근거, 검증 결과를 빠르게 확인할 수 있는 한글 제출·시연 문서 패키지를 만든다.

Architecture: 앱 코드는 변경하지 않고 문서만 정리한다. 새 시연 가이드를 추가하고 README와 데모 검증 체크리스트에서 같은 접속 주소와 검증 근거를 참조하게 한다.

Tech Stack: Markdown 문서, 기존 Vite + React + TypeScript 앱 검증 명령.

## Global Constraints

- 모든 사용자 노출 문구는 한국어로 작성한다.
- 서비스명은 `페스트트윈(Fest-Twin)`으로 표기한다.
- 실제 TourAPI 키, 서버 비밀번호, SSH 비밀번호는 문서에 저장하지 않는다.
- 현재 내부 데모 주소는 `http://192.168.55.223:18080/`로 표기한다.
- 현재 PR은 draft 상태로 유지한다.
- 앱 UI, API, Docker 런타임 코드는 변경하지 않는다.

---

### Task 1: 제출 시연 가이드 작성

Files:
- Create: `docs/submission-demo-guide.md`

Interfaces:
- Consumes: 현재 README, 데모 검증 체크리스트, 내부 Docker 배포 문서.
- Produces: 심사용 5분 데모 순서와 질의응답 기준 문서.

- [ ] Step 1: 시연 가이드 파일을 만든다

`docs/submission-demo-guide.md`에 다음 섹션을 작성한다.

```markdown
# 페스트트윈 제출 시연 가이드

## 접속 정보

- 내부 데모: http://192.168.55.223:18080/
- GitHub PR: https://github.com/raphael7450-ops/Fest-Twin/pull/1

## 5분 시연 순서

1. 첫 화면에서 서비스명과 정부 지침 기반 B2G SaaS 목적을 확인한다.
2. 축제 기획안 입력 영역에서 지역, 기간, 예산, 수용 인원을 확인한다.
3. 데이터 근거 영역에서 TourAPI 실제 조회 또는 샘플 보완 상태를 확인한다.
4. 수요 예측 그래프와 혼잡도 히트맵을 함께 설명한다.
5. 주요 리스크와 기획 보완 리포트를 확인한다.
6. 시나리오 저장과 리포트 인쇄 버튼으로 심사 자리에서의 사용 흐름을 보여준다.
```

- [ ] Step 2: TourAPI, 개인정보, 장애 대응 설명을 추가한다

같은 파일에 다음 내용을 포함한다.

```markdown
## 핵심 설명 포인트

- TourAPI 인증키는 브라우저 번들에 넣지 않고 서버 환경변수로만 주입한다.
- 입력 기간 검색 결과가 0건이면 같은 지역의 연간 축제 데이터를 참고하고, 데이터 근거 패널에 기간 완화 사유를 표시한다.
- MVP는 담당자 실명, 연락처, 개인별 위치 이력, 결제정보를 수집하지 않는다.
- TourAPI 호출 실패나 응답 부족이 있어도 샘플 공공데이터 보완으로 예측, 히트맵, 리포트 흐름을 유지한다.
```

- [ ] Step 3: 로컬 재현 명령을 추가한다

```markdown
## 로컬 재현

```powershell
git clone https://github.com/raphael7450-ops/Fest-Twin.git
cd Fest-Twin
git checkout main
npm install
npm run test
npm run build
npm run dev
```
```

- [ ] Step 4: 커밋한다

```powershell
git add docs/submission-demo-guide.md
git commit -m "docs: add submission demo guide"
```

### Task 2: README와 검증 체크리스트 갱신

Files:
- Modify: `README.md`
- Modify: `docs/demo-verification.md`

Interfaces:
- Consumes: Task 1의 `docs/submission-demo-guide.md`.
- Produces: 저장소 첫 화면과 검증 문서에서 같은 제출 흐름을 안내한다.

- [ ] Step 1: README 상단에 빠른 확인 섹션을 추가한다

`README.md`의 프로젝트 소개 뒤에 다음 내용을 추가한다.

```markdown
## 빠른 데모 확인

- 내부 데모: http://192.168.55.223:18080/
- PR: https://github.com/raphael7450-ops/Fest-Twin/pull/1
- 시연 순서: [제출 시연 가이드](docs/submission-demo-guide.md)

심사자는 첫 화면에서 정부 지침 기반 대시보드, 데이터 근거, 수요 예측, 혼잡 히트맵, 기획 보완 리포트를 순서대로 확인하면 됩니다.
```

- [ ] Step 2: 현재 문서 목록에 제출 시연 가이드를 추가한다

`README.md`의 현재 문서 목록에 다음 항목을 추가한다.

```markdown
- [제출 시연 가이드](docs/submission-demo-guide.md)
```

- [ ] Step 3: 데모 검증 문서에 2026-07-17 검증 결과를 추가한다

`docs/demo-verification.md` 하단에 다음 내용을 추가한다.

```markdown
## 2026-07-17 서버 검증 결과

- 내부 데모 주소: `http://192.168.55.223:18080/`
- Docker 컨테이너: `fest-twin-demo`
- 외부 대시보드 HTTP 응답: `200 OK`
- TourAPI 프록시 응답: `resultCode=0000`
- 서울 연간 축제 조회 결과: `totalCount=2`, 첫 항목 `강남 미디어 윈터페스타`
- 인증키는 서버 런타임 환경변수로만 주입되며 문서와 Git 변경 목록에 기록하지 않는다.
```

- [ ] Step 4: 검증하고 커밋한다

```powershell
npm run test
npm run build
git diff --check
git add README.md docs/demo-verification.md
git commit -m "docs: update submission verification references"
```

### Task 3: 서버 상태 재확인과 PR 갱신

Files:
- No source edits.

Interfaces:
- Consumes: Task 1-2 문서 변경.
- Produces: 최신 원격 브랜치와 PR 본문.

- [ ] Step 1: 서버 대시보드와 TourAPI 프록시를 확인한다

```powershell
curl.exe -I --max-time 15 http://192.168.55.223:18080/
```

기대 결과: `HTTP/1.1 200 OK`

```powershell
$json = ssh -o BatchMode=yes cwuser@192.168.55.223 'curl -sS --max-time 20 "http://127.0.0.1:18080/api/tour/festivals?numOfRows=5&pageNo=1&arrange=A&areaCode=1&eventStartDate=20260101&eventEndDate=20261231"'
$obj = $json | ConvertFrom-Json
"RESULT_CODE=$($obj.response.header.resultCode)"
"TOTAL=$($obj.response.body.totalCount)"
"FIRST_TITLE=$($obj.response.body.items.item[0].title)"
```

기대 결과: `RESULT_CODE=0000`, `TOTAL=2`, `FIRST_TITLE=강남 미디어 윈터페스타`

- [ ] Step 2: 푸시한다

```powershell
git push origin main
```

- [ ] Step 3: PR 본문을 갱신한다

PR #1 본문에 제출 시연 가이드와 2026-07-17 검증 결과를 반영한다. PR은 draft 상태로 유지한다.
