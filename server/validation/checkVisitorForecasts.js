import { readFile, mkdir, rename, writeFile, rm } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { evaluateVisitors } from "./visitorEvaluation.js";

export async function runVisitorEvaluation(inputPath, outputPath, now) {
  const input = resolve(inputPath), output = resolve(outputPath);
  if (input === output) throw new Error("Output must not overwrite source evidence");
  const document = JSON.parse(await readFile(input, "utf8"));
  const report = evaluateVisitors(document, now ? { now } : undefined);
  await mkdir(dirname(output), { recursive: true });
  const temporary = `${output}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
    await rename(temporary, output);
  } finally { await rm(temporary, { force: true }); }
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const report = await runVisitorEvaluation(process.argv[2] ?? "data/visitor_evaluation.json",
      process.argv[3] ?? "reports/visitor_evaluation.json");
    console.log(JSON.stringify({ status: report.status, accepted: report.accepted.length,
      excluded: report.excluded.length, unmatchedActuals: report.unmatchedActualIds.length, actualIssues: report.actualIssues, groups: report.groups, benchmarks: report.benchmarks }, null, 2));
    process.exitCode = report.accepted.length ? 0 : 2;
  } catch (error) {
    console.error(`Visitor evaluation failed: ${error.message}`);
    process.exitCode = 1;
  }
}
