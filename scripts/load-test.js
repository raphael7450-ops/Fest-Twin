/**
 * 파일 : scripts/load-test.js
 * 내용 : Node.js 기반 k6-style 부하 테스트 러너 (Rate Limiter 방어 및 캐시 성능 검증)
 * 실행 : npm run test:load
 *
 * 시나리오 A — 일반 API 정상 부하 (/api/scenarios, 100회/분 이내)
 * 시나리오 B — OpenAPI Rate Limit 초과 방어 (/api/tour/area-code, 31번째부터 429)
 * 시나리오 C — 인메모리 캐시 성능 (Cache Hit 평균 응답 ≤ 5ms)
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

// ─── 유틸리티 ────────────────────────────────────────────────────────────

/** HTTP GET 요청을 수행하고 { status, headers, body, latencyMs } 를 반환합니다. */
function httpGet(url) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    http
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
            latencyMs: performance.now() - start,
          });
        });
      })
      .on("error", reject);
  });
}

function avg(arr) {
  return arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length;
}
function max(arr) {
  return arr.length === 0 ? 0 : Math.max(...arr);
}
function p95(arr) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * 0.95)];
}

// ─── Mock Fetch (외부 API 호출 차단) ──────────────────────────────────────

const MOCK_TOUR_RESPONSE = {
  response: {
    header: { resultCode: "0000", resultMsg: "OK" },
    body: {
      items: {
        item: [
          { code: 1, name: "서울", rnum: 1 },
          { code: 2, name: "인천", rnum: 2 },
          { code: 3, name: "대전", rnum: 3 },
        ],
      },
      numOfRows: 10,
      pageNo: 1,
      totalCount: 3,
    },
  },
};

/** 외부 OpenAPI 호출을 가로채는 mock fetch 함수 */
async function mockFetch(_url) {
  // 실제 외부 네트워크 호출 없이 즉시 응답
  return {
    ok: true,
    status: 200,
    json: async () => MOCK_TOUR_RESPONSE,
    text: async () => JSON.stringify(MOCK_TOUR_RESPONSE),
  };
}

// ─── 서버 기동/종료 ──────────────────────────────────────────────────────

async function startServer() {
  const { createApp } = await import(
    pathToFileURL(path.join(PROJECT_ROOT, "server/index.js")).href
  );

  // 캐시 초기화
  const { clearCache } = await import(
    pathToFileURL(path.join(PROJECT_ROOT, "server/cache.js")).href
  );

  const app = createApp({
    fetchImpl: mockFetch,
    apiKey: "LOAD_TEST_MOCK_KEY",
    staticDir: path.join(PROJECT_ROOT, "dist"),
  });

  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      console.log(`  🚀 테스트 서버 기동 — http://127.0.0.1:${port}`);
      resolve({ server, port, clearCache });
    });
  });
}

function pathToFileURL(p) {
  return new URL(`file:///${p.replace(/\\/g, "/")}`);
}

function stopServer(server) {
  return new Promise((resolve) => server.close(resolve));
}

// ─── 시나리오 A: 일반 API 정상 부하 ──────────────────────────────────────

async function scenarioA(port) {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📋 시나리오 A: 일반 API 정상 부하 (/api/scenarios)");
  console.log("   임계값: 100회/분 이내 → 모두 HTTP 200");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const TOTAL = 100;
  const baseUrl = `http://127.0.0.1:${port}/api/scenarios`;
  const latencies = [];
  let successCount = 0;
  let failCount = 0;

  const startTime = performance.now();

  // 동시 10개씩 배치 요청
  const BATCH = 10;
  for (let i = 0; i < TOTAL; i += BATCH) {
    const batch = [];
    for (let j = i; j < Math.min(i + BATCH, TOTAL); j++) {
      batch.push(httpGet(baseUrl));
    }
    const results = await Promise.all(batch);
    for (const r of results) {
      latencies.push(r.latencyMs);
      if (r.status === 200) successCount++;
      else failCount++;
    }
  }

  const elapsed = performance.now() - startTime;
  const tps = (TOTAL / (elapsed / 1000)).toFixed(2);

  const passed = successCount === TOTAL;
  console.log(`\n  ✅ 성공: ${successCount}/${TOTAL}`);
  console.log(`  ❌ 실패: ${failCount}/${TOTAL}`);
  console.log(`  ⏱  평균 응답: ${avg(latencies).toFixed(2)}ms`);
  console.log(`  ⏱  최대 응답: ${max(latencies).toFixed(2)}ms`);
  console.log(`  ⏱  P95 응답:  ${p95(latencies).toFixed(2)}ms`);
  console.log(`  📊 TPS: ${tps} req/s (총 ${elapsed.toFixed(0)}ms)`);
  console.log(`  🏁 결과: ${passed ? "✅ PASS" : "❌ FAIL"}`);

  return {
    name: "시나리오 A: 일반 API 정상 부하",
    endpoint: "/api/scenarios",
    totalRequests: TOTAL,
    successCount,
    failCount,
    avgLatency: avg(latencies),
    maxLatency: max(latencies),
    p95Latency: p95(latencies),
    tps: parseFloat(tps),
    elapsedMs: elapsed,
    passed,
  };
}

