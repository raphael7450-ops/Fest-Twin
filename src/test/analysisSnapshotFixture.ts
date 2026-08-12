import { sampleDemandBackdataContext } from "../data/sampleDemandBackdata";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import { sampleSpendingContext } from "../data/sampleSpending";
import { sampleTourismContext } from "../data/sampleTourApi";
import { sampleTrafficContext } from "../data/sampleTraffic";
import { sampleTrendContext } from "../data/sampleTrends";
import type { SelectedFestivalBasis } from "../domain/types";
import {
  createFestivalAnalysisSnapshot,
  type AnalysisDataStatus,
  type AnalysisDatasets,
} from "../services/analysisSnapshot";
import { getFallbackWeatherContext } from "../services/weatherAdapter";

export const testSelectedFestivalBasis: SelectedFestivalBasis = {
  contentId: "festival-content-42",
  title: "테스트 문화 축제",
  address: "서울특별시 영등포구",
  startDate: sampleFestivalPlan.startDate,
  endDate: sampleFestivalPlan.endDate,
  sourceName: "TourAPI selected festival candidate",
};

type DatasetName = keyof AnalysisDatasets;

interface TestAnalysisSnapshotOptions {
  now?: Date;
  selectedFestivalBasis?: SelectedFestivalBasis | null;
  statuses?: Partial<Record<DatasetName, AnalysisDataStatus>>;
}

export function createTestAnalysisSnapshot(
  options: TestAnalysisSnapshotOptions = {},
) {
  const statuses = options.statuses ?? {};
  const datasets: AnalysisDatasets = {
    tourism: {
      status: statuses.tourism ?? "live",
      value: structuredClone(sampleTourismContext),
      sourceName: sampleTourismContext.provenance.sourceName,
    },
    trends: {
      status: statuses.trends ?? "cached",
      value: structuredClone(sampleTrendContext),
      sourceName: sampleTrendContext.provenance.sourceName,
    },
    traffic: {
      status: statuses.traffic ?? "supplemented",
      value: structuredClone(sampleTrafficContext),
      sourceName: sampleTrafficContext.provenance.sourceName,
    },
    spending: {
      status: statuses.spending ?? "live",
      value: structuredClone(sampleSpendingContext),
      sourceName: sampleSpendingContext.sourceName,
    },
    demandBackdata: {
      status: statuses.demandBackdata ?? "cached",
      value: structuredClone(sampleDemandBackdataContext),
      sourceName: "Regional festival DB",
    },
    weather: {
      status: statuses.weather ?? "unavailable",
      value: getFallbackWeatherContext(),
      sourceName: "Seasonal climate sample",
    },
  };

  return createFestivalAnalysisSnapshot({
    plan: sampleFestivalPlan,
    selectedFestivalBasis:
      options.selectedFestivalBasis === undefined
        ? testSelectedFestivalBasis
        : options.selectedFestivalBasis,
    selectedHour: 20,
    datasets,
    now: options.now ?? new Date("2026-08-11T03:04:05.000Z"),
  });
}
