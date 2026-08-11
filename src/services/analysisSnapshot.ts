import type {
  DataSourceStatus,
  DemandBackdataContext,
  FestivalPlan,
  ForecastResult,
  MetricEvidence,
  MetricEvidenceId,
  PlanningReport,
  SafetyDecisionProfiles,
  SelectedFestivalBasis,
  SimulationResult,
  SpendingContext,
  TourismContext,
  TrafficContext,
  TrafficSourceStatus,
  TrendContext,
} from "../domain/types";
import { createForecast } from "./forecast";
import {
  createEconomicImpactMetrics,
  createSummaryKpiMetrics,
  type EconomicImpactMetrics,
  type SummaryKpiMetrics,
} from "./impactMetrics";
import { createMetricEvidenceSet } from "./metricEvidence";
import { createPlanningReport } from "./report";
import { createSafetyDecisionProfiles } from "./safetyDecisionMetrics";
import { createSimulation } from "./simulation";
import type { WeatherContext } from "./weatherAdapter";

export const ANALYSIS_MODEL_VERSION = "phase1-v1" as const;

export type AnalysisDataStatus = "live" | "cached" | "supplemented" | "unavailable";

export interface AnalysisDatasetState<T> {
  status: AnalysisDataStatus;
  value?: T;
  retrievedAt?: string;
  validUntil?: string;
  sourceName: string;
  message?: string;
}

export interface AnalysisDatasets {
  tourism: AnalysisDatasetState<TourismContext>;
  trends: AnalysisDatasetState<TrendContext>;
  traffic: AnalysisDatasetState<TrafficContext>;
  spending: AnalysisDatasetState<SpendingContext>;
  demandBackdata: AnalysisDatasetState<DemandBackdataContext>;
  weather: AnalysisDatasetState<WeatherContext>;
}

export interface CanonicalAnalysisMetrics {
  summary: SummaryKpiMetrics;
  economic: EconomicImpactMetrics;
}

export interface FestivalAnalysisSnapshot {
  analysisId: string;
  analysisKey: string;
  festivalId: string;
  createdAt: string;
  modelVersion: typeof ANALYSIS_MODEL_VERSION;
  plan: FestivalPlan;
  selectedFestivalBasis?: SelectedFestivalBasis;
  selectedHour: number;
  datasets: AnalysisDatasets;
  forecast: ForecastResult;
  simulation: SimulationResult;
  safety: SafetyDecisionProfiles;
  metrics: CanonicalAnalysisMetrics;
  report: PlanningReport;
  evidence: Record<MetricEvidenceId, MetricEvidence>;
}

export interface AnalysisIdentityInput {
  plan: FestivalPlan;
  selectedFestivalBasis?: SelectedFestivalBasis | null;
  selectedHour: number;
}

export interface FestivalAnalysisSnapshotInput extends AnalysisIdentityInput {
  datasets: AnalysisDatasets;
  now: Date;
}

type LegacyAnalysisDataStatus =
  | DataSourceStatus
  | TrafficSourceStatus
  | "file-normalized"
  | "rejected"
  | null
  | undefined;

export function normalizeAnalysisDataStatus(
  status: LegacyAnalysisDataStatus,
): AnalysisDataStatus {
  switch (status) {
    case "live":
      return "live";
    case "file-normalized":
      return "cached";
    case "partial-fallback":
    case "sample-fallback":
    case "mapped-sample":
      return "supplemented";
    default:
      return "unavailable";
  }
}

function stableSerialize(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "number") {
    if (Number.isNaN(value)) return '"NaN"';
    if (!Number.isFinite(value)) return JSON.stringify(String(value));
    return JSON.stringify(value);
  }
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(String(value));
}

function hashStructuredValue(value: unknown): string {
  const serialized = stableSerialize(value);
  let hash = 0xcbf29ce484222325n;

  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= BigInt(serialized.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }

  return hash.toString(16).padStart(16, "0");
}

