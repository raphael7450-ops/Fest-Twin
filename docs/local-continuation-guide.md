# 페스트트윈 로컬 작업 이어가기

## 브랜치

현재 작업 브랜치는 `agent/government-guided-mvp`입니다. 집에서는 이 브랜치를 기준으로 이어서 작업한다.

## 처음 내려받기

```powershell
git clone https://github.com/raphael7450-ops/Fest-Twin.git
cd Fest-Twin
git checkout agent/government-guided-mvp
npm install
npm run dev
```

실행 후 브라우저에서 `http://127.0.0.1:5173/`을 연다.

## 이미 내려받은 폴더가 있을 때

```powershell
cd Fest-Twin
git fetch origin
git checkout agent/government-guided-mvp
git pull origin agent/government-guided-mvp
npm install
npm run dev
```

## 검증

작업 전후로 다음 명령을 실행한다.

```powershell
npm run test
npm run build
```

현재 기준 검증 상태는 테스트 6개 파일, 8개 항목 통과이며 빌드도 정상이다.

## 참고 환경

- 권장 Node.js: 20 이상
- 현재 개발 PC Node.js: 24.18.0
- 현재 개발 PC npm: 11.16.0

## 로컬에 생길 수 있는 파일

다음 파일과 폴더는 로컬에서 자동 생성되며 GitHub에 올리지 않는다.

- `node_modules/`
- `dist/`
- `*.tsbuildinfo`
- `vite.config.js`, `vite.config.d.ts`
- `vitest.config.js`, `vitest.config.d.ts`

## 다음 작업 후보

다음 단계는 대시보드를 실제 심사용 데모에 가깝게 다듬는 것이다.

- 화면 직접 확인 후 문구와 배치 조정
- TourAPI 실제 연동 어댑터 구조 추가
- 시나리오 저장/불러오기 기능
- 리포트 출력용 화면 또는 PDF 내보내기
- 공공 SaaS 보안·권한·감사 로그 설계 문서 보강
