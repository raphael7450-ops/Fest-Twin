# Fest-Twin 데이터베이스 및 백업/복구 절차서 (Backup & Restore Policy)

작성일: 2026-08-04  
문서 성격: B2G 시스템 데이터 영속성 및 장애 복구 운영 지침서  

---

## 1. 데이터 저장소 구조 및 백업 대상

| 저장 데이터 | 저장 파일 위치 | 백업 주기 | 보관 기간 |
| --- | --- | --- | --- |
| 시나리오 DB | `data/scenarios_db.json` | 매일 03:00 (크론 자동) | 90일 |
| 지역 축제 백데이터 | `data/regional_festivals_db.json` | 변경 시 스냅샷 | 영구 |
| 감사(Audit) 로그 | `logs/audit-YYYY-MM-DD.log` | 실시간 롤링 | 365일 (1년) |
| 애플리케이션 로그 | `logs/app-YYYY-MM-DD.log` | 실시간 롤링 | 180일 (6개월) |

---

## 2. 데이터베이스 스냅샷 자동 백업 스크립트

서버 크론탭(Crontab)에 등록하여 일일 백업을 수행합니다.

```bash
#!/bin/bash
# 파일 위치: /opt/fest-twin/scripts/backup-db.sh

BACKUP_DIR="${BACKUP_DIR:-/opt/fest-twin/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# 1. 시나리오 데이터 백업
if [ -f "/opt/fest-twin/data/scenarios_db.json" ]; then
  cp /opt/fest-twin/data/scenarios_db.json "$BACKUP_DIR/scenarios_db_$TIMESTAMP.json"
fi

# 2. 90일 이상 경과한 오래된 백업 정리
find "$BACKUP_DIR" -name "scenarios_db_*.json" -mtime +90 -exec rm -f {} \;

echo "[$(date)] Backup completed: scenarios_db_$TIMESTAMP.json"
```

---

## 3. 백업 데이터 복구 (Restore) 절차

데이터 유실이나 시스템 장애 발생 시 복구 수행 순서입니다.

1. **서비스 컨테이너 일시 중지**
   ```bash
   docker stop fest-twin-demo
   ```

2. **백업 파일 복원**
   ```bash
   # 가장 최근 백업 파일 복사
   LATEST_BACKUP=$(ls -t /opt/fest-twin/backups/scenarios_db_*.json | head -n 1)
   cp "$LATEST_BACKUP" /opt/fest-twin/data/scenarios_db.json
   ```

3. **컨테이너 재시작 및 무결성 검증**
   ```bash
   docker start fest-twin-demo
   curl -s http://localhost:18080/api/scenarios | grep "scen_"
   ```

---

## 4. 장애 복구 리허설 주기

- **주기**: 분기 1회 (3개월 단위)
- **절차**: 임의 백업 스냅샷을 생성 후 가상 복구 수행, `scenarios_db.json` 파싱 성공 여부 점검
