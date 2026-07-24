/**
 * 파일 : scripts/build-submission-zip.js
 * 내용 : B2G 축제 사전 진단 SaaS 제출용 소스코드, 빌드 결과물 및 문서 종합 아카이브 생성기
 * 수정 : 2026-07-24. docs, src, server, data, .github, scripts, dist 전체 아카이빙 지원
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const rootDir = process.cwd();
const artifactsDir = path.join(rootDir, "artifacts");
const zipPath = path.join(artifactsDir, "fest-twin-submission-package.zip");

if (!fs.existsSync(artifactsDir)) {
  fs.mkdirSync(artifactsDir, { recursive: true });
}

if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

console.log("📦 Building complete Fest-Twin submission zip package...");

try {
  const itemsToInclude = [
    `${rootDir}\\docs`,
    `${rootDir}\\src`,
    `${rootDir}\\server`,
    `${rootDir}\\data`,
    `${rootDir}\\.github`,
    `${rootDir}\\scripts`,
    `${rootDir}\\dist`,
    `${rootDir}\\README.md`,
    `${rootDir}\\package.json`,
    `${rootDir}\\package-lock.json`,
    `${rootDir}\\Dockerfile`,
    `${rootDir}\\docker-compose.yml`,
    `${rootDir}\\index.html`,
    `${rootDir}\\vite.config.ts`,
    `${rootDir}\\vitest.config.ts`,
    `${rootDir}\\tsconfig.json`,
  ].filter((p) => fs.existsSync(p));

  const itemsString = itemsToInclude.map((i) => `'${i}'`).join(", ");
  const psCommand = `powershell -Command "Compress-Archive -Path ${itemsString} -DestinationPath '${zipPath}' -Force"`;

  execSync(psCommand, { stdio: "inherit" });
  console.log(`✅ Submission zip successfully created at: ${zipPath}`);
} catch (error) {
  console.error("❌ Failed to create submission zip archive:", error);
  process.exit(1);
}
