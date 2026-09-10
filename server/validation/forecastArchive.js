import { createHash, createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, open, link, unlink } from "node:fs/promises";
import { join } from "node:path";

const digest = value => createHash("sha256").update(value).digest("hex");
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function sanitize(value, depth = 0) {
  if (depth > 25) throw new Error("Invalid snapshot nesting");
  if (typeof value === "string") return value
    .replace(/Bearer\s+[^\s"<>]+/gi, "[REDACTED]")
    .replace(/([?&](?:serviceKey|apiKey|key|token)=)[^&#\s]*/gi, "$1[REDACTED]");
  if (typeof value === "number" && !Number.isFinite(value)) throw new Error("Invalid numeric value");
  if (Array.isArray(value)) return value.map(item => sanitize(item, depth + 1));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined).map(([key, item]) => [key,
    /secret|password|authorization|cookie|api.?key|service.?key|token/i.test(key) ? "[REDACTED]" : sanitize(item, depth + 1)]));
  return value;
}
function koreaMidnight(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const utc = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(utc) && new Date(utc).toISOString().slice(0, 10) === value ? utc - 9 * 3600000 : NaN;
}
function payloadOf(input) {
  if (!input || Buffer.byteLength(JSON.stringify(input)) > 131072) throw new Error("Snapshot too large");
  const { festivalId, modelVersion, plan, forecast, datasets } = input;
  if (typeof festivalId !== "string" || !festivalId.trim() || festivalId.length > 200
    || typeof modelVersion !== "string" || !modelVersion.trim() || modelVersion.length > 100
    || !plan || !forecast || !datasets || Array.isArray(datasets) || typeof datasets !== "object"
    || !Number.isFinite(koreaMidnight(plan.startDate)) || !Number.isFinite(koreaMidnight(plan.endDate))
    || koreaMidnight(plan.endDate) < koreaMidnight(plan.startDate)
    || !Number.isFinite(forecast.expectedVisitors) || forecast.expectedVisitors < 0) throw new Error("Invalid snapshot");
  return sanitize({ festivalId, modelVersion, plan, forecast, datasets });
}

export class ForecastArchive {
  constructor({ directory, key, now = () => new Date(), maxRecords = 1000, release = "unknown" }) {
    if (!directory || typeof key !== "string" || key.length < 32) throw new Error("Archive directory and strong key required");
    this.directory = directory; this.key = key; this.now = now; this.maxRecords = maxRecords; this.release = release;
    this.pending = Promise.resolve();
  }
  signature(record) { return createHmac("sha256", this.key).update(canonical(record)).digest("hex"); }
  async read(id) {
    const parsed = JSON.parse(await readFile(join(this.directory, `${id}.json`), "utf8"));
    const { signature, ...record } = parsed;
    const expected = this.signature(record);
    if (typeof signature !== "string" || !/^[a-f0-9]{64}$/.test(signature)
      || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
      || record.id !== id || digest(canonical(record.payload)) !== id) throw new Error("Archive integrity failure");
    return record;
  }
  capture(input) {
    const operation = this.pending.then(() => this.write(input));
    this.pending = operation.catch(() => {});
    return operation;
  }
  receipt(record) {
    return { id: record.id, receivedAt: record.receivedAt, timing: record.timing, verification: record.verification };
  }
  async write(input) {
    const payload = payloadOf(input), id = digest(canonical(payload));
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    try { return this.receipt(await this.read(id)); } catch (error) { if (error.code !== "ENOENT") throw error; }
    const files = (await readdir(this.directory)).filter(name => /^[a-f0-9]{64}\.json$/.test(name));
    if (files.length >= this.maxRecords) throw new Error("Archive quota reached");
    const now = this.now();
    const record = { schemaVersion: 1, id, receivedAt: now.toISOString(), serverRelease: this.release,
      timing: now.getTime() < koreaMidnight(payload.plan.startDate) ? "pre_event_received" : "after_start_received",
      verification: "client_reported_unverified", payload };
    const temporary = join(this.directory, `.${randomUUID()}.tmp`);
    const file = await open(temporary, "wx", 0o600);
    try {
      await file.writeFile(JSON.stringify({ ...record, signature: this.signature(record) }));
      await file.sync();
    } catch (error) {
      await unlink(temporary).catch(() => {});
      throw error;
    } finally { await file.close(); }
    try {
      // Atomic create-if-absent: neither retries nor another process can overwrite a receipt.
      await link(temporary, join(this.directory, `${id}.json`));
    } catch (error) { if (error.code !== "EEXIST") throw error; }
    finally { await unlink(temporary); }
    if (process.platform !== "win32") {
      const directory = await open(this.directory, "r");
      try { await directory.sync(); } finally { await directory.close(); }
    }
    return this.receipt(await this.read(id));
  }
  async summary() {
    await this.pending;
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const names = (await readdir(this.directory)).filter(name => /^[a-f0-9]{64}\.json$/.test(name));
    const result = { archived: 0, preEvent: 0, afterStart: 0, verified: 0, corrupt: 0, quota: this.maxRecords };
    for (const name of names) {
      try {
        const record = await this.read(name.slice(0, -5));
        result.archived++;
        if (record.timing === "pre_event_received") result.preEvent++; else result.afterStart++;
      } catch { result.corrupt++; }
    }
    return result;
  }
}
