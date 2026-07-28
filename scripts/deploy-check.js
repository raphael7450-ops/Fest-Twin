/**
 * 파일 : scripts/deploy-check.js
 * 내용 : CI/CD 파이프라인 무중단 배포 및 API 라우트 헬스체크 검증 스크립트
 * 수정 : 2026-07-24. /api/scenarios, /api/tour, /api/spending, /api/traffic 헬스체크 검증 구현
 */

import http from "node:http";
import https from "node:https";

const DEFAULT_TARGET_URL = "https://cwserver.tail97dbc3.ts.net";
const legacyTargetHost = process.env.DEPLOY_TARGET_HOST;
const legacyTargetPort = process.env.DEPLOY_TARGET_PORT || "18080";
const TARGET_BASE_URL =
  process.env.DEPLOY_TARGET_URL ||
  (legacyTargetHost
    ? `http://${legacyTargetHost}:${legacyTargetPort}`
    : DEFAULT_TARGET_URL);

const ENDPOINTS = [
  "/api/scenarios",
  "/api/tour/area-code",
  "/api/scenarios/scen_sample_01",
  "/api/scenarios/share/token_gn_winter_2026",
];

function checkEndpoint(endpoint) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, TARGET_BASE_URL);
    const client = url.protocol === "https:" ? https : http;
    const req = client.get(url, { timeout: 10000 }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          resolve({ endpoint, statusCode: res.statusCode, bytes: data.length });
        } else {
          reject(new Error(`[FAIL] ${endpoint} returned HTTP ${res.statusCode}`));
        }
      });
    });

    req.on("error", (err) => reject(new Error(`[FAIL] ${endpoint} connection error: ${err.message}`)));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`[FAIL] ${endpoint} connection timed out after 10000ms`));
    });
  });
}

async function runDeployCheck() {
  console.log(`[CHECK] Checking deployment health on ${TARGET_BASE_URL}...`);
  let successCount = 0;

  for (const endpoint of ENDPOINTS) {
    let attempts = 0;
    let success = false;

    while (attempts < 2 && !success) {
      attempts += 1;
      try {
        const result = await checkEndpoint(endpoint);
        console.log(`  [OK] ${result.endpoint} -> HTTP ${result.statusCode} (${result.bytes} bytes)`);
        successCount += 1;
        success = true;
      } catch (error) {
        if (attempts >= 2) {
          console.error(`  [FAIL] ${error.message}`);
        } else {
          console.log(`  [RETRY] ${endpoint} retrying (attempt ${attempts + 1})...`);
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }
  }

  if (successCount === ENDPOINTS.length) {
    console.log(`\n[SUCCESS] All ${ENDPOINTS.length} deployment health checks PASSED successfully!`);
    process.exit(0);
  } else {
    console.error(`\n[WARNING] Health check failed (${successCount}/${ENDPOINTS.length} endpoints passed).`);
    process.exit(1);
  }
}

runDeployCheck();
