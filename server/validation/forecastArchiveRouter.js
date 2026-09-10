import { Router } from "express";
import { readFile } from "node:fs/promises";
import { ForecastArchive } from "./forecastArchive.js";
import { evaluateVisitors } from "./visitorEvaluation.js";

export function createForecastArchiveRouter(options = {}) {
  const router = Router();
  let store = options.store, storePromise, summaryCache;
  const origins = options.origins ?? (process.env.FORECAST_ARCHIVE_ORIGINS ?? "").split(",").filter(Boolean);
  async function storage() {
    if (store) return store;
    if (!process.env.FORECAST_ARCHIVE_DIR || !process.env.FORECAST_ARCHIVE_KEY_FILE) throw new Error("Archive disabled");
    if (!storePromise) storePromise = readFile(process.env.FORECAST_ARCHIVE_KEY_FILE, "utf8").then(key => {
      store = new ForecastArchive({ directory: process.env.FORECAST_ARCHIVE_DIR, key: key.trim(), release: process.env.FORECAST_ARCHIVE_RELEASE });
      return store;
    }).catch(error => { storePromise = undefined; throw error; });
    return storePromise;
  }
  router.post("/", async (req, res) => {
    if (!origins.includes(req.headers.origin)) return res.status(403).json({ error: "ARCHIVE_ORIGIN_DENIED" });
    try {
      const archive = await storage();
      const receipt = await archive.capture(req.body);
      summaryCache = undefined;
      return res.status(201).json(receipt);
    } catch (error) {
      const message = error.message;
      const status = /Invalid|too large/.test(message) ? 400 : /quota/.test(message) ? 507 : 503;
      return res.status(status).json({ error: status === 400 ? "INVALID_SNAPSHOT" : "ARCHIVE_UNAVAILABLE" });
    }
  });
  router.get("/status", async (_req, res) => {
    try {
      if (summaryCache && Date.now() - summaryCache.at < 60000) return res.json(summaryCache.value);
      const archive = await storage();
      const document = options.evidence ?? JSON.parse(await readFile(new URL("../../data/visitor_evaluation.json", import.meta.url), "utf8"));
      const evaluation = evaluateVisitors(document);
      const value = { archive: await archive.summary(), evaluation: {
        status: evaluation.status, comparable: evaluation.accepted.length, excluded: evaluation.excluded.length,
        unmatchedActuals: evaluation.unmatchedActualIds.length, actualIssues: evaluation.actualIssues, groups: evaluation.groups,
      } };
      summaryCache = { at: Date.now(), value };
      return res.json(value);
    } catch { return res.status(503).json({ error: "ARCHIVE_UNAVAILABLE" }); }
  });
  return router;
}
