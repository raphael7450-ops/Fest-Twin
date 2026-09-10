// @vitest-environment node
import express from "express";
import { expect, it, vi } from "vitest";
import { createForecastArchiveRouter } from "./forecastArchiveRouter.js";

async function withServer(options, action) {
  const app = express(); app.use(express.json()); app.use(createForecastArchiveRouter(options));
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.on("listening", resolve));
  try { await action(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
it("denies absent and unrelated origins without touching storage", async () => {
  const store = { capture: vi.fn() };
  await withServer({ store, origins: ["https://trusted.example"] }, async url => {
    for (const origin of [undefined, "https://unrelated.ts.net"]) {
      const response = await fetch(url, { method: "POST", headers: origin ? { Origin: origin } : {} });
      expect(response.status).toBe(403);
    }
    expect(store.capture).not.toHaveBeenCalled();
  });
});
it("returns receipt and independent evaluator results, not archive-based accuracy", async () => {
  const store = { capture: vi.fn(async () => ({ id: "test", verification: "client_reported_unverified" })),
    summary: vi.fn(async () => ({ archived: 3, verified: 0 })) };
  await withServer({ store, origins: ["https://trusted.example"], evidence: { actuals: [], inputs: [], predictions: [] } }, async url => {
    expect((await fetch(url, { method: "POST", headers: { Origin: "https://trusted.example", "Content-Type": "application/json" }, body: "{}" })).status).toBe(201);
    const status = await (await fetch(`${url}/status`)).json();
    expect(status.evaluation).toMatchObject({ status: "INSUFFICIENT_EVIDENCE", comparable: 0, groups: [] });
    expect(status.archive.archived).toBe(3);
  });
});
it("returns a generic unavailable error instead of leaking filesystem or key details", async () => {
  await withServer({ store: { capture: async () => { throw new Error("secret /private/key"); } }, origins: ["https://trusted.example"] }, async url => {
    const response = await fetch(url, { method: "POST", headers: { Origin: "https://trusted.example" } });
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private");
  });
});
