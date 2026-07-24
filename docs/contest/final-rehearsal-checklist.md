# 페스트트윈 최종 리허설 체크리스트

## 3분 설명 순서

1. 지정과제 9번 문제를 설명한다.
   - 축제 수요 예측 실패
   - 주관적 경험 의존형 기획
   - 예산 낭비와 관광객 쏠림
2. 공개 데모 첫 화면을 연다.
   - https://cwserver.tail97dbc3.ts.net/
3. `제출 데모 검증 현황` 패널을 보여준다.
   - 공개 URL
   - TourAPI 프록시
   - 보안
   - 제출 상태
4. `정부 지침 반영 현황`을 보여준다.
5. `데이터 근거`에서 TourAPI 실제 조회와 샘플 보완 상태를 설명한다.
6. 수요 예측, 혼잡도 히트맵, 주요 리스크를 순서대로 보여준다.
7. 기획 보완 리포트와 인쇄 흐름을 보여준다.
8. GitHub README와 Release zip을 보여준다.

## 제출 자료 확인

- [ ] 공개 데모 URL이 열린다.
- [ ] GitHub 저장소가 비로그인 상태에서 열린다.
- [ ] GitHub Release가 열린다.
- [ ] Release zip이 다운로드된다.
- [ ] `docs/contest/final-submission-package.md`가 있다.
- [ ] `docs/contest/final-submission-checklist.md`가 있다.
- [ ] `artifacts/fest-twin-submission-package.zip`이 있다.
- [ ] 화면 증빙 이미지가 `docs/assets/submission/`에 있다.

## 공개 데모 확인

- [ ] 첫 화면에 `제출 데모 검증 현황` 패널이 보인다.
- [ ] `공개 데모 열기` 버튼이 있다.
- [ ] `TourAPI 프록시` 카드에 `festivals/detail resultCode=0000` 문구가 보인다.
- [ ] `정부 지침 반영 현황` 섹션이 보인다.
- [ ] 데이터 근거 섹션에 TourAPI 조회 상태가 보인다.
- [ ] 수요 예측 차트가 보인다.
- [ ] 혼잡도 히트맵이 보인다.
- [ ] 기획 보완 리포트가 보인다.
- [ ] 시나리오 저장 기능이 보인다.
- [ ] 모바일 화면에서 가로 넘침이 없다.

## 운영 확인

- [ ] Docker 컨테이너 `fest-twin-demo`가 `Up` 상태다.
- [ ] Docker 이미지가 `fest-twin-demo:20260717092936`이다.
- [ ] 컨테이너 restart policy가 `unless-stopped`다.
- [ ] Docker 서비스가 `enabled`, `active`다.
- [ ] Tailscale 서비스가 `enabled`, `active`다.
- [ ] Tailscale Funnel이 공개 URL을 `127.0.0.1:18080`으로 프록시한다.
- [ ] TourAPI 키는 서버 런타임 환경변수로만 주입된다.
- [ ] 실제 키와 서버 비밀번호는 Git, 문서, Release zip에 없다.

## 제출 폼에 넣을 핵심 링크

- 공개 데모: https://cwserver.tail97dbc3.ts.net/
- GitHub 저장소: https://github.com/raphael7450-ops/Fest-Twin
- GitHub Release: https://github.com/raphael7450-ops/Fest-Twin/releases/tag/v0.1.0-submission-demo
- Release zip: https://github.com/raphael7450-ops/Fest-Twin/releases/download/v0.1.0-submission-demo/fest-twin-submission-package.zip
