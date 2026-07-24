/**
 * 파일 : server/index.js
 * 내용 : Express 백엔드 서버 엔트리포인트 및 정적 파일(Vite 빌드 결과물) 서빙
 * 수정 : 2026-07-24. OpenAPI 프록시 라우트 및 SPA 정적 서빙 설정
 */

import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSpendingProxyRouter } from "./spendingProxy.js";
import { createTrafficProxyRouter } from "./trafficProxy.js";
import { createTourProxyRouter } from "./tourProxy.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// HTTP 보안 헤더(X-Content-Type-Options, X-Frame-Options, X-XSS-Protection 등) 설정 미들웨어
export function securityHeadersMiddleware(_request, response, next) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("X-XSS-Protection", "1; mode=block");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
}

// IP 기반 분당 API 요청 횟수를 제한하는 Rate Limiter 미들웨어 생성 함수
export function createRateLimiter(options = {}) {
  const windowMs = options.windowMs ?? 60 * 1000; // 1분 슬라이딩 윈도우
  const maxRequests = options.maxRequests ?? 100; // 분당 최대 100회 허용
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
      return response.status(429).json({
        error: {
          code: "TOO_MANY_REQUESTS",
          message: "Too many requests from this IP, please try again later.",
        },
      });
    }

    next();
  };
}

// Express 애플리케이션 생성 및 API 프록시 라우트 초기화 함수
export function createApp(options = {}) {
  const app = express();
  const staticDir = options.staticDir ?? path.resolve(__dirname, "../dist");

  // 1. 보안 헤더 미들웨어 전역 적용
  app.use(securityHeadersMiddleware);

  // 2. API 라우트 전용 Rate Limiter 미들웨어 적용
  const rateLimiter = options.rateLimiter ?? createRateLimiter(options.rateLimitOptions);
  app.use("/api", rateLimiter);

  app.use(
    "/api/tour",
    createTourProxyRouter({
      fetchImpl: options.fetchImpl,
      apiKey: options.apiKey,
    }),
  );
  app.use(
    "/api/traffic",
    createTrafficProxyRouter({
      fetchImpl: options.fetchImpl,
    }),
  );
  app.use(
    "/api/spending",
    createSpendingProxyRouter({
      fetchImpl: options.fetchImpl,
      apiKey: options.apiKey,
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
    console.log(`Fest-Twin server listening on port ${port}`);
  });
}
