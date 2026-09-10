// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ForecastArchive } from "./forecastArchive.js";

const dirs = [];
afterEach(async () => { for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true }); });
const snapshot = () => ({ festivalId: "festival-a", modelVersion: "phase1-v1", createdAt: "2099-01-01T00:00:00Z",
  plan: { name: "Fixture", startDate: "2026-10-01", endDate: "2026-10-02" },
  forecast: { expectedVisitors: 100, visitorsByHour: [{ hour: 15, visitors: 40 }] },
  datasets: { tourism: { status: "supplemented", value: { source: "test" } } } });
async function setup(options = {}) {
  const directory = await mkdtemp(join(tmpdir(), "forecast-archive-")); dirs.push(directory);
  return { directory, archive: new ForecastArchive({ directory, key: "a".repeat(64), now: () => new Date("2026-09-10T12:00:00Z"), ...options }) };
}
describe("forecast archive", () => {
  it("uses server time and keeps an unverified receipt, never a validated forecast", async () => {
    const { archive } = await setup();
    const result = await archive.capture(snapshot());
    expect(result).toMatchObject({ receivedAt: "2026-09-10T12:00:00.000Z", timing: "pre_event_received", verification: "client_reported_unverified" });
    expect(await archive.summary()).toMatchObject({ archived: 1, preEvent: 1, verified: 0, corrupt: 0 });
  });
  it("deduplicates concurrent identical captures and preserves original receipt across restart", async () => {
    const { archive, directory } = await setup();
    const records = await Promise.all([archive.capture(snapshot()), archive.capture(snapshot())]);
    expect(records[0].id).toBe(records[1].id);
    const restarted = new ForecastArchive({ directory, key: "a".repeat(64) });
    expect(await restarted.capture(snapshot())).toMatchObject({ id: records[0].id, receivedAt: records[0].receivedAt });
  });
  it("classifies event-day receipts using midnight Korea time, ignoring backdated client dates", async () => {
    const { archive } = await setup({ now: () => new Date("2026-09-30T15:00:00Z") });
    expect((await archive.capture(snapshot())).timing).toBe("after_start_received");
  });
  it("detects tampering and does not overwrite the corrupt record", async () => {
    const { archive, directory } = await setup();
    const receipt = await archive.capture(snapshot());
    const file = join(directory, `${receipt.id}.json`);
    const record = JSON.parse(await readFile(file, "utf8")); record.payload.forecast.expectedVisitors = 999;
    await writeFile(file, JSON.stringify(record));
    expect(await archive.summary()).toMatchObject({ archived: 0, corrupt: 1 });
    await expect(archive.capture(snapshot())).rejects.toThrow(/integrity/i);
  });
  it("rejects malformed dates, oversized inputs and missing keys", async () => {
    const { archive } = await setup(); const input = snapshot(); input.plan.startDate = "2026-02-30";
    await expect(archive.capture(input)).rejects.toThrow(/invalid/i);
    input.plan.startDate = "2026-10-01"; input.plan.name = "x".repeat(140000);
    await expect(archive.capture(input)).rejects.toThrow(/large/i);
    expect(() => new ForecastArchive({ directory: "/unused", key: "" })).toThrow(/key/i);
  });
  it("redacts secrets and enforces a bounded archive without deleting older records", async () => {
    const { archive, directory } = await setup({ maxRecords: 1 });
    const input = snapshot(); input.datasets.secret = "private";
    const record = await archive.capture(input);
    expect(await readFile(join(directory, `${record.id}.json`), "utf8")).not.toContain("private");
    input.forecast.expectedVisitors = 101;
    await expect(archive.capture(input)).rejects.toThrow(/quota/i);
    expect((await archive.summary()).archived).toBe(1);
  });
});
