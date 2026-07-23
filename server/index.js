import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSpendingProxyRouter } from "./spendingProxy.js";
import { createTrafficProxyRouter } from "./trafficProxy.js";
import { createTourProxyRouter } from "./tourProxy.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
