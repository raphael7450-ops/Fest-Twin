# Fest-Twin 시연 전 리허설 체크리스트

> 용도: 시연 10분 전 최종 점검 목록
> 담당: 시연 발표자 / 기술 지원 담당

---

## 서버 및 인프라 점검

- [ ] 서버 실행 상태 확인
  ```bash
  # 로컬 개발 서버 (Vite 프론트엔드)
  npm run dev
  # 확인: "Local: http://127.0.0.1:5173" 출력 확인
  ```

- [ ] 백엔드 API 서버 가동 확인
  ```bash
  npm run start
  # 확인: "Fest-Twin server listening on port 80" 출력 확인
  ```

- [ ] 헬스체크 스크립트 실행
  ```bash
  npm run deploy:check
  # 기대 결과: 4개 엔드포인트 모두 [OK]
  #   [OK] /api/scenarios -> HTTP 200
  #   [OK] /api/tour/area-code -> HTTP 200
  #   [OK] /api/scenarios/scen_sample_01 -> HTTP 200
  #   [OK] /api/scenarios/share/token_gn_winter_2026 -> HTTP 200
  ```

- [ ] 환경변수 (.env.local) 확인
  - `TOUR_API_KEY` 값이 올바른 한국관광공사 인증키로 설정되어 있는지 확인
  - 키가 없거나 만료된 경우 → 시연 시 Fallback 샘플 데이터로 전환됨 (동작에는 문제 없음)

---

## 브라우저 준비

- [ ] 브라우저 캐시 정돈
  - Chrome DevTools (F12) → Application → Storage → "Clear site data" 클릭
  - 또는 Ctrl+Shift+Delete → "캐시된 이미지 및 파일" 선택 후 삭제

- [ ] 브라우저 시크릿 모드 준비
  - 시나리오 공유 링크 시연 시 새 시크릿/프라이빗 탭 필요
  - Ctrl+Shift+N (Chrome) 또는 Ctrl+Shift+P (Firefox) 로 미리 열어둘 것

- [ ] 브라우저 확대율 확인
  - Ctrl+0 으로 확대율 100% 리셋
  - 프로젝터/대형 화면의 경우 125~150% 권장

- [ ] 주소창에 즐겨찾기 등록
  - `http://127.0.0.1:5173` (Vite 프론트엔드)
  - `http://127.0.0.1/api/scenarios` (백엔드 API 확인용)

- [ ] 불필요한 탭/알림 정리
  - 메신저, 이메일, 알림 팝업 모두 끄기
  - 시연에 사용할 탭만 남기기

---

## 데이터 준비

- [ ] TourAPI 실데이터 사전 조회 확인
  - 브라우저에서 대시보드를 열고 "개최 지역"을 `서울특별시`로 입력
  - "데이터 신뢰도" 배지가 `실제 TourAPI 조회 성공`으로 표시되는지 확인
  - 표시되지 않을 경우 → Fallback으로도 시연 가능 (DEMO_SCRIPT.md 3:30~5:00 대사 참조)

- [ ] 샘플 시나리오 저장 확인
  - "시나리오 저장" 버튼 클릭 → 시나리오 카드가 목록에 추가되는지 확인
  - "공유 링크" 버튼 클릭 → 클립보드 복사 알림이 뜨는지 확인
  - 시크릿 탭에서 공유 URL 접속 → 동일 환경 복원 확인

- [ ] Evidence Drawer 동작 확인
  - "핵심 진단 지표"의 [근거 보기] 버튼 클릭 → "지표 산출 근거" 다이얼로그 정상 오픈
  - "사용 데이터", "산출 방식", "사용 데이터 상세", "해석 시 주의사항" 탭 전환 확인

---

## 보안 및 안정성 시연 준비

- [ ] Audit 로그 파일 확인
  ```bash
  # 오늘 날짜 로그 파일 존재 확인
  ls logs/audit-*.log
  # 내용 확인 (최근 5줄)
  tail -5 logs/audit-$(date +%Y-%m-%d).log
  ```

- [ ] 부하 테스트 보고서 준비
  - `docs/LOAD_TEST_REPORT.md` 파일이 존재하고 최신 결과가 기록되어 있는지 확인
  - 필요 시 `npm run test:load` 실행하여 최신 결과 갱신

---

## 테스트 최종 확인

- [ ] 단위 테스트 전체 PASS 확인
  ```bash
  npm test
  # 기대 결과: 21 test files, 84 tests passed
  ```

- [ ] 부하 테스트 PASS 확인
  ```bash
  npm run test:load
  # 기대 결과: 3개 시나리오 ALL PASS
  ```

---

## 발표 장비 점검

- [ ] 마이크/음향 테스트 완료
- [ ] 프로젝터/화면 공유 연결 확인
- [ ] 포인터/리모컨 동작 확인
- [ ] 시연 대본(DEMO_SCRIPT.md) 인쇄 또는 보조 모니터 준비
- [ ] 타이머 5분 세팅 (스마트폰 또는 프레젠테이션 타이머)

---

## 시연 직전 최종 순서 (T-5분)

| 시간 | 체크 |
|------|------|
| T-5분 | 서버 기동 상태 최종 확인 |
| T-4분 | 브라우저 탭 정리 & 확대율 확인 |
| T-3분 | TourAPI 실데이터 조회 1회 (캐시 Warm-up) |
| T-2분 | 시나리오 저장 + 공유 링크 미리 클립보드에 복사 |
| T-1분 | 대시보드 첫 화면으로 되돌리기 |
| T-0분 | 시연 시작 |

---

> 비상 대응: TourAPI가 응답하지 않을 경우 → 시연은 Fallback 모드에서 정상 진행 가능합니다.
> "데이터 신뢰도" 배지가 `샘플 데이터 대체 사용`으로 전환되며, 이를 오히려 Graceful Fallback의 라이브 데모로 활용하세요.
