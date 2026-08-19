/**
 * 파일 : src/services/scenarioStorage.ts
 * 내용 : SQLite REST API 영속 저장소 동기화 및 브라우저 LocalStorage Graceful Fallback 서비스
 * 수정 : 2026-07-24. REST API 연동, share_token 공유 링크 복사 지원 및 하이브리드 동기화 구현
 */

import type { FestivalPlan, SelectedFestivalBasis, VenueAreaProvenance } from "../domain/types";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";

const STORAGE_KEY = "fest-twin-scenarios";

export interface SavedScenario {
  id: string;
  name: string;
  savedAt: string;
  selectedHour: number;
  plan: FestivalPlan;
  shareToken?: string;
  selectedFestivalBasis?: SelectedFestivalBasis;
}

function normalizePositiveNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function normalizeVenueCoordinates(value: unknown): FestivalPlan["venueCoordinates"] {
  if (!value || typeof value !== "object") return undefined;

  const { latitude, longitude, source } = value as Record<string, unknown>;
  if (
    typeof latitude !== "number" ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    typeof longitude !== "number" ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180 ||
    (source !== "tourapi" && source !== "verified" && source !== "user-input")
  ) {
    return undefined;
  }

  return { latitude, longitude, source };
}

function normalizeBoundedString(value: unknown, maxLength = 200) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength
    ? value.trim()
    : undefined;
}

function isIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?Z)?$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth) return false;
  if (!match[4]) return true;

  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  return hour <= 23 && minute <= 59 && second <= 59;
}

function normalizeVenueAreaProvenance(value: unknown): VenueAreaProvenance | undefined {
  if (!value || typeof value !== "object") return undefined;

  const raw = value as Record<string, unknown>;
  if (raw.origin !== "user-input" && raw.origin !== "public-data" && raw.origin !== "user-adjusted") {
    return undefined;
  }

  const stringFields = ["sourceRecordId", "sourceParkName", "managementOrganization"] as const;
  const normalizedStrings = Object.fromEntries(
    stringFields.map((field) => [field, raw[field] === undefined ? undefined : normalizeBoundedString(raw[field])]),
  );
  if (stringFields.some((field) => raw[field] !== undefined && normalizedStrings[field] === undefined)) return undefined;

  const sourceDataset =
    raw.sourceDataset === undefined
      ? undefined
      : raw.sourceDataset === "전국도시공원정보표준데이터"
        ? "전국도시공원정보표준데이터"
        : undefined;
  if (raw.sourceDataset !== undefined && raw.sourceDataset !== "전국도시공원정보표준데이터") return undefined;

  const referenceAreaSquareMeters =
    raw.referenceAreaSquareMeters === undefined
      ? undefined
      : normalizePositiveNumber(raw.referenceAreaSquareMeters);
  if (raw.referenceAreaSquareMeters !== undefined && referenceAreaSquareMeters === undefined) return undefined;

  const referenceDate = raw.referenceDate === undefined ? undefined : normalizeBoundedString(raw.referenceDate, 40);
  const appliedAt = raw.appliedAt === undefined ? undefined : normalizeBoundedString(raw.appliedAt, 40);
  if (
    (raw.referenceDate !== undefined && (!referenceDate || !isIsoDate(referenceDate))) ||
    (raw.appliedAt !== undefined && (!appliedAt || !isIsoDate(appliedAt)))
  ) {
    return undefined;
  }

  const normalized: VenueAreaProvenance = { origin: raw.origin };
  if (sourceDataset) normalized.sourceDataset = sourceDataset;
  for (const field of stringFields) {
    if (normalizedStrings[field]) normalized[field] = normalizedStrings[field];
  }
  if (referenceAreaSquareMeters !== undefined) normalized.referenceAreaSquareMeters = referenceAreaSquareMeters;
  if (referenceDate) normalized.referenceDate = referenceDate;
  if (appliedAt) normalized.appliedAt = appliedAt;
  return normalized;
}

