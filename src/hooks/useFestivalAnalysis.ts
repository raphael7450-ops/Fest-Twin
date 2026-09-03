import { useEffect, useRef, useState } from "react";
import { sampleSpendingContext } from "../data/sampleSpending";
import { sampleTrendContext } from "../data/sampleTrends";
import type {
  DemandBackdataContext,
  FestivalPlan,
  SelectedFestivalBasis,
  SpendingContext,
  TourismContext,
  TrafficContext,
  TrendContext,
} from "../domain/types";
import {
  createAnalysisKey,
  createFestivalAnalysisSnapshot,
  normalizeAnalysisCandidate,
  normalizeAnalysisDataStatus,
  type AnalysisDatasetState,
  type AnalysisDatasets,
  type FestivalAnalysisSnapshot,
} from "../services/analysisSnapshot";
import {
  createFallbackDemandBackdataContext,
  getDemandBackdataContextFromApi,
} from "../services/demandBackdataAdapter";
import { getSpendingContext } from "../services/spendingAdapter";
import { createFallbackTrafficContext, getTrafficContext } from "../services/trafficAdapter";
import { getTrendContext } from "../services/trendAdapter";
import {
  createFallbackTourismContext,
  getTourismContext,
  type FestivalCandidate,
} from "../services/tourApiAdapter";
import {
  getFallbackWeatherContext,
  type WeatherContext,
} from "../services/weatherAdapter";

export interface FestivalAnalysisInput {
  plan: FestivalPlan;
  selectedFestivalBasis?: SelectedFestivalBasis | null;
  selectedCandidate?: FestivalCandidate | null;
  selectedHour: number;
}

export interface FestivalAnalysisDependencies {
  loadTourism: typeof getTourismContext;
  loadTrends: typeof getTrendContext;
  loadTraffic: typeof getTrafficContext;
  loadSpending: typeof getSpendingContext;
  loadDemandBackdata: typeof getDemandBackdataContextFromApi;
  loadWeather: (plan: FestivalPlan, signal: AbortSignal) => Promise<WeatherContext>;
  now: () => Date;
}

export type FestivalAnalysisPhase = "loading" | "refreshing" | "ready" | "error";

export interface FestivalAnalysisState {
  snapshot?: FestivalAnalysisSnapshot;
  phase: FestivalAnalysisPhase;
  pendingFestivalTitle?: string;
  errorMessages: string[];
}

const defaultDependencies: FestivalAnalysisDependencies = {
  loadTourism: getTourismContext,
  loadTrends: getTrendContext,
  loadTraffic: getTrafficContext,
  loadSpending: getSpendingContext,
  loadDemandBackdata: getDemandBackdataContextFromApi,
  loadWeather: async (plan, signal) => {
    if (signal.aborted) throw new DOMException("Analysis request aborted", "AbortError");
    const month = Number(plan.startDate.slice(5, 7)) || 1;
    const latitude = plan.venueCoordinates?.latitude;
    const longitude = plan.venueCoordinates?.longitude;
    return getFallbackWeatherContext(latitude, longitude, month);
  },
  now: () => new Date(),
};

function clonePlainData<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function errorMessage(reason: unknown) {
  return reason instanceof Error ? reason.message : String(reason);
}

function unavailableState<T>(
  sourceName: string,
  message: string,
  fallbackValue: T,
): AnalysisDatasetState<T> {
  return {
    status: "unavailable",
    value: fallbackValue,
    sourceName,
    message,
  };
}

function tourismState(value: TourismContext): AnalysisDatasetState<TourismContext> {
  const inferredStatus =
    value.provenance.sourceStatus ??
    (value.sourceDetails?.some((detail) => detail.sourceType === "sample")
      ? "sample-fallback"
      : undefined);
  return {
    status: normalizeAnalysisDataStatus(inferredStatus),
    value,
    sourceName: value.provenance.sourceName,
    retrievedAt: value.provenance.retrievedAt,
    message: value.provenance.fallbackReason,
  };
}

function trendState(value: TrendContext): AnalysisDatasetState<TrendContext> {
  const inferredStatus =
    value.sourceStatus ??
    value.provenance.sourceStatus ??
    (value.provenance.sourceType === "trend-sample" ? "sample-fallback" : undefined);
  return {
    status: normalizeAnalysisDataStatus(inferredStatus),
    value,
    sourceName: value.sourceName ?? value.provenance.sourceName,
    retrievedAt: value.provenance.retrievedAt,
    message: value.fallbackReason ?? value.provenance.fallbackReason,
  };
}

function trafficState(value: TrafficContext): AnalysisDatasetState<TrafficContext> {
  return {
    status: normalizeAnalysisDataStatus(value.status),
    value,
    sourceName: value.provenance.sourceName,
    retrievedAt: value.provenance.retrievedAt,
    message: value.provenance.fallbackReason,
  };
}

