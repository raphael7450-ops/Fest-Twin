/**
 * 파일 : server/index.js
 * 내용 : Express 백엔드 서버 엔트리포인트 (Rate Limiter, Helmet/CSP, CORS Allowlist & SPA 정적 서빙)
 * 수정 : 2026-08-05. 기상청 단기예보 프록시 라우터 (/api/weather) 마운트
 */

import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSpendingProxyRouter } from "./spendingProxy.js";
import { createTrafficProxyRouter } from "./trafficProxy.js";
import { createTourProxyRouter } from "./tourProxy.js";
import { createTrendProxyRouter } from "./trendProxy.js";
import { createScenarioRouter } from "./scenarioRouter.js";
import { createRegionalFestivalRouter } from "./regionalFestivalRouter.js";
import { createWeatherProxyRouter } from "./weatherProxy.js";
import { createTransitProxyRouter } from "./transitProxy.js";
import { createCommercialProxyRouter } from "./commercialProxy.js";
import { createEmergencyProxyRouter } from "./emergencyProxy.js";
import { createCityParkProxyRouter } from "./cityParkProxy.js";
import { createVWorldProxyRouter } from "./vworldProxy.js";
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

  let isAllowed = false;
  try {
    const parsed = new URL(origin);
    const host = parsed.hostname;
    isAllowed =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "192.168.55.223" ||
      host === "100.104.94.112" ||
      host.endsWith(".ts.net");
  } catch {
    isAllowed = false;
  }

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
  response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  response.setHeader("Permissions-Policy", "geolocation=(), camera=(), microphone=()");
  response.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://map.vworld.kr https://*.vworld.kr; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://map.vworld.kr https://*.vworld.kr; img-src 'self' data: blob: https: https://map.vworld.kr https://*.vworld.kr; font-src 'self' https://fonts.gstatic.com https://map.vworld.kr https://*.vworld.kr; connect-src 'self' https://apis.data.go.kr https://viewt.ktdb.go.kr https://map.vworld.kr https://*.vworld.kr;",
  );
  next();
}

function apiNoStoreMiddleware(request, response, next) {
  delete request.headers["if-none-match"];
  delete request.headers["if-modified-since"];
  response.setHeader("Cache-Control", "no-store, max-age=0");
  response.setHeader("Pragma", "no-cache");
  response.setHeader("Expires", "0");
  next();
}

// 3. IP 기반 슬라이딩 윈도우 Rate Limiter 생성 함수
export function createRateLimiter(options = {}) {
  const windowMs = options.windowMs ?? 60 * 1000;
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

  app.use("/api", apiNoStoreMiddleware);

  // 1. 일반 API 라우트 (/api/scenarios 등)
  app.use("/api", generalRateLimiter);

  // 2. 외부 OpenAPI 중계 라우트 (/api/tour, /api/spending, /api/traffic, /api/trends, /api/weather)
  app.use("/api/tour", openApiRateLimiter);
  app.use("/api/spending", openApiRateLimiter);
  app.use("/api/traffic", openApiRateLimiter);
  app.use("/api/trends", openApiRateLimiter);
  app.use("/api/weather", openApiRateLimiter);
  app.use("/api/transit", openApiRateLimiter);
  app.use("/api/commercial", openApiRateLimiter);
  app.use("/api/emergency", openApiRateLimiter);
  app.use("/api/city-parks", openApiRateLimiter);
  app.use("/api/vworld", openApiRateLimiter);

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
    "/api/transit",
    createTransitProxyRouter({
      fetchImpl: options.fetchImpl,
      apiKey: options.publicTransitApiKey,
      logger: log,
    }),
  );
  app.use(
    "/api/commercial",
    createCommercialProxyRouter({
      fetchImpl: options.fetchImpl,
      apiKey: options.commercialApiKey,
      logger: log,
    }),
  );
  app.use(
    "/api/emergency",
    createEmergencyProxyRouter({
      fetchImpl: options.fetchImpl,
      apiKey: options.emergencyApiKey,
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
    "/api/weather",
    createWeatherProxyRouter({
      fetchImpl: options.fetchImpl,
      apiKey: options.weatherApiKey,
      logger: log,
    }),
  );
  app.use(
    "/api/city-parks",
    createCityParkProxyRouter({
      fetchImpl: options.fetchImpl,
      apiKey: options.cityParkApiKey,
      logger: log,
    }),
  );
  app.use(
    "/api/vworld",
    createVWorldProxyRouter({
      fetchImpl: options.fetchImpl,
      apiKey: options.vworldApiKey,
      logger: log,
    }),
  );
  app.use("/api/regional-festivals", createRegionalFestivalRouter({ db: options.regionalFestivalDb }));

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