export function normalizeFestivalPlan(rawPlan: any): FestivalPlan {
  if (!rawPlan || typeof rawPlan !== "object") {
    return { ...sampleFestivalPlan };
  }
  const venueAreaSquareMeters = normalizePositiveNumber(rawPlan.venueAreaSquareMeters);
  const venueAreaProvenance = venueAreaSquareMeters
    ? normalizeVenueAreaProvenance(rawPlan.venueAreaProvenance)
    : undefined;

  const rawDwell = rawPlan.averageDwellMinutes;
  const averageDwellMinutes =
    typeof rawDwell === "number" &&
    Number.isFinite(rawDwell) &&
    rawDwell >= 30 &&
    rawDwell <= 720
      ? rawDwell
      : undefined;

  return {
    name: rawPlan.name ?? rawPlan.title ?? sampleFestivalPlan.name,
    region: rawPlan.region ?? sampleFestivalPlan.region,
    venueAddress: rawPlan.venueAddress ?? sampleFestivalPlan.venueAddress,
    venueCoordinates: normalizeVenueCoordinates(rawPlan.venueCoordinates),
    venueAreaSquareMeters,
    venueAreaProvenance,
    totalExitWidthMeters: normalizePositiveNumber(rawPlan.totalExitWidthMeters),
    evacuationDistanceMeters: normalizePositiveNumber(rawPlan.evacuationDistanceMeters),
    startDate: rawPlan.startDate ?? sampleFestivalPlan.startDate,
    endDate: rawPlan.endDate ?? sampleFestivalPlan.endDate,
    operatingHours:
      Array.isArray(rawPlan.operatingHours) && rawPlan.operatingHours.length > 0
        ? rawPlan.operatingHours
        : sampleFestivalPlan.operatingHours,
    totalBudgetMillionKrw:
      typeof rawPlan.totalBudgetMillionKrw === "number"
        ? rawPlan.totalBudgetMillionKrw
        : typeof rawPlan.budgetKrw === "number"
        ? Math.round(rawPlan.budgetKrw / 1000000)
        : sampleFestivalPlan.totalBudgetMillionKrw,
    promotionBudgetMillionKrw:
      typeof rawPlan.promotionBudgetMillionKrw === "number"
        ? rawPlan.promotionBudgetMillionKrw
        : sampleFestivalPlan.promotionBudgetMillionKrw,
    safetyBudgetMillionKrw:
      typeof rawPlan.safetyBudgetMillionKrw === "number"
        ? rawPlan.safetyBudgetMillionKrw
        : sampleFestivalPlan.safetyBudgetMillionKrw,
    targetGroups:
      Array.isArray(rawPlan.targetGroups) && rawPlan.targetGroups.length > 0
        ? rawPlan.targetGroups
        : sampleFestivalPlan.targetGroups,
    keywords:
      Array.isArray(rawPlan.keywords) && rawPlan.keywords.length > 0
        ? rawPlan.keywords
        : sampleFestivalPlan.keywords,
    averageDwellMinutes,
    parkingCapacityVehicles: normalizePositiveNumber(rawPlan.parkingCapacityVehicles),
    restroomFixtureCount: normalizePositiveNumber(rawPlan.restroomFixtureCount),
    expectedCapacity:
      typeof rawPlan.expectedCapacity === "number"
        ? rawPlan.expectedCapacity
        : typeof rawPlan.targetVisitors === "number"
        ? rawPlan.targetVisitors
        : typeof rawPlan.venueCapacity === "number"
        ? rawPlan.venueCapacity
        : sampleFestivalPlan.expectedCapacity,
    gridWidth: typeof rawPlan.gridWidth === "number" ? rawPlan.gridWidth : sampleFestivalPlan.gridWidth,
    gridHeight: typeof rawPlan.gridHeight === "number" ? rawPlan.gridHeight : sampleFestivalPlan.gridHeight,
    programs:
      Array.isArray(rawPlan.programs) && rawPlan.programs.length > 0
        ? rawPlan.programs
        : sampleFestivalPlan.programs,
    facilities:
      Array.isArray(rawPlan.facilities) && rawPlan.facilities.length > 0
        ? rawPlan.facilities
        : sampleFestivalPlan.facilities,
  };
}


function readRawScenarios(): SavedScenario[] {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: any) => ({
      ...item,
      plan: normalizeFestivalPlan(item.plan),
      selectedFestivalBasis: item.selectedFestivalBasis,
    }));
  } catch {
    return [];
  }
}

