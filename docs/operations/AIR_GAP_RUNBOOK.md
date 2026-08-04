# Fest-Twin 폐쇄망 (Air-Gap) 오프라인 설치 및 운영 런북

작성일: 2026-08-04  
대상: 인터넷 망이 차단된 지자체/공공기관 내부 망 운영자  

---

## 1. 사전 반입 모듈 준비 (외부망 환경)

인터넷 연결이 가능한 환경에서 반입용 패키지 타르볼을 생성합니다.

```bash
# 1. 소스 아카이브 생성
git archive -o fest-twin-airgap.tar HEAD

# 2. 오프라인 npm 캐시 아카이브 생성
npm ci
tar -czvf npm-cache.tar.gz ~/.npm

# 3. Docker 이미지 미리 빌드 후 tar 반입 (선택)
docker build -t fest-twin-demo:latest .
docker save -o fest-twin-demo-image.tar fest-twin-demo:latest
```

---

## 2. 폐쇄망 서버 내부 반입 및 설치 (내부망 환경)

인터넷이 차단된 내부망 서버로 파일을 이동한 후 구동합니다.

```bash
# 1. 소스 해제
mkdir -p /opt/fest-twin && cd /opt/fest-twin
tar -xf fest-twin-airgap.tar

# 2. Docker 반입 이미지 직접 로드 (권장 방식)
docker load -i fest-twin-demo-image.tar

# 3. 오프라인 환경변수 지정 (.env)
cat << 'EOF' > .env
PORT=18080
NODE_ENV=production
OFFLINE_MODE=true
LOG_DIR=/opt/fest-twin/logs
BACKUP_DIR=/opt/fest-twin/backups
EOF

# 4. 컨테이너 구동
docker run -d \
  --name fest-twin-demo \
  --env-file .env \
  --restart unless-stopped \
  -p 18080:80 \
  fest-twin-demo:latest
```

---

## 3. `OFFLINE_MODE=true` 동작 메커니즘

인터넷이 차단된 폐쇄망 환경에서는 외부 OpenAPI (TourAPI, Naver DataLab, View-T) 호출 시 프록시 타임아웃이 발생하는 것을 방지하기 위해 백엔드가 즉시 내부 정제 스냅샷 데이터(`data/regional_festivals_db.json`)를 반환합니다.

- **TourAPI 프록시**: 내부 지역별 축제 스냅샷 백데이터 응답
- **검색 트렌드 프록시**: 샘플 키워드 상대 지수 fallback 응답
- **KTDB 교통 프록시**: 정적 도로 링크 속도 정체율 fallback 응답
- **기상청 연동**: 평년 기후 기준 기온/강수 보정계수 사용

---

## 4. 헬스체크 및 오프라인 작동 검증

```bash
# 1. 컨테이너 상태 점검
docker ps --filter name=fest-twin-demo

# 2. 오프라인 API 응답 테스트
curl -s http://localhost:18080/api/scenarios
curl -s http://localhost:18080/api/tour/area-code?numOfRows=10
```
