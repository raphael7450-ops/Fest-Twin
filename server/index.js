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

// Express 애플리케이션 생성 및 API 프록시 라우트 초기화 함수
export function createApp(options = {}) {
  const app = express();
  const staticDir = options.staticDir ?? path.resolve(__dirname, "../dist");

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
