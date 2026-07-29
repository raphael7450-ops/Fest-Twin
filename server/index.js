/**
 * 파일 : server/index.js
 * 내용 : Express 백엔드 서버 엔트리포인트 (Rate Limiter, Helmet/CSP, CORS Allowlist & SPA 정적 서빙)
 * 수정 : 2026-07-29. 공개 데모 후보 조회 흐름을 고려한 환경변수 기반 Rate Limit 조정
 */

import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSpendingProxyRouter } from "./spendingProxy.js";
import { createTrafficProxyRouter } from "./trafficProxy.js";
import { createTourProxyRouter } from "./tourProxy.js";
import { createTrendProxyRouter } from "./trendProxy.js";
import { createScenarioRouter } from "./scenarioRouter.js";
import { logger as defaultLogger, auditLogger as defaultAuditLogger, noopLogger } from "./logger.js";
import { createHttpLoggerMiddleware } from "./middleware/httpLogger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_GENERAL_RATE_LIMIT = 300;
const DEFAULT_OPEN_API_RATE_LIMIT = 120;

function readPositiveIntegerEnv(name, fallback) {
  const rawValue = process.env[name];
  if (!rawValue) return fallback;

  const parsed = Number(rawValue);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

// 1. CORS Allowlist 허용 도메인 검증 미들웨어
export function corsMiddleware(request, response, next) {
  const origin = request.headers.origin;
  if (!origin) {
    return next();
  }

  const isAllowed =
    origin.includes("localhost") ||
    origin.includes("127.0.0.1") ||
    origin.includes("192.168.55.223") ||
    /\.ts\.net$/.test(new URL(origin).hostname);

  if (isAllowed) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  if (request.method === "OPTIONS") {
    return response.status(204).end();
  }

  next();
}

// 2. OWASP HTTP 보안 헤더 및 Content-Security-Policy (CSP) 미들웨어
export function securityHeadersMiddleware(_request, response, next) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("X-XSS-Protection", "1; mode=block");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://oapi.map.naver.com https://openapi.map.naver.com https://ncp-docs.map.naver.com https://*.map.naver.com https://*.naver.com https://*.naver.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https: https://*.map.naver.com https://*.naver.com https://*.naver.net; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://apis.data.go.kr https://viewt.ktdb.go.kr https://oapi.map.naver.com https://openapi.map.naver.com https://*.map.naver.com https://*.naver.com https://*.naver.net;",
  );
  next();
}

// 3. IP 기반 슬라이딩 윈도우 Rate Limiter 생성 함수
export function createRateLimiter(options = {}) {
  const windowMs = options.windowMs ?? 60 * 1000; // 1분 슬라이딩 윈도우
  const maxRequests = options.maxRequests ?? 100;
  const auditLog = options.auditLogger ?? noopLogger;
  const requestCounts = new Map();

  return (request, response, next) => {
    const ip = request.ip || request.socket?.remoteAddress || "unknown";
    const now = Date.now();
    const record = requestCounts.get(ip) || { count: 0, resetTime: now + windowMs };

    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + windowMs;
    }

    record.count += 1;
    requestCounts.set(ip, record);

    response.setHeader("X-RateLimit-Limit", maxRequests);
    response.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - record.count));

    if (record.count > maxRequests) {
      // B2G Audit: Rate Limit 초과 차단 기록
      auditLog.warn("rate_limit_exceeded", {
        event: "RATE_LIMIT_429",
        ip,
        endpoint: request.originalUrl || request.url,
        limit: maxRequests,
        count: record.count,
      });

      return response.status(429).json({
        error: {
          code: "TOO_MANY_REQUESTS",
          message: `Too many requests from this IP, please try again later. (Limit: ${maxRequests}/min)`,
        },
      });
    }

    next();
  };
}

// Express 애플리케이션 생성 및 미들웨어/라우트 초기화
export function createApp(options = {}) {
  const app = express();
  const staticDir = options.staticDir ?? path.resolve(__dirname, "../dist");
  const log = options.logger ?? defaultLogger;
  const auditLog = options.auditLogger ?? defaultAuditLogger;

  // 보안 미들웨어 등록
  app.use(securityHeadersMiddleware);
  app.use(corsMiddleware);
  app.use(express.json({ limit: "1mb" }));

  // Morgan HTTP 요청 로깅 미들웨어 (테스트 환경에서는 skip)
  if (!options.disableHttpLogging) {
    app.use(createHttpLoggerMiddleware({ logger: log }));
  }

  // Rate Limiting (테스트 환경에서는 옵션으로 오버라이드 가능)
  const defaultGeneralLimit = readPositiveIntegerEnv(
    "GENERAL_RATE_LIMIT_MAX",
    DEFAULT_GENERAL_RATE_LIMIT,
  );
  const defaultOpenApiLimit = readPositiveIntegerEnv(
    "OPEN_API_RATE_LIMIT_MAX",
    DEFAULT_OPEN_API_RATE_LIMIT,
  );
  const generalRateLimiter =
    options.generalRateLimiter ?? createRateLimiter({
      ...(options.generalRateLimitOptions ?? { maxRequests: defaultGeneralLimit }),
      auditLogger: auditLog,
    });
  const openApiRateLimiter =
    options.openApiRateLimiter ?? createRateLimiter({
      ...(options.openApiRateLimitOptions ?? { maxRequests: defaultOpenApiLimit }),
      auditLogger: auditLog,
    });

  // 1. 일반 API 라우트 (/api/scenarios 등)
  app.use("/api", generalRateLimiter);

  // 2. 외부 OpenAPI 중계 라우트 (/api/tour, /api/spending, /api/traffic)
  app.use("/api/tour", openApiRateLimiter);
  app.use("/api/spending", openApiRateLimiter);
  app.use("/api/traffic", openApiRateLimiter);
  app.use("/api/trends", openApiRateLimiter);

  app.use(
    "/api/tour",
    createTourProxyRouter({
      fetchImpl: options.fetchImpl,
      apiKey: options.apiKey,
      logger: log,
      auditLogger: auditLog,
    }),
  );
  app.use(
    "/api/traffic",
    createTrafficProxyRouter({
      fetchImpl: options.fetchImpl,
      logger: log,
    }),
  );
  app.use(
    "/api/spending",
    createSpendingProxyRouter({
      fetchImpl: options.fetchImpl,
      apiKey: options.apiKey,
      logger: log,
    }),
  );
  app.use(
    "/api/trends",
    createTrendProxyRouter({
      fetchImpl: options.fetchImpl,
      clientId: options.naverDataLabClientId,
      clientSecret: options.naverDataLabClientSecret,
      logger: log,
    }),
  );
  app.use(
    "/api/scenarios",
    createScenarioRouter({
      db: options.scenarioDb,
      auditLogger: auditLog,
    }),
  );

  app.use(express.static(staticDir));
  app.get("/{*splat}", (_request, response) => {
    response.sendFile(path.join(staticDir, "index.html"));
  });

  return app;
}

if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT ?? 80);
  createApp().listen(port, "0.0.0.0", () => {
    defaultLogger.info(`Fest-Twin server listening on port ${port}`);
  });
}
