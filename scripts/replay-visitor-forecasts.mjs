import { readFile, mkdir, writeFile, rename, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash, randomUUID } from "node:crypto";
import { createServer } from "vite";
import { buildVisitorReplay } from "../server/validation/visitorReplay.js";
import { evaluateVisitors } from "../server/validation/visitorEvaluation.js";

export async function runReplay(inputPath, outputPath, now = new Date().toISOString()) {
  const input = resolve(inputPath), output = resolve(outputPath);
  if (input === output) throw new Error("Output must not overwrite evidence");
  const document = JSON.parse(await readFile(input, "utf8"));
  const root = fileURLToPath(new URL("../", import.meta.url));
  const vite = await createServer({ root, configFile: false, optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
  let result;
  try {
    const codeHash = createHash("sha256");
    for (const file of ["src/services/forecast.ts", "src/services/visitorOccupancy.ts"]) {
      codeHash.update(file + "\0").update(await readFile(resolve(root, file), "utf8"));
    }
    const modelFingerprint = codeHash.digest("hex");
    const { createForecast } = await vite.ssrLoadModule("/src/services/forecast.ts");
    const { ANALYSIS_MODEL_VERSION } = await vite.ssrLoadModule("/src/services/analysisSnapshot.ts");
    const replay = buildVisitorReplay(document, createForecast, { now, modelVersion: `${ANALYSIS_MODEL_VERSION}@${modelFingerprint.slice(0, 12)}` });
    result = { ...evaluateVisitors(replay.document, { now }), excludedCases: replay.excludedCases,
      generatedPredictions: replay.document.predictions, replayLimitations: replay.limitations,
      caseCount: (document.replayCases ?? []).length, modelFingerprint, nodeVersion: process.version };
  } finally { await vite.close(); }
  await mkdir(dirname(output), { recursive: true });
  const temporary = `${output}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
    await rename(temporary, output);
  } finally { await rm(temporary, { force: true }); }
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = await runReplay(process.argv[2] ?? "data/visitor_evaluation.json", process.argv[3] ?? "reports/visitor_replay.json");
    console.log(JSON.stringify({ status: result.status, caseCount: result.caseCount,
      accepted: result.accepted.length, excludedCases: result.excludedCases, actualIssues: result.actualIssues,
      groups: result.groups, benchmarks: result.benchmarks, modelChanged: false }, null, 2));
    process.exitCode = result.accepted.length ? 0 : 2;
  } catch (error) { console.error(`Replay failed: ${error.message}`); process.exitCode = 1; }
}