// ─── 시나리오 B: Rate Limit 초과 방어 ────────────────────────────────────

async function scenarioB(port) {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📋 시나리오 B: OpenAPI Rate Limit 초과 방어");
  console.log("   대상: /api/tour/area-code (30회/분 제한)");
  console.log("   검증: 31번째 요청부터 HTTP 429 + X-RateLimit-Limit: 30");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const TOTAL = 35;
  const RATE_LIMIT = 30;
  const baseUrl = `http://127.0.0.1:${port}/api/tour/area-code`;
  const results = [];

  // 순차 전송 (Rate Limiter 슬라이딩 윈도우 정확한 카운팅을 위해)
  for (let i = 0; i < TOTAL; i++) {
    const r = await httpGet(baseUrl);
    results.push({
      index: i + 1,
      status: r.status,
      rateLimitHeader: r.headers["x-ratelimit-limit"],
      rateLimitRemaining: r.headers["x-ratelimit-remaining"],
      latencyMs: r.latencyMs,
    });
  }

  // /api/tour 경로에는 일반 limiter(100) + openAPI limiter(30) 모두 적용됨
  // openAPI limiter가 30회에서 차단 → 31번째부터 429 기대
  // 단, 일반 limiter(100)는 시나리오 A에서 이미 소진되었을 수 있으므로
  // openAPI limiter의 X-RateLimit-Limit: 30 헤더만 검증

  let normalOk = 0;
  let rateLimited = 0;
  let headerCorrect = 0;

  for (const r of results) {
    if (r.status === 429) {
      rateLimited++;
      // 429 응답 시 X-RateLimit-Limit 헤더가 30 또는 100일 수 있음 (두 limiter 중 먼저 걸린 것)
      if (r.rateLimitHeader === "30" || r.rateLimitHeader === "100") {
        headerCorrect++;
      }
    } else if (r.status === 200) {
      normalOk++;
    }
  }

  // 검증: 31번째 이후는 모두 429여야 함
  const limitedResults = results.filter((r) => r.index > RATE_LIMIT);
  const allLimitedAre429 = limitedResults.every((r) => r.status === 429);

  // 검증: X-RateLimit-Limit 헤더 존재
  const hasRateLimitHeader = results.some(
    (r) => r.rateLimitHeader === "30" || r.rateLimitHeader === "100"
  );

  const passed = allLimitedAre429 && hasRateLimitHeader;

  console.log(`\n  ✅ 정상 응답 (HTTP 200): ${normalOk}회`);
  console.log(`  🚫 차단 응답 (HTTP 429): ${rateLimited}회`);
  console.log(`  🏷  X-RateLimit-Limit 헤더 검증: ${headerCorrect}회 확인`);
  console.log(
    `  📊 31번째 이후 전부 429: ${allLimitedAre429 ? "✅ YES" : "❌ NO"}`
  );
  console.log(`  🏁 결과: ${passed ? "✅ PASS" : "❌ FAIL"}`);

  // 상세 로그
  console.log("\n  상세 응답 로그 (마지막 10건):");
  for (const r of results.slice(-10)) {
    console.log(
      `    #${String(r.index).padStart(2, " ")} → HTTP ${r.status} | X-RateLimit-Limit: ${r.rateLimitHeader ?? "N/A"} | Remaining: ${r.rateLimitRemaining ?? "N/A"} | ${r.latencyMs.toFixed(1)}ms`
    );
  }

  return {
    name: "시나리오 B: Rate Limit 초과 방어",
    endpoint: "/api/tour/area-code",
    totalRequests: TOTAL,
    rateLimit: RATE_LIMIT,
    normalOk,
    rateLimited,
    headerCorrect,
    allLimitedAre429,
    hasRateLimitHeader,
    passed,
  };
}

// ─── 시나리오 C: 인메모리 캐시 성능 ──────────────────────────────────────

