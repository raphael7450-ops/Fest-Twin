export type ReadinessStatus = "반영" | "준비" | "향후";
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type DataSourceStatus =
  | "live"
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
