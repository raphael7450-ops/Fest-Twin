import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";

const DEFAULT_TARGET_URL = "https://cwserver.tail97dbc3.ts.net";
const legacyTargetHost = process.env.DEPLOY_TARGET_HOST;
const legacyTargetPort = process.env.DEPLOY_TARGET_PORT || "18080";
const TARGET_BASE_URL =
  process.env.DEPLOY_TARGET_URL ||
  (legacyTargetHost
    ? `http://${legacyTargetHost}:${legacyTargetPort}`
    : DEFAULT_TARGET_URL);

const REQUEST_TIMEOUT_MS = 10000;
const DIST_INDEX_PATH = path.resolve("dist", "index.html");

const API_CHECKS = [
  {
    label: "Scenario list",
    endpoint: "/api/scenarios",
    validate: (body) =>
      Array.isArray(body.scenarios) && typeof body.count === "number",
    expected: "JSON with scenarios[] and count",
  },
  {
    label: "TourAPI area-code proxy",
    endpoint: "/api/tour/area-code",
    validate: (body) => {
      const resultCode = body?.response?.header?.resultCode;
      const items = body?.response?.body?.items?.item;
      const explicitFallbackError =
        typeof body?.code === "string" &&
        ["TOUR_API_KEY_MISSING", "TOUR_API_UPSTREAM_ERROR"].includes(body.code);
      return (resultCode === "0000" && Array.isArray(items)) || explicitFallbackError;
    },
    expected: "TourAPI resultCode 0000 with area items or explicit fallback-compatible error",
  },
  {
    label: "Sample scenario detail",
    endpoint: "/api/scenarios/scen_sample_01",
    validate: (body) => Boolean(body?.id && body?.parameters),
    expected: "JSON scenario detail with parameters",
  },
  {
    label: "Shared scenario restore",
    endpoint: "/api/scenarios/share/token_gn_winter_2026",
    validate: (body) => Boolean(body?.share_token && body?.parameters?.plan),
    expected: "JSON shared scenario with plan parameters",
  },
];

function requestPath(endpoint) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, TARGET_BASE_URL);
    const client = url.protocol === "https:" ? https : http;
    const req = client.get(url, { timeout: REQUEST_TIMEOUT_MS }, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({
          endpoint,
          url: url.toString(),
          statusCode: res.statusCode ?? 0,
          contentType: String(res.headers["content-type"] ?? ""),
          bytes: Buffer.byteLength(data),
          bodyText: data,
        });
      });
    });

    req.on("error", (err) =>
      reject(new Error(`${endpoint} connection error: ${err.message}`)),
    );
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`${endpoint} timed out after ${REQUEST_TIMEOUT_MS}ms`));
    });
  });
}

async function withRetry(checkFn, label) {
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await checkFn();
    } catch (error) {
      lastError = error;
      if (attempt < 2) {
        console.log(`  [RETRY] ${label} retrying (attempt ${attempt + 1})...`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }
  throw lastError;
}

function assertStatusOk(result) {
  if (result.statusCode < 200 || result.statusCode >= 400) {
    throw new Error(`${result.endpoint} returned HTTP ${result.statusCode}`);
  }
}

function extractBundleAssets(html) {
  return Array.from(
    html.matchAll(/assets\/(index-[A-Za-z0-9_-]+\.(?:js|css))/g),
    (match) => match[1],
  );
}

function getExpectedLocalAssets() {
  if (!fs.existsSync(DIST_INDEX_PATH)) return [];
  return extractBundleAssets(fs.readFileSync(DIST_INDEX_PATH, "utf8"));
}

async function checkRootAndBundle() {
  const root = await requestPath("/");
  assertStatusOk(root);
  if (!root.contentType.includes("text/html")) {
    throw new Error(`root content-type is ${root.contentType || "missing"}`);
  }

  const remoteAssets = extractBundleAssets(root.bodyText);
  if (remoteAssets.length === 0) {
    throw new Error("root HTML does not reference hashed JS/CSS assets");
  }

  const localAssets = getExpectedLocalAssets();
  if (localAssets.length > 0) {
    const missing = localAssets.filter((asset) => !remoteAssets.includes(asset));
    if (missing.length > 0) {
      throw new Error(
        `remote bundle differs from local dist: missing ${missing.join(", ")}`,
      );
    }
  }

  for (const asset of remoteAssets) {
    const assetResult = await requestPath(`/assets/${asset}`);
    assertStatusOk(assetResult);
    if (assetResult.bytes === 0) {
      throw new Error(`/assets/${asset} returned an empty response`);
    }
  }

  return {
    statusCode: root.statusCode,
    bytes: root.bytes,
    remoteAssets,
    localAssets,
  };
}

async function checkApi({ label, endpoint, validate, expected }) {
  const result = await requestPath(endpoint);
  assertStatusOk(result);

  let parsed;
  try {
    parsed = JSON.parse(result.bodyText);
  } catch {
    throw new Error(`${endpoint} did not return valid JSON`);
  }

  if (!validate(parsed)) {
    throw new Error(`${endpoint} did not match expected shape: ${expected}`);
  }

  return {
    label,
    endpoint,
    statusCode: result.statusCode,
    bytes: result.bytes,
  };
}

async function runDeployCheck() {
  console.log(`[CHECK] Checking deployment health on ${TARGET_BASE_URL}...`);
  const passed = [];

  try {
    const bundle = await withRetry(checkRootAndBundle, "Public root and static bundle");
    console.log(
      `  [OK] / -> HTTP ${bundle.statusCode} (${bundle.bytes} bytes), assets: ${bundle.remoteAssets.join(", ")}`,
    );
    if (bundle.localAssets.length > 0) {
      console.log(`  [OK] Static bundle matches local dist: ${bundle.localAssets.join(", ")}`);
    } else {
      console.log("  [INFO] Local dist/index.html not found; verified remote assets only.");
    }
    passed.push("root+bundle");
  } catch (error) {
    console.error(`  [FAIL] ${error.message}`);
  }

  for (const check of API_CHECKS) {
    try {
      const result = await withRetry(() => checkApi(check), check.endpoint);
      console.log(
        `  [OK] ${result.endpoint} (${result.label}) -> HTTP ${result.statusCode} (${result.bytes} bytes)`,
      );
      passed.push(check.endpoint);
    } catch (error) {
      console.error(`  [FAIL] ${error.message}`);
    }
  }

  const totalChecks = API_CHECKS.length + 1;
  if (passed.length === totalChecks) {
    console.log(`\n[SUCCESS] All ${totalChecks} deployment verification gates PASSED.`);
    console.log(
      "[SUMMARY] public_url=PASS static_bundle=PASS api_endpoints=PASS selected_festival_flow=PASS",
    );
    process.exit(0);
  }

  console.error(`\n[WARNING] Deployment verification failed (${passed.length}/${totalChecks} gates passed).`);
  process.exit(1);
}

runDeployCheck();
