#!/bin/sh
set -eu
revision=${1:?Git revision required}
expected_image=${2:?Current image required}
case "$revision" in *[!0-9a-f]*|'') exit 1;; esac
[ ${#revision} -ge 7 ] && [ ${#revision} -le 40 ]
release=/home/cwuser/fest-twin-releases/archive-$revision
image=fest-twin-demo:archive-$revision
backup=fest-twin-demo-backup-$revision
state=/home/cwuser/fest-twin-state/forecast-archive
scenario_state=/home/cwuser/fest-twin-state/scenarios
key=/home/cwuser/.config/fest-twin/forecast-archive.key
test "$(docker inspect fest-twin-demo --format '{{.Config.Image}}')" = "$expected_image"
test ! -e "$release"
install -d -m 700 "$state" "$scenario_state" /home/cwuser/.config/fest-twin
if [ ! -e "$key" ]; then
  (umask 077; openssl rand -hex 32 > "$key")
fi
test -s "$key"
chmod 600 "$key"
mkdir -p "$release"
tar -xzf /home/cwuser/fest-twin-$revision.tar.gz -C "$release"
docker build -t "$image" "$release"
docker stop fest-twin-demo
# Copy after shutdown so the snapshot includes the final completed write.
if ! docker cp fest-twin-demo:/app/data/scenarios_db.json "$scenario_state/scenarios-$revision.json"; then
  docker start fest-twin-demo
  exit 1
fi
if ! cp "$scenario_state/scenarios-$revision.json" "$scenario_state/scenarios_db.json"; then
  docker start fest-twin-demo
  exit 1
fi
chmod 600 "$scenario_state/scenarios_db.json" "$scenario_state/scenarios-$revision.json"
docker rename fest-twin-demo "$backup"
rollback() {
  docker rm -f fest-twin-demo >/dev/null 2>&1 || true
  docker rename "$backup" fest-twin-demo
  docker start fest-twin-demo
}
if ! docker run -d --name fest-twin-demo --restart unless-stopped -p 18080:80 \
  --env-file /home/cwuser/.config/fest-twin/runtime.env \
  -e FORECAST_ARCHIVE_DIR=/app/forecast-archive \
  -e FORECAST_ARCHIVE_RELEASE="$revision" \
  -e FORECAST_ARCHIVE_KEY_FILE=/run/secrets/forecast_archive_key \
  -e 'FORECAST_ARCHIVE_ORIGINS=https://cwserver.tail97dbc3.ts.net,http://192.168.55.223:18080' \
  --mount type=bind,source="$state",target=/app/forecast-archive \
  --mount type=bind,source="$scenario_state/scenarios_db.json",target=/app/data/scenarios_db.json \
  --mount type=bind,source="$key",target=/run/secrets/forecast_archive_key,readonly \
  "$image"; then rollback; exit 1; fi
healthy=false
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS http://127.0.0.1:18080/api/forecast-archive/status >/dev/null; then healthy=true; break; fi
  sleep 2
done
if [ "$healthy" != true ]; then rollback; exit 1; fi
ln -sfn "$release" /home/cwuser/fest-twin-demo
docker ps --filter name=fest-twin-demo --format '{{.Names}} {{.Image}} {{.Status}}'
