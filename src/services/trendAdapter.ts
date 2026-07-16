import { sampleTrendContext } from "../data/sampleTrends";
import type { FestivalPlan, TrendContext } from "../domain/types";

export async function getTrendContext(plan: FestivalPlan): Promise<TrendContext> {
  const planKeywords = new Set(plan.keywords);
  const signals = sampleTrendContext.signals.filter((signal) =>
    planKeywords.has(signal.keyword),
  );

  return {
    ...sampleTrendContext,
    signals: signals.length > 0 ? signals : sampleTrendContext.signals,
  };
}
