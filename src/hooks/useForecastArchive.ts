import { useEffect, useState } from "react";
import type { FestivalAnalysisSnapshot } from "../services/analysisSnapshot";

export interface ArchiveSummary {
  archive: { archived: number; preEvent: number; afterStart: number; verified: number; corrupt: number; quota: number };
  evaluation: { status: string; comparable: number; excluded: number; unmatchedActuals: number;
    actualIssues: Array<{ actualId: string; reasons: string[] }>;
    groups: Array<{ mode: string; modelVersion: string; year: number; measure: string; scope: string; count: number; mae: number; bias: number; wapePercent: number | null; evaluationRole?: string; independentFestivals?: number }>;
    benchmarks?: Array<{ mode: string; modelVersion: string; year: number; measure: string; scope: string; count: number; independentFestivals: number; candidateMae: number; baselineMae: number; maeImprovementPercent: number | null; status: string }> };
}
export interface ArchiveState {
  phase: "idle" | "saving" | "saved" | "failed";
  receipt?: { id: string; receivedAt: string; timing: string };
  summary?: ArchiveSummary;
}

export function useForecastArchive(snapshot?: FestivalAnalysisSnapshot): ArchiveState {
  const [state, setState] = useState<ArchiveState>({ phase: "idle" });
  useEffect(() => {
    if (!snapshot) return;
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    setState({ phase: "saving" });
    async function capture() {
      const body = JSON.stringify({ festivalId: snapshot!.festivalId, modelVersion: snapshot!.modelVersion,
        plan: snapshot!.plan, forecast: snapshot!.forecast, datasets: snapshot!.datasets });
      let receipt: ArchiveState["receipt"];
      for (let attempt = 0; attempt < 2 && active && !controller.signal.aborted; attempt++) {
        try {
          const response = await fetch("/api/forecast-archive", { method: "POST", headers: { "Content-Type": "application/json" }, body, signal: controller.signal });
          if (response.ok) {
            const data = await response.json();
            if (typeof data.id !== "string" || typeof data.receivedAt !== "string" || !Number.isFinite(Date.parse(data.receivedAt))) throw new Error("Invalid archive receipt");
            receipt = data; break;
          }
          if (response.status < 500) break;
        } catch { if (controller.signal.aborted) break; }
        if (attempt === 0) await new Promise(resolve => window.setTimeout(resolve, 300));
      }
      if (!active) return;
      setState({ phase: receipt ? "saved" : "failed", receipt });
      try {
        const response = await fetch("/api/forecast-archive/status", { signal: controller.signal });
        if (response.ok) {
          const summary: ArchiveSummary = await response.json();
          if (summary.archive && Number.isFinite(summary.archive.archived) && summary.evaluation
            && Number.isFinite(summary.evaluation.comparable) && Array.isArray(summary.evaluation.actualIssues)
            && Array.isArray(summary.evaluation.groups) && active) {
            setState({ phase: receipt ? "saved" : "failed", receipt, summary });
          }
        }
      } catch { /* An archive outage must not invalidate an analysis snapshot. */ }
    }
    void capture().catch(() => { if (active) setState({ phase: "failed" }); }).finally(() => window.clearTimeout(timeout));
    return () => { active = false; controller.abort(); window.clearTimeout(timeout); };
  }, [snapshot]);
  return state;
}