function writeScenarios(scenarios: SavedScenario[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
}

function createApiUrl(path: string) {
  if (typeof window !== "undefined" && window.location?.origin && window.location.origin !== "null" && window.location.origin !== "http://localhost") {
    return new URL(path, window.location.origin).toString();
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return new URL(path, window.location.origin).toString();
  }
  return path;
}

// 1. 서버 REST API 시나리오 목록 조회 (실패 시 LocalStorage Fallback)
export async function fetchServerScenarios(): Promise<SavedScenario[]> {
  try {
    const response = await fetch(createApiUrl("/api/scenarios"));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    if (Array.isArray(data.scenarios)) {
      const mapped: SavedScenario[] = data.scenarios.map((item: any) => ({
        id: item.id,
        name: item.title ?? `${item.parameters?.plan?.name ?? "시나리오"}`,
        savedAt: item.created_at ?? new Date().toISOString(),
        selectedHour: item.parameters?.selectedHour ?? 20,
        plan: normalizeFestivalPlan(item.parameters?.plan),
        shareToken: item.share_token,
        selectedFestivalBasis: item.parameters?.selectedFestivalBasis,
      }));

      // 서버 응답 성공 시 LocalStorage에도 최신화
      writeScenarios(mapped);
      return mapped;
    }
  } catch {
    // 백엔드 미가동 또는 쿨다운 시 조용히 LocalStorage 반환
  }

  return readRawScenarios();
}

// 2. 서버 REST API 시나리오 신규 저장
export async function saveServerScenario(
  plan: FestivalPlan,
  selectedHour: number,
  selectedFestivalBasisOrTitle?: SelectedFestivalBasis | null | string,
  title?: string,
): Promise<SavedScenario> {
  const normalizedPlan = normalizeFestivalPlan(plan);
  const selectedFestivalBasis =
    typeof selectedFestivalBasisOrTitle === "string" ? undefined : selectedFestivalBasisOrTitle;
  const localSaved = saveScenario(normalizedPlan, selectedHour, selectedFestivalBasis);
  const scenarioTitle =
    (typeof selectedFestivalBasisOrTitle === "string" ? selectedFestivalBasisOrTitle : title) ??
    localSaved.name;

  try {
    const response = await fetch(createApiUrl("/api/scenarios"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: scenarioTitle,
        description: `${normalizedPlan.region} ${normalizedPlan.venueAddress}`,
        parameters: { plan: normalizedPlan, selectedHour, selectedFestivalBasis },
        results_summary: {
          targetVisitors: normalizedPlan.expectedCapacity,
          budgetKrw: normalizedPlan.totalBudgetMillionKrw * 1000000,
        },
      }),
    });

    if (response.ok) {
      const created = await response.json();
      const serverSaved: SavedScenario = {
        id: created.id,
        name: created.title,
        savedAt: created.created_at,
        selectedHour,
        plan: normalizedPlan,
        shareToken: created.share_token,
        selectedFestivalBasis: created.parameters?.selectedFestivalBasis ?? selectedFestivalBasis ?? undefined,
      };

      const updated = [serverSaved, ...readRawScenarios().filter((i) => i.id !== localSaved.id)].slice(0, 10);
      writeScenarios(updated);
      return serverSaved;
    }
  } catch {
    // 백엔드 미가동 시 로컬 저장 결과 반환
  }

  return localSaved;
}

// 3. 서버 REST API 시나리오 삭제
export async function deleteServerScenario(id: string): Promise<boolean> {
  try {
    await fetch(createApiUrl(`/api/scenarios/${id}`), { method: "DELETE" });
  } catch {
    // ignore
  }

  const filtered = readRawScenarios().filter((item) => item.id !== id);
  writeScenarios(filtered);
  return true;
}

// 4. 공유 토큰 기반 B2G URL 생성 함수 (shareToken 우선, 없으면 scenario.id 사용)
export function getShareUrl(scenario?: Partial<SavedScenario> | string): string {
  if (!scenario) return window.location.href;
  const token = typeof scenario === "string" ? scenario : scenario.shareToken;
  const id = typeof scenario === "object" ? scenario.id : undefined;

  const baseUrl = typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";
  if (token) {
    return `${baseUrl}?share_token=${encodeURIComponent(token)}`;
  }
  if (id) {
    return `${baseUrl}?scenario_id=${encodeURIComponent(id)}`;
  }
  return window.location.href;
}

export function loadScenarios(): SavedScenario[] {
  return readRawScenarios();
}

export function saveScenario(
  plan: FestivalPlan,
  selectedHour: number,
  selectedFestivalBasis?: SelectedFestivalBasis | null,
): SavedScenario {
  const normalizedPlan = normalizeFestivalPlan(plan);
  const savedAt = new Date().toISOString();
  const scenario: SavedScenario = {
    id: `${Date.now()}-${plan.name}`,
    name: `${plan.name} / ${plan.totalBudgetMillionKrw}백만원 / ${plan.expectedCapacity.toLocaleString("ko-KR")}명`,
    savedAt,
    selectedHour,
    plan: normalizedPlan,
    selectedFestivalBasis: selectedFestivalBasis ?? undefined,
  };
  const scenarios = [scenario, ...readRawScenarios()].slice(0, 10);

  writeScenarios(scenarios);

  return scenario;
}

export function clearScenarios() {
  localStorage.removeItem(STORAGE_KEY);
}