function spendingState(value: SpendingContext): AnalysisDatasetState<SpendingContext> {
  return {
    status: normalizeAnalysisDataStatus(value.sourceStatus),
    value,
    sourceName: value.sourceName,
    retrievedAt: value.retrievedAt,
    message: value.note,
  };
}

function demandBackdataState(
  value: DemandBackdataContext,
): AnalysisDatasetState<DemandBackdataContext> {
  const detail = value.sourceDetails[0];
  return {
    status: normalizeAnalysisDataStatus(value.status),
    value,
    sourceName: detail?.sourceName ?? "Regional festival backdata",
    retrievedAt: detail?.retrievedAt,
    message: detail?.note,
  };
}

function weatherState(value: WeatherContext): AnalysisDatasetState<WeatherContext> {
  return {
    status: normalizeAnalysisDataStatus(value.provenance.sourceStatus),
    value,
    sourceName:
      value.provenance.sourceType === "kma-forecast"
        ? "KMA forecast"
        : "Seasonal climate sample",
    retrievedAt: value.provenance.baseDateTime,
  };
}

function fallbackTrend(plan: FestivalPlan, message: string): TrendContext {
  return {
    ...clonePlainData(sampleTrendContext),
    sourceName: sampleTrendContext.provenance.sourceName,
    sourceStatus: "sample-fallback",
    basisLabel: plan.name,
    fallbackReason: message,
    provenance: {
      ...clonePlainData(sampleTrendContext.provenance),
      sourceStatus: "sample-fallback",
      fallbackReason: message,
    },
  };
}

function fallbackSpending(plan: FestivalPlan, message: string): SpendingContext {
  return {
    ...clonePlainData(sampleSpendingContext),
    region: plan.region,
    sourceStatus: "sample-fallback",
    retrievedAt: new Date(0).toISOString(),
    note: message,
  };
}

function settledDatasets(
  plan: FestivalPlan,
  selectedHour: number,
  results: [
    PromiseSettledResult<TourismContext>,
    PromiseSettledResult<TrendContext>,
    PromiseSettledResult<TrafficContext>,
    PromiseSettledResult<SpendingContext>,
    PromiseSettledResult<DemandBackdataContext>,
    PromiseSettledResult<WeatherContext>,
  ],
): { datasets: AnalysisDatasets; errorMessages: string[] } {
  const [tourism, trends, traffic, spending, demandBackdata, weather] = results;
  const failures = [
    ["Tourism", tourism],
    ["Trends", trends],
    ["Traffic", traffic],
    ["Spending", spending],
    ["Demand backdata", demandBackdata],
    ["Weather", weather],
  ] as const;
  const errorMessages = failures.flatMap(([label, result]) =>
    result.status === "rejected" ? [`${label}: ${errorMessage(result.reason)}`] : [],
  );

  const tourismMessage = tourism.status === "rejected" ? errorMessage(tourism.reason) : "";
  const trendsMessage = trends.status === "rejected" ? errorMessage(trends.reason) : "";
  const trafficMessage = traffic.status === "rejected" ? errorMessage(traffic.reason) : "";
  const spendingMessage = spending.status === "rejected" ? errorMessage(spending.reason) : "";
  const demandMessage =
    demandBackdata.status === "rejected" ? errorMessage(demandBackdata.reason) : "";
  const weatherMessage = weather.status === "rejected" ? errorMessage(weather.reason) : "";
  const month = Number(plan.startDate.slice(5, 7)) || 1;

  return {
    datasets: {
      tourism:
        tourism.status === "fulfilled"
          ? tourismState(tourism.value)
          : unavailableState(
              "TourAPI tourism context",
              tourismMessage,
              createFallbackTourismContext(plan, tourismMessage),
            ),
      trends:
        trends.status === "fulfilled"
          ? trendState(trends.value)
          : unavailableState(
              "Naver DataLab search trend",
              trendsMessage,
              fallbackTrend(plan, trendsMessage),
            ),
      traffic:
        traffic.status === "fulfilled"
          ? trafficState(traffic.value)
          : unavailableState(
              "KTDB/View-T traffic",
              trafficMessage,
              createFallbackTrafficContext(plan, trafficMessage, selectedHour),
            ),
      spending:
        spending.status === "fulfilled"
          ? spendingState(spending.value)
          : unavailableState(
              "Regional tourism spending",
              spendingMessage,
              fallbackSpending(plan, spendingMessage),
            ),
      demandBackdata:
        demandBackdata.status === "fulfilled"
          ? demandBackdataState(demandBackdata.value)
          : unavailableState(
              "Regional festival backdata",
              demandMessage,
              createFallbackDemandBackdataContext(plan, demandMessage),
            ),
      weather:
        weather.status === "fulfilled"
          ? weatherState(weather.value)
          : unavailableState(
              "KMA forecast",
              weatherMessage,
              getFallbackWeatherContext(
                plan.venueCoordinates?.latitude,
                plan.venueCoordinates?.longitude,
                month,
              ),
            ),
    },
    errorMessages,
  };
}

