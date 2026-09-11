// @vitest-environment node
import { expect, it } from "vitest";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

it("writes a no-evidence report and exits 2 without inventing a forecast", async () => {
  const directory = await mkdtemp(join(tmpdir(), "visitor-replay-test-"));
  try {
    const input = join(directory, "input.json"), output = join(directory, "output.json");
    await writeFile(input, JSON.stringify({ actuals: [], inputs: [], predictions: [] }));
    const result = spawnSync(process.execPath, ["scripts/replay-visitor-forecasts.mjs", input, output], { encoding: "utf8", timeout: 30000 });
    expect(result.status, result.stderr).toBe(2);
    expect(result.stderr).not.toContain("Failed to scan");
    const report = JSON.parse(await readFile(output, "utf8"));
    expect(report).toMatchObject({ status: "INSUFFICIENT_EVIDENCE", generatedPredictions: [], benchmarks: [] });
    expect(report.modelFingerprint).toMatch(/^[0-9a-f]{64}$/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
