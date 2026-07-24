/**
 * 파일 : src/domain/types.ts
 * 내용 : Fest-Twin 핵심 도메인 인터페이스, DTO 및 상태 모델 정의
 * 수정 : 2026-07-24. 수요예측 백데이터, 소비/교통 맥락 및 지표 근거 타입 통합
 */

export type ReadinessStatus = "반영" | "준비" | "향후";
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type DataSourceStatus =
  | "live"
  | "file-normalized"
  | "partial-fallback"
  | "sample-fallback";

export interface GovernmentStandard {
  id: string;
  title: string;
  source: string;
  purpose: string;
  designRule: string;
}

export interface GovernmentReadinessItem {
  standardId: string;
  title: string;
  status: ReadinessStatus;
  evidence: string;
  nextAction: string;
}

export type VisitorGroup = "families" | "youth" | "foreigners" | "locals";

export type FacilityType =
  | "entrance"
  | "stage"
  | "booth"
  | "restroom"
  | "parking"
  | "medical"
  | "rest";

export interface ProgramItem {
  id: string;
  name: string;
  startHour: number;
  endHour: number;
  expectedDraw: number;
}

export interface VenueFacility {
  id: string;
  type: FacilityType;
  name: string;
  x: number;
  y: number;
  weight: number;
}

export interface FestivalPlan {
  name: string;
  region: string;
  venueAddress: string;
  startDate: string;
  endDate: string;
  operatingHours: number[];
  totalBudgetMillionKrw: number;
  promotionBudgetMillionKrw: number;
  safetyBudgetMillionKrw: number;
  targetGroups: VisitorGroup[];
  keywords: string[];
  expectedCapacity: number;
  gridWidth: number;
  gridHeight: number;
  programs: ProgramItem[];
  facilities: VenueFacility[];
}

export interface DataProvenance {
  sourceName: string;
  sourceType: "public-data" | "trend-sample" | "user-input";
  sourceStatus?: DataSourceStatus;
  basisText: string;
  fallbackText: string;
  fallbackReason?: string;
  retrievedAt?: string;
  collectedPersonalData: false;
}

export interface TourismSpot {
  id: string;
  name: string;
  category: string;
  distanceKm: number;
  appealScore: number;
}

export interface SimilarFestival {
  id: string;
  name: string;
  region: string;
  visitors: number;
  themeOverlap: number;
}

export interface TourismContext {
  nearbySpots: TourismSpot[];
  similarFestivals: SimilarFestival[];
  provenance: DataProvenance;
  sourceDetails?: MetricEvidenceSourceDetail[];
}

export interface TrendSignal {
  keyword: string;
  interestScore: number;
  sentimentScore: number;
  mentions: number;
}

export interface TrendContext {
  signals: TrendSignal[];
  provenance: DataProvenance;
}

export type SpendingBasis =
  | "tourism-demand-intensity"
  | "tourism-diversity"
  | "similar-region"
  | "fallback";

export type SpendingConfidence = "high" | "medium" | "low";

export interface SpendingContext {
  averageSpendPerVisitorKrw: number;
  basis: SpendingBasis;
  basisLabel: string;
  confidence: SpendingConfidence;
  sourceName: string;
  sourceStatus: DataSourceStatus;
  region: string;
  retrievedAt: string;
  note: string;
  sourceDetails: MetricEvidenceSourceDetail[];
}

export type DemandBackdataStatus =
  | "live"
  | "file-normalized"
  | "partial-fallback"
  | "sample-fallback";

export interface DemandBackdataSimilarFestival {
  id: string;
  name: string;
  region: string;
  type: string;
  periodLabel: string;
  budgetMillionKrw?: number;
  visitors?: number;
  similarityScore: number;
  sourceName: string;
}

export interface DemandBackdataContext {
  status: DemandBackdataStatus;
  regionBaseline?: {
    region: string;
    basePeriod: string;
    visitorCount: number;
    sourceName: string;
  };
  similarFestivalBaselines: DemandBackdataSimilarFestival[];
  seasonality?: {
    label: string;
    concentrationIndex: number;
    sourceName: string;
  };
  sourceDetails: MetricEvidenceSourceDetail[];
}

export interface ForecastReason {
  label: string;
  impact: number;
  description: string;
}

export interface ForecastResult {
  expectedVisitors: number;
  visitorsByHour: Array<{ hour: number; visitors: number }>;
  peakHour: number;
  successScore: number;
  confidence: RiskLevel;
  reasons: ForecastReason[];
}

export interface HeatmapCell {
  x: number;
  y: number;
  density: number;
  level: RiskLevel;
}

export interface Bottleneck {
  id: string;
  label: string;
  x: number;
  y: number;
  level: RiskLevel;
  reason: string;
}

export interface SimulationResult {
  hour: number;
  cells: HeatmapCell[];
  bottlenecks: Bottleneck[];
  congestionScore: number;
}

export interface RiskScore {
  label: string;
  score: number;
  level: RiskLevel;
  reason: string;
}

export interface Recommendation {
  id: string;
  title: string;
  detail: string;
  expectedEffect: string;
}

export interface PlanningReport {
  summary: string;
  scores: RiskScore[];
  findings: string[];
  recommendations: Recommendation[];
  governmentReviewNote: string;
}

export type MetricEvidenceId =
  | "demand-index"
  | "peak-density"
  | "budget-efficiency"
  | "commercial-spillover"
  | "safety-staff"
  | "medical-staff"
  | "parking-occupancy"
  | "economic-roi";

export type MetricEvidenceConfidence = "high" | "medium" | "low";

export interface MetricEvidenceContributor {
  label: string;
  value: string;
  effect: "positive" | "neutral" | "risk";
}

export type EvidenceSourceType = "tourapi" | "ktdb" | "user-input" | "derived" | "sample";

export interface EvidenceField {
  label: string;
  value: string;
}

export interface MetricEvidenceSourceRecord {
  label: string;
  fields: EvidenceField[];
}

export interface MetricEvidenceSourceDetail {
  sourceId: string;
  sourceName: string;
  sourceType: EvidenceSourceType;
  statusLabel: string;
  retrievedAt?: string;
  endpoint?: string;
  query?: EvidenceField[];
  records?: MetricEvidenceSourceRecord[];
  calculationInputs?: EvidenceField[];
  note?: string;
}

export type TrafficSourceStatus = "live" | "mapped-sample" | "sample-fallback";
export type TrafficRiskLabel = "낮음" | "보통" | "높음";

export interface TrafficLinkRecord {
  linkId: string;
  roadName: string;
  roadRank?: string;
  lanes?: number;
  inboundVolume: number;
  outboundVolume: number;
  totalVolume: number;
}

export interface TrafficContext {
  status: TrafficSourceStatus;
  year: number;
  weekType: "weekday" | "weekend";
  time: string;
  riskScore: number;
  riskLabel: TrafficRiskLabel;
  links: TrafficLinkRecord[];
  provenance: DataProvenance;
  sourceDetails: MetricEvidenceSourceDetail[];
}

export interface MetricEvidence {
  metricId: MetricEvidenceId;
  title: string;
  summary: string;
  dataSources: string[];
  sourceDetails: MetricEvidenceSourceDetail[];
  formulaSummary: string;
  assumptions: string[];
  confidence: MetricEvidenceConfidence;
  confidenceLabel: "높음" | "보통" | "낮음";
  limitations: string[];
  contributors: MetricEvidenceContributor[];
}