function getPlanIdentityKey(input: FestivalAnalysisInput): string {
  const candidate = input.selectedCandidate
    ? normalizeAnalysisCandidate(input.selectedCandidate)
    : null;
  return JSON.stringify({
    plan: input.plan,
    basis: input.selectedFestivalBasis ?? null,
    candidate,
  });
}

export function useFestivalAnalysis(
  input: FestivalAnalysisInput,
  dependencies: FestivalAnalysisDependencies = defaultDependencies,
): FestivalAnalysisState {
  const analysisKey = createAnalysisKey(input);
  const planIdentityKey = getPlanIdentityKey(input);
  const latestKey = useRef(analysisKey);
  const latestPlanIdentityKey = useRef(planIdentityKey);
  const latestDependencies = useRef(dependencies);
  const requestSequence = useRef(0);
  const [state, setState] = useState<FestivalAnalysisState>({
    phase: "loading",
    errorMessages: [],
  });
  latestKey.current = analysisKey;
  latestDependencies.current = dependencies;

  useEffect(() => {
    const requestPlan = clonePlainData(input.plan);
    const requestBasis = input.selectedFestivalBasis
      ? clonePlainData(input.selectedFestivalBasis)
      : undefined;
    const requestCandidate = input.selectedCandidate
      ? normalizeAnalysisCandidate(input.selectedCandidate)
      : undefined;
    const requestDependencies = latestDependencies.current;

    // 오직 시간대(selectedHour)만 변경된 경우:
    // 네트워크 재요청 및 refreshing 배너 출현 없이 기존 datasets로 즉시 스냅샷 전환 (화면 흔들림 원천 제거)
    const isOnlyHourChange =
      latestPlanIdentityKey.current === planIdentityKey &&
      state.snapshot !== undefined &&
      state.phase === "ready" &&
      state.snapshot.selectedHour !== input.selectedHour;

    if (isOnlyHourChange && state.snapshot) {
      try {
        const instantSnapshot = createFestivalAnalysisSnapshot({
          plan: requestPlan,
          selectedFestivalBasis: requestBasis,
          selectedCandidate: requestCandidate,
          selectedHour: input.selectedHour,
          datasets: state.snapshot.datasets,
          now: requestDependencies.now(),
        });
        setState((current) => ({
          snapshot: instantSnapshot,
          phase: "ready",
          pendingFestivalTitle: undefined,
          errorMessages: current.errorMessages,
        }));
        return;
      } catch {
        // Fallback to standard fetch flow if instant snapshot calculation fails
      }
    }

    latestPlanIdentityKey.current = planIdentityKey;
    requestSequence.current += 1;
    const requestId = requestSequence.current;
    const controller = new AbortController();

    setState((current) => ({
      snapshot: current.snapshot,
      phase: current.snapshot ? "refreshing" : "loading",
      pendingFestivalTitle: current.snapshot ? requestBasis?.title ?? requestPlan.name : undefined,
      errorMessages: [],
    }));

    const requests = [
      requestDependencies.loadTourism(requestPlan, {
        signal: controller.signal,
        selectedCandidate: requestCandidate,
      }),
      requestDependencies.loadTrends(requestPlan, { signal: controller.signal }),
      requestDependencies.loadTraffic(requestPlan, {
        signal: controller.signal,
        hour: input.selectedHour,
      }),
      requestDependencies.loadSpending(requestPlan, { signal: controller.signal }),
      requestDependencies.loadDemandBackdata(requestPlan, { signal: controller.signal }),
      requestDependencies.loadWeather(requestPlan, controller.signal),
    ] as const;

    Promise.allSettled(requests).then((results) => {
      if (
        controller.signal.aborted ||
        latestKey.current !== analysisKey ||
        requestSequence.current !== requestId
      ) {
        return;
      }

      try {
        const resolved = settledDatasets(requestPlan, input.selectedHour, results);
        if (
          controller.signal.aborted ||
          latestKey.current !== analysisKey ||
          requestSequence.current !== requestId
        ) {
          return;
        }
        const snapshot = createFestivalAnalysisSnapshot({
          plan: requestPlan,
          selectedFestivalBasis: requestBasis,
          selectedCandidate: requestCandidate,
          selectedHour: input.selectedHour,
          datasets: resolved.datasets,
          now: requestDependencies.now(),
        });

        setState({
          snapshot,
          phase: "ready",
          pendingFestivalTitle: undefined,
          errorMessages: resolved.errorMessages,
        });
      } catch (error) {
        if (
          controller.signal.aborted ||
          latestKey.current !== analysisKey ||
          requestSequence.current !== requestId
        ) {
          return;
        }
        setState((current) => ({
          snapshot: current.snapshot,
          phase: "error",
          pendingFestivalTitle: undefined,
          errorMessages: [errorMessage(error)],
        }));
      }
    });

    return () => controller.abort();
  }, [analysisKey]);

  return state;
}