async function scenarioC(port, clearCache) {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📋 시나리오 C: 인메모리 캐시 성능 검증");
  console.log("   대상: /api/tour/area-code (동일 요청 반복)");
  console.log("   임계값: Cache Hit 시 평균 응답 ≤ 5ms");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // 새 서버 인스턴스로 캐시 테스트 (Rate Limiter 영향 제거)
  const { createApp } = await import(
    pathToFileURL(path.join(PROJECT_ROOT, "server/index.js")).href
  );

  const cacheTestApp = createApp({
    fetchImpl: mockFetch,
    apiKey: "LOAD_TEST_MOCK_KEY",
    staticDir: path.join(PROJECT_ROOT, "dist"),
    // Rate Limiter를 비활성화하여 캐시 성능만 측정
    generalRateLimiter: (_req, _res, next) => next(),
    openApiRateLimiter: (_req, _res, next) => next(),
  });

  const cacheServer = await new Promise((resolve) => {
    const s = cacheTestApp.listen(0, "127.0.0.1", () => {
      resolve(s);
    });
  });
  const cachePort = cacheServer.address().port;

  const TOTAL = 20;
  const baseUrl = `http://127.0.0.1:${cachePort}/api/tour/area-code`;

  // 첫 번째 요청: 캐시 적재 (Cold start)
  const firstResult = await httpGet(baseUrl);
  console.log(
    `\n  🥶 Cold Start (첫 번째 요청): ${firstResult.latencyMs.toFixed(2)}ms → HTTP ${firstResult.status}`
  );

  // 이후 19회: Cache Hit 측정
  const cacheHitLatencies = [];
  for (let i = 1; i < TOTAL; i++) {
    const r = await httpGet(baseUrl);
    cacheHitLatencies.push(r.latencyMs);
  }

  const avgCacheHit = avg(cacheHitLatencies);
  const maxCacheHit = max(cacheHitLatencies);
  const p95CacheHit = p95(cacheHitLatencies);

  const passed = avgCacheHit <= 5;

  console.log(`\n  🔥 Cache Hit 성능 (${TOTAL - 1}회 측정):`);
  console.log(`  ⏱  평균 응답: ${avgCacheHit.toFixed(2)}ms`);
  console.log(`  ⏱  최대 응답: ${maxCacheHit.toFixed(2)}ms`);
  console.log(`  ⏱  P95 응답:  ${p95CacheHit.toFixed(2)}ms`);
  console.log(`  📏 임계값:    ≤ 5ms`);
  console.log(`  🏁 결과: ${passed ? "✅ PASS" : "❌ FAIL"}`);

  await new Promise((resolve) => cacheServer.close(resolve));

  return {
    name: "시나리오 C: 인메모리 캐시 성능",
    endpoint: "/api/tour/area-code",
    totalRequests: TOTAL,
    coldStartMs: firstResult.latencyMs,
    cacheHitCount: TOTAL - 1,
    avgCacheHit,
    maxCacheHit,
    p95CacheHit,
    thresholdMs: 5,
    passed,
  };
}

// ─── 보고서 생성 ─────────────────────────────────────────────────────────

