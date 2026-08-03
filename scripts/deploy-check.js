/**
 * 파일 : scripts/deploy-check.js
 * 내용 : CI/CD 파이프라인 무중단 배포 및 API 라우트 헬스체크 검증 스크립트
 * 수정 : 2026-07-29. 공개 루트, 정적 번들, TourAPI fallback, 공유 시나리오 복원 게이트 추가
 */

import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TARGET_HOST = process.env.DEPLOY_TARGET_HOST || "192.168.55.223";
const TARGET_PORT = process.env.DEPLOY_TARGET_PORT || "18080";
const TARGET_BASE_URL = process.env.DEPLOY_TARGET_URL || `http://${TARGET_HOST}:${TARGET_PORT}`;

const CHECKS = [
  {
    id: "public-root",
    endpoint: "/",
    validate: validatePublicRoot,
  },
  {
    id: "scenario-list",
    endpoint: "/api/scenarios",
    validate: validateScenarioList,
  },
  {
    id: "tour-area-code",
    endpoint: "/api/tour/area-code",
    validate: validateTourAreaCode,
  },
  {
    id: "scenario-detail",
    endpoint: "/api/scenarios/scen_sample_01",
    validate: validateScenarioDetail,
  },
  {
    id: "scenario-share",
    endpoint: "/api/scenarios/share/token_gn_winter_2026",
    validate: validateSharedScenario,
  },
];

function parseJson(body, endpoint) {
  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`${endpoint} returned non-JSON response`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function validateStatus(result, allowedStatuses = []) {
  assert(
    allowedStatuses.includes(result.statusCode),
    `${result.endpoint} returned HTTP ${result.statusCode}`,
  );
}

export async function validatePublicRoot(result, request) {
  validateStatus(result, [200]);
  assert(result.body.includes('id="root"'), "public root does not include React mount element");

  const assetPaths = Array.from(
    result.body.matchAll(/(?:src|href)="([^"]*\/assets\/[^"]+)"/g),
    (match) => match[1],
  );
  const scriptPath = assetPaths.find((assetPath) => assetPath.endsWith(".js"));
  const stylePath = assetPaths.find((assetPath) => assetPath.endsWith(".css"));

  assert(scriptPath, "public root does not reference a JavaScript bundle");
  assert(stylePath, "public root does not reference a CSS bundle");

  const assetResults = await Promise.all([request(scriptPath), request(stylePath)]);
  for (const assetResult of assetResults) {
    validateStatus(assetResult, [200]);
    assert(assetResult.body.length > 0, `${assetResult.endpoint} returned an empty static asset`);
  }

  return `React root + static bundle references OK (${assetPaths.length} assets)`;
}

export function validateScenarioList(result) {
  validateStatus(result, [200]);
  const payload = parseJson(result.body, result.endpoint);
  assert(Array.isArray(payload.scenarios), "scenario list does not include scenarios array");
  assert(Number.isInteger(payload.count), "scenario list does not include count");
  assert(payload.count === payload.scenarios.length, "scenario count does not match scenarios array length");
  return `${payload.count} scenario(s) listed`;
}

export function validateTourAreaCode(result) {
  if (result.statusCode >= 200 && result.statusCode < 300) {
    const payload = parseJson(result.body, result.endpoint);
    const header = payload?.response?.header;
    assert(header?.resultCode, "TourAPI proxy response does not include response.header.resultCode");
    return `TourAPI proxy response OK (resultCode ${header.resultCode})`;
  }

  validateStatus(result, [429, 502, 503, 504]);
  const payload = parseJson(result.body, result.endpoint);
  assert(payload?.error?.code, "TourAPI fallback-compatible error does not include error.code");
  return `TourAPI fallback-compatible error OK (${payload.error.code})`;
}

export function validateScenarioDetail(result) {
  validateStatus(result, [200]);
  const payload = parseJson(result.body, result.endpoint);
  assert(payload.id === "scen_sample_01", "scenario detail id does not match baseline scenario");
  assert(payload.parameters?.plan?.name, "scenario detail does not include plan parameters");
  assert(Number.isFinite(Number(payload.parameters?.selectedHour)), "scenario detail does not include selectedHour");
  return `scenario ${payload.id} restores plan "${payload.parameters.plan.name}"`;
}

export function validateSharedScenario(result) {
  validateStatus(result, [200]);
  const payload = parseJson(result.body, result.endpoint);
  assert(payload.share_token === "token_gn_winter_2026", "shared scenario token does not match baseline token");
  assert(payload.parameters?.plan?.name, "shared scenario does not include plan parameters");

  const basis = payload.parameters?.selectedFestivalBasis;
  const selectedFestivalStatus = basis?.contentId
    ? `selected festival basis preserved (${basis.contentId})`
    : "legacy scenario fallback-compatible: selectedFestivalBasis not present";

  return `share restore OK, ${selectedFestivalStatus}`;
}

function requestEndpoint(endpoint) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, TARGET_BASE_URL);
    const req = http.get(url, { timeout: 10000 }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({
          endpoint,
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          bytes: data.length,
        });
      });
    });

    req.on("error", (err) => reject(new Error(`[FAIL] ${endpoint} connection error: ${err.message}`)));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`[FAIL] ${endpoint} connection timed out after 10000ms`));
    });
  });
}

export async function runDeployCheck() {
  console.log(`[CHECK] Checking deployment health on ${TARGET_BASE_URL}...`);
  let successCount = 0;

  for (const check of CHECKS) {
    let attempts = 0;
    let success = false;

    while (attempts < 2 && !success) {
      attempts += 1;
      try {
        const result = await requestEndpoint(check.endpoint);
        const detail = await check.validate(result, requestEndpoint);
        console.log(
          `  [OK] ${check.id} ${result.endpoint} -> HTTP ${result.statusCode} (${result.bytes} bytes) | ${detail}`,
        );
        successCount += 1;
        success = true;
      } catch (error) {
        if (attempts >= 2) {
          console.error(`  [FAIL] ${check.id}: ${error.message}`);
        } else {
          console.log(`  [RETRY] ${check.id} retrying (attempt ${attempts + 1})...`);
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }
  }

  if (successCount === CHECKS.length) {
    console.log(`\n[SUCCESS] All ${CHECKS.length} deployment health checks PASSED successfully!`);
    process.exit(0);
  } else {
    console.error(`\n[WARNING] Health check failed (${successCount}/${CHECKS.length} checks passed).`);
    process.exit(1);
  }
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : "";

if (path.resolve(currentFile) === invokedFile) {
  runDeployCheck();
}
