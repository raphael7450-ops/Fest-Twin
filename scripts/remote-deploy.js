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

function getVWorldApiKey() {
  if (process.env.VWORLD_API_KEY?.trim()) return process.env.VWORLD_API_KEY.trim();
  const envPath = path.join(PROJECT_ROOT, ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    const match = content.match(/^VWORLD_API_KEY=(.*)$/m) || content.match(/^VITE_VWORLD_API_KEY=(.*)$/m);
    if (match && match[1].trim()) return match[1].trim();
  }
  return "2BEE395D-834A-3F75-BC64-CAC185A7A442";
}

const REMOTE_USER = process.env.REMOTE_USER || "cwuser";
const REMOTE_HOST = process.env.REMOTE_HOST || "100.104.94.112";
const FALLBACK_HOST = "192.168.55.223";
const REMOTE_PASS = process.env.REMOTE_PASS || "ckddnjsl";
const VWORLD_API_KEY = getVWorldApiKey();

function findPuTTYExecutable(name) {
  const candidatePaths = [
    `C:\\Program Files\\PuTTY\\${name}`,
    `C:\\Program Files (x86)\\PuTTY\\${name}`,
    name,
  ];
  for (const candidatePath of candidatePaths) {
    if (fs.existsSync(candidatePath)) return candidatePath;
  }
  return name;
}

const PLINK = findPuTTYExecutable("plink.exe");
const PSCP = findPuTTYExecutable("pscp.exe");
const TAR_FILE = "fest-twin-demo.tar";

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: "inherit", cwd: PROJECT_ROOT, ...opts });
}

function ensureHostKeyCached(host) {
  try {
    const pipeCmd = `echo y | "${PLINK}" -pw ${REMOTE_PASS} ${REMOTE_USER}@${host} "echo host-key-ok"`;
    execSync(`cmd.exe /c "${pipeCmd}"`, {
      stdio: "ignore",
      cwd: PROJECT_ROOT,
      timeout: 10000,
    });
  } catch {
    // ignore
  }
}


async function main() {
  if (!VWORLD_API_KEY) {
    console.error("[ERROR] VWORLD_API_KEY is required to build the VWorld map bundle.");
    process.exitCode = 1;
    return;
  }

  console.log("======================================================");
  console.log("[INFO] 원격지 Docker 자동 재배포 시작");
  console.log("======================================================");

  const tarPath = path.join(PROJECT_ROOT, TAR_FILE);

  try {
    // 1. git archive로 최신 HEAD 타르 아카이브 생성
    console.log("\n[1/4] Git HEAD 타르 아카이브 생성...");
    run(`git archive -o "${TAR_FILE}" HEAD`);

    const hostkeyArg = '-hostkey "SHA256:K5gufOW8QFCKpg6mMOE73Z2aC78mbPQbrQ616TTAo70"';

    // 2. pscp로 원격 서버 업로드
    let activeHost = REMOTE_HOST;
    console.log(`\n[2/4] 원격 서버(${REMOTE_USER}@${activeHost})에 아카이브 업로드...`);
    try {
      run(`"${PSCP}" ${hostkeyArg} -batch -pw ${REMOTE_PASS} "${TAR_FILE}" ${REMOTE_USER}@${activeHost}:/home/${REMOTE_USER}/`);
    } catch (uploadErr) {
      if (activeHost !== FALLBACK_HOST) {
        console.log(`[INFO] ${activeHost} 연결 실패. 로컬 LAN 호스트(${FALLBACK_HOST})로 재시도합니다...`);
        activeHost = FALLBACK_HOST;
        run(`"${PSCP}" ${hostkeyArg} -batch -pw ${REMOTE_PASS} "${TAR_FILE}" ${REMOTE_USER}@${activeHost}:/home/${REMOTE_USER}/`);
      } else {
        throw uploadErr;
      }
    }

    // 3. 원격 서버에서 Docker 이미지 빌드 및 컨테이너 재배포 실행
    console.log(`\n[3/4] 원격 서버(${activeHost})에서 Docker 이미지 빌드 및 재배포 수행...`);
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
      `docker build --build-arg VWORLD_API_KEY=${VWORLD_API_KEY} -t $new_image $staging_dir`,
      "existing=$(docker ps -aq --filter name=^fest-twin-demo$)",
      "if [ -n \"$existing\" ]; then echo '==> 기존 컨테이너 중지 및 제거...'; docker stop $existing; docker rm $existing; fi",
      "rm -rf $release_dir",
      "mv $staging_dir $release_dir",
      "echo '==> 신규 컨테이너 실행...'",
      "if [ -f $HOME/fest-twin-demo.env ]; then docker run -d --name fest-twin-demo --env-file $HOME/fest-twin-demo.env --label com.fest-twin.managed-by=fest-twin-internal-demo --restart unless-stopped -p 18080:80 $new_image; else docker run -d --name fest-twin-demo --label com.fest-twin.managed-by=fest-twin-internal-demo --restart unless-stopped -p 18080:80 $new_image; fi",
      "echo '==> 원격 Docker 재배포 완료!'",
    ].join(" && ");

    run(`"${PLINK}" ${hostkeyArg} -batch -pw ${REMOTE_PASS} ${REMOTE_USER}@${activeHost} "${remoteCommands}"`);



    // 4. 배포 헬스체크 수행
    console.log("\n[4/4] 원격 서버 헬스체크 수행...");
    run("npm run deploy:check");

    console.log("\n======================================================");
    console.log("[SUCCESS] 원격지(100.104.94.112:18080) Docker 반영 및 헬스체크 성공!");
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
