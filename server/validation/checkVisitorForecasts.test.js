// @vitest-environment node
import { afterEach, expect, it } from "vitest";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { runVisitorEvaluation } from "./checkVisitorForecasts.js";

const directories = [];
afterEach(async () => { for (const dir of directories.splice(0)) await rm(dir, { recursive: true, force: true }); });

it("persists an honest insufficient-evidence report and returns CLI exit 2", async () => {
  const dir = await mkdtemp(join(tmpdir(), "visitor-evaluation-")); directories.push(dir);
  const input = join(dir, "input.json"), output = join(dir, "report.json");
  await writeFile(input, JSON.stringify({ actuals: [], predictions: [], inputs: [] }));
  const execution = spawnSync(process.execPath, ["server/validation/checkVisitorForecasts.js", input, output], { encoding: "utf8" });
  expect(execution.status).toBe(2);
  expect(JSON.parse(await readFile(output, "utf8"))).toMatchObject({ status: "INSUFFICIENT_EVIDENCE", groups: [] });
});

it("does not overwrite evidence or replace a valid report with malformed input", async () => {
  const dir = await mkdtemp(join(tmpdir(), "visitor-evaluation-")); directories.push(dir);
  const input = join(dir, "input.json"), output = join(dir, "report.json");
  await writeFile(input, "{}"); await writeFile(output, "previous report");
  await expect(runVisitorEvaluation(input, input)).rejects.toThrow(/overwrite/);
  await expect(runVisitorEvaluation(input, output)).rejects.toThrow();
  expect(await readFile(output, "utf8")).toBe("previous report");
});
