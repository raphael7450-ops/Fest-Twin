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

## 리포트 출력 확인

1. `http://127.0.0.1:5173/`을 연다.
2. 하단의 `기획 보완 리포트` 영역으로 이동한다.
3. `리포트 인쇄` 버튼을 선택한다.
4. 브라우저 인쇄 창에서 PDF 저장 또는 프린터 출력을 선택한다.

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