export function deriveFestivalId(
  plan: FestivalPlan,
  selectedFestivalBasis?: SelectedFestivalBasis | null,
): string {
  const contentId = selectedFestivalBasis?.contentId.trim();
  if (contentId) return contentId;

  return `festival_plan_${hashStructuredValue({
    name: plan.name,
    region: plan.region,
    venueAddress: plan.venueAddress,
    startDate: plan.startDate,
    endDate: plan.endDate,
  })}`;
}

export function createAnalysisKey(input: AnalysisIdentityInput): string {
  return `analysis_key_${hashStructuredValue({
    festivalId: deriveFestivalId(input.plan, input.selectedFestivalBasis),
    selectedFestivalBasis: input.selectedFestivalBasis ?? null,
    plan: input.plan,
    selectedHour: input.selectedHour,
    modelVersion: ANALYSIS_MODEL_VERSION,
  })}`;
}

function clonePlainData<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;

  Object.freeze(value);
  Object.values(value as Record<string, unknown>).forEach((nestedValue) => {
    deepFreeze(nestedValue);
  });
  return value;
}

function requiredDataset<T>(
  state: AnalysisDatasetState<T>,
  datasetName: string,
): T {
  if (state.value === undefined) {
    throw new Error(`${datasetName} dataset is required to construct an analysis snapshot`);
  }
  return state.value;
}

let analysisSequence = 0;

function createAnalysisId(createdAt: string) {
  analysisSequence += 1;
  const timestamp = createdAt.replace(/\D/g, "");
  const uniqueSuffix =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID().replace(/-/g, "")
      : analysisSequence.toString(36).padStart(6, "0");
  return `analysis_${timestamp}_${uniqueSuffix}_${analysisSequence.toString(36)}`;
}

export function createFestivalAnalysisSnapshot(
  input: FestivalAnalysisSnapshotInput,
): FestivalAnalysisSnapshot {
  const plan = clonePlainData(input.plan);
  const selectedFestivalBasis = input.selectedFestivalBasis
    ? clonePlainData(input.selectedFestivalBasis)
    : undefined;
  const datasets = clonePlainData(input.datasets);
  const tourism = requiredDataset(datasets.tourism, "tourism");
  const trends = requiredDataset(datasets.trends, "trends");
  const traffic = datasets.traffic.value;
  const spending = datasets.spending.value;
  const demandBackdata = datasets.demandBackdata.value;
  const weather = datasets.weather.value;

  const forecast = createForecast(plan, tourism, trends, demandBackdata, weather);
  const simulation = createSimulation(plan, forecast, input.selectedHour);
  const safety = createSafetyDecisionProfiles(plan, forecast, simulation, traffic);
  const metrics = {
    summary: createSummaryKpiMetrics(
      plan,
      forecast,
      simulation,
      tourism,
      demandBackdata,
      safety.summary,
    ),
    economic: createEconomicImpactMetrics(plan, forecast, spending),
  };
  const report = createPlanningReport(plan, forecast, simulation);
  const evidence = createMetricEvidenceSet(
    plan,
    forecast,
    simulation,
    tourism,
    trends,
    traffic,
    spending,
    demandBackdata,
    selectedFestivalBasis,
    weather,
    safety,
  );
  const createdAt = input.now.toISOString();
  const snapshot: FestivalAnalysisSnapshot = {
    analysisId: createAnalysisId(createdAt),
    analysisKey: createAnalysisKey({
      plan,
      selectedFestivalBasis,
      selectedHour: input.selectedHour,
    }),
    festivalId: deriveFestivalId(plan, selectedFestivalBasis),
    createdAt,
    modelVersion: ANALYSIS_MODEL_VERSION,
    plan,
    selectedFestivalBasis,
    selectedHour: input.selectedHour,
    datasets,
    forecast,
    simulation,
    safety,
    metrics,
    report,
    evidence,
  };

  return deepFreeze(snapshot);
}