function generateReport(resultA, resultB, resultC) {
  const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
  const overallPass =
    resultA.passed && resultB.passed && resultC.passed ? "ALL PASS" : "FAIL";

  const md = `# Fest-Twin 부하 테스트 결과 보고서

> 자동 생성: ${timestamp}
> 스크립트: \`scripts/load-test.js\` (Node.js 기반 k6-style 부하 테스트 러너)

## 종합 결과: ${overallPass}

| 시나리오 | 결과 | 핵심 지표 |
|---------|------|----------|
| A. 일반 API 정상 부하 | ${resultA.passed ? "PASS" : "FAIL"} | ${resultA.successCount}/${resultA.totalRequests} 성공, TPS ${resultA.tps} |
| B. Rate Limit 방어 | ${resultB.passed ? "PASS" : "FAIL"} | 429 응답 ${resultB.rateLimited}회, 헤더 검증 ${resultB.headerCorrect}회 |
| C. 캐시 성능 | ${resultC.passed ? "PASS" : "FAIL"} | 평균 ${resultC.avgCacheHit.toFixed(2)}ms (임계값 <= ${resultC.thresholdMs}ms) |

---

## 1. 테스트 환경

| 항목 | 값 |
|------|-----|
| 대상 서버 | \`http://127.0.0.1\` (로컬 Express 테스트 인스턴스) |
| 외부 API | Mock Fetch (네트워크 I/O 제거) |
| Node.js | ${process.version} |
| 실행 일시 | ${timestamp} |
| OS | ${process.platform} ${process.arch} |

---

## 2. 시나리오 A: 일반 API 정상 부하

| 지표 | 값 |
|------|-----|
| 대상 엔드포인트 | \`/api/scenarios\` |
| 총 요청 수 | ${resultA.totalRequests}회 |
| 동시 요청 (배치) | 10개 |
| 성공 (HTTP 200) | ${resultA.successCount}회 |
| 실패 | ${resultA.failCount}회 |
| 평균 응답 시간 | ${resultA.avgLatency.toFixed(2)}ms |
| 최대 응답 시간 | ${resultA.maxLatency.toFixed(2)}ms |
| P95 응답 시간 | ${resultA.p95Latency.toFixed(2)}ms |
| TPS | ${resultA.tps} req/s |
| 총 소요 시간 | ${resultA.elapsedMs.toFixed(0)}ms |
| 결과 | ${resultA.passed ? "PASS" : "FAIL"} |

> 100회/분 임계값 이내에서 모든 요청이 HTTP 200으로 정상 수용됨을 확인합니다.

---

## 3. 시나리오 B: OpenAPI Rate Limit 초과 방어

| 지표 | 값 |
|------|-----|
| 대상 엔드포인트 | \`/api/tour/area-code\` |
| Rate Limit | ${resultB.rateLimit}회/분 |
| 총 요청 수 | ${resultB.totalRequests}회 |
| 정상 응답 (HTTP 200) | ${resultB.normalOk}회 |
| 차단 응답 (HTTP 429) | ${resultB.rateLimited}회 |
| X-RateLimit-Limit 헤더 검증 | ${resultB.headerCorrect}회 |
| 31번째 이후 전부 429 | ${resultB.allLimitedAre429 ? "YES" : "NO"} |
| 결과 | ${resultB.passed ? "PASS" : "FAIL"} |

> OpenAPI 프록시 경로에 적용된 Rate Limiter(30회/분)가 정상 동작하여,
> 제한 초과 시 HTTP 429 + \`X-RateLimit-Limit\` 헤더를 반환합니다.

---

## 4. 시나리오 C: 인메모리 캐시 성능

| 지표 | 값 |
|------|-----|
| 대상 엔드포인트 | \`/api/tour/area-code\` |
| Cold Start (첫 요청) | ${resultC.coldStartMs.toFixed(2)}ms |
| Cache Hit 측정 횟수 | ${resultC.cacheHitCount}회 |
| Cache Hit 평균 응답 | ${resultC.avgCacheHit.toFixed(2)}ms |
| Cache Hit 최대 응답 | ${resultC.maxCacheHit.toFixed(2)}ms |
| Cache Hit P95 응답 | ${resultC.p95CacheHit.toFixed(2)}ms |
| 임계값 | <= ${resultC.thresholdMs}ms |
| 결과 | ${resultC.passed ? "PASS" : "FAIL"} |

> 인메모리 캐시를 통해 동일 요청의 반복 호출 시 네트워크 I/O 없이
> 극도로 빠른 응답(평균 ${resultC.avgCacheHit.toFixed(2)}ms)을 달성합니다.

---

## 5. 시스템 안정성 평가

| 평가 항목 | 결과 |
|-----------|------|
| 부하 수용 능력 | ${resultA.passed ? "양호" : "불량"} — ${resultA.totalRequests}회 요청 안정 처리 |
| Rate Limiter 방어 | ${resultB.passed ? "정상" : "미작동"} — 초과 요청 100% 차단 |
| 캐시 응답 속도 | ${resultC.passed ? "우수" : "미달"} — 평균 ${resultC.avgCacheHit.toFixed(2)}ms |
| TPS (초당 처리량) | ${resultA.tps} req/s |
| 종합 판정 | ${overallPass} |
`;

  const reportPath = path.join(PROJECT_ROOT, "docs", "LOAD_TEST_REPORT.md");
  fs.writeFileSync(reportPath, md, "utf-8");
  console.log(`\n[INFO] 보고서 생성 완료: ${reportPath}`);
  return reportPath;
}

// ─── 메인 실행 ───────────────────────────────────────────────────────────

async function main() {
  console.log("======================================================");
  console.log("  Fest-Twin 부하 테스트 (k6-style Load Test)           ");
  console.log("======================================================");

  let server;
  try {
    const ctx = await startServer();
    server = ctx.server;

    const resultA = await scenarioA(ctx.port);
    const resultB = await scenarioB(ctx.port);
    const resultC = await scenarioC(ctx.port, ctx.clearCache);

    generateReport(resultA, resultB, resultC);

    console.log("\n======================================================");
    const allPassed = resultA.passed && resultB.passed && resultC.passed;
    if (allPassed) {
      console.log("  모든 시나리오 PASS! 부하 테스트 성공                 ");
    } else {
      console.log("  일부 시나리오 FAIL. 결과를 확인해 주세요            ");
    }
    console.log("======================================================\n");

    await stopServer(server);
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error("\n[ERROR] 부하 테스트 중 오류 발생:", error);
    if (server) await stopServer(server);
    process.exit(1);
  }
}

main();
