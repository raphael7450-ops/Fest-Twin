/**
 * 파일 : scripts/remote-deploy.js
 * 내용 : 원격지(192.168.55.223) Docker 재배포 및 헬스체크 자동화 스크립트
 * 실행 : node scripts/remote-deploy.js (또는 npm run deploy:remote)
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

const REMOTE_USER = "cwuser";
const REMOTE_HOST = "192.168.55.223";
const TAR_FILE = "fest-twin-demo.tar";

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: "inherit", cwd: PROJECT_ROOT, ...opts });
}

async function main() {
  console.log("======================================================");
  console.log("[INFO] 원격지(192.168.55.223) Docker 자동 재배포 시작");
  console.log("======================================================");

  const tarPath = path.join(PROJECT_ROOT, TAR_FILE);

  try {
    // 1. git archive로 최신 HEAD 타르 아카이브 생성
    console.log("\n[1/4] Git HEAD 타르 아카이브 생성...");
    run(`git archive -o "${TAR_FILE}" HEAD`);

    // 2. scp로 원격 서버 업로드
    console.log(`\n[2/4] 원격 서버(${REMOTE_USER}@${REMOTE_HOST})에 아카이브 업로드...`);
    run(`scp "${TAR_FILE}" ${REMOTE_USER}@${REMOTE_HOST}:~/`);

    // 3. 원격 서버에서 Docker 이미지 빌드 및 컨테이너 재배포 실행
    console.log("\n[3/4] 원격 서버에서 Docker 이미지 빌드 및 재배포 수행...");
    const remoteCommands = [
      "set -e",
      "staging_dir=$HOME/fest-twin-demo.staging",
      "release_dir=$HOME/fest-twin-demo",
      "deploy_id=$(date -u +%Y%m%d%H%M%S)-$$",
      "new_image=fest-twin-demo:$deploy_id",
      "rm -rf $staging_dir",
      "mkdir -p $staging_dir",
      "tar -xf $HOME/fest-twin-demo.tar -C $staging_dir",
      "rm -f $HOME/fest-twin-demo.tar",
      "echo '==> Docker 이미지 빌드 시작...'",
      "docker build --build-arg VWORLD_API_KEY=2BEE395D-834A-3F75-BC64-CAC185A7A442 -t $new_image $staging_dir",
      "existing=$(docker ps -aq --filter name=^fest-twin-demo$)",
      "if [ -n \"$existing\" ]; then echo '==> 기존 컨테이너 중지 및 제거...'; docker stop $existing; docker rm $existing; fi",
      "rm -rf $release_dir",
      "mv $staging_dir $release_dir",
      "echo '==> 신규 컨테이너 실행...'",
      "if [ -f $HOME/fest-twin-demo.env ]; then docker run -d --name fest-twin-demo --env-file $HOME/fest-twin-demo.env --label com.fest-twin.managed-by=fest-twin-internal-demo --restart unless-stopped -p 18080:80 $new_image; else docker run -d --name fest-twin-demo --label com.fest-twin.managed-by=fest-twin-internal-demo --restart unless-stopped -p 18080:80 $new_image; fi",
      "echo '==> 원격 Docker 재배포 완료!'",
    ].join(" && ");

    run(`ssh ${REMOTE_USER}@${REMOTE_HOST} "${remoteCommands}"`);

    // 4. 배포 헬스체크 수행
    console.log("\n[4/4] 원격 서버 헬스체크 수행...");
    run("npm run deploy:check");

    console.log("\n======================================================");
    console.log("[SUCCESS] 원격지(192.168.55.223:18080) Docker 반영 및 헬스체크 성공!");
    console.log("======================================================\n");
  } catch (error) {
    console.error("\n[ERROR] 배포 과정에서 오류가 발생했습니다:", error.message);
    process.exit(1);
  } finally {
    if (fs.existsSync(tarPath)) {
      try {
        fs.unlinkSync(tarPath);
      } catch {
        // ignore
      }
    }
  }
}

main();
