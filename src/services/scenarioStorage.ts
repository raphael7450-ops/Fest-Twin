/**
 * 파일 : src/services/scenarioStorage.ts
 * 내용 : SQLite REST API 영속 저장소 동기화 및 브라우저 LocalStorage Graceful Fallback 서비스
 * 수정 : 2026-07-24. REST API 연동, share_token 공유 링크 복사 지원 및 하이브리드 동기화 구현
 */

import type { FestivalPlan, SelectedFestivalBasis } from "../domain/types";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";

const STORAGE_KEY = "fest-twin-scenarios";

export interface SavedScenario {
  id: string;
  name: string;
  savedAt: string;
  selectedHour: number;
  plan: FestivalPlan;
  selectedFestivalBasis?: SelectedFestivalBasis | null;
  shareToken?: string;
}

export function normalizeFestivalPlan(rawPlan: any): FestivalPlan {
  if (!rawPlan || typeof rawPlan !== "object") {
    return { ...sampleFestivalPlan };
  }
  return {
    name: rawPlan.name ?? rawPlan.title ?? sampleFestivalPlan.name,
    region: rawPlan.region ?? sampleFestivalPlan.region,
    venueAddress: rawPlan.venueAddress ?? sampleFestivalPlan.venueAddress,
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

export function normalizeSelectedFestivalBasis(rawBasis: any): SelectedFestivalBasis | null {
  if (!rawBasis || typeof rawBasis !== "object") return null;
  const contentId = typeof rawBasis.contentId === "string" ? rawBasis.contentId.trim() : "";
  const title = typeof rawBasis.title === "string" ? rawBasis.title.trim() : "";
  const address = typeof rawBasis.address === "string" ? rawBasis.address.trim() : "";
  const startDate = typeof rawBasis.startDate === "string" ? rawBasis.startDate : "";
  const endDate = typeof rawBasis.endDate === "string" ? rawBasis.endDate : "";

  if (!contentId || !title || !address) return null;

  return {
    contentId,
    title,
    address,
    startDate,
    endDate,
    mapX: typeof rawBasis.mapX === "string" ? rawBasis.mapX : undefined,
    mapY: typeof rawBasis.mapY === "string" ? rawBasis.mapY : undefined,
    sourceName:
      typeof rawBasis.sourceName === "string" && rawBasis.sourceName.trim()
        ? rawBasis.sourceName
        : "TourAPI selected festival candidate",
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
      selectedFestivalBasis: normalizeSelectedFestivalBasis(item.selectedFestivalBasis),
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
        selectedFestivalBasis: normalizeSelectedFestivalBasis(item.parameters?.selectedFestivalBasis),
        shareToken: item.share_token,
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
  title?: string,
  selectedFestivalBasis?: SelectedFestivalBasis | null,
): Promise<SavedScenario> {
  const localSaved = saveScenario(plan, selectedHour, selectedFestivalBasis);
  const scenarioTitle =
    title ?? localSaved.name;

  try {
    const response = await fetch(createApiUrl("/api/scenarios"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: scenarioTitle,
        description: `${plan.region} ${plan.venueAddress}`,
        parameters: { plan, selectedHour, selectedFestivalBasis: selectedFestivalBasis ?? null },
        results_summary: {
          targetVisitors: plan.expectedCapacity,
          budgetKrw: plan.totalBudgetMillionKrw * 1000000,
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
        plan,
        selectedFestivalBasis: selectedFestivalBasis ?? null,
        shareToken: created.share_token,
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
  const savedAt = new Date().toISOString();
  const scenario: SavedScenario = {
    id: `${Date.now()}-${plan.name}`,
    name: `${plan.name} / ${plan.totalBudgetMillionKrw}백만원 / ${plan.expectedCapacity.toLocaleString("ko-KR")}명`,
    savedAt,
    selectedHour,
    plan,
    selectedFestivalBasis: selectedFestivalBasis ?? null,
  };
  const scenarios = [scenario, ...readRawScenarios()].slice(0, 10);

  writeScenarios(scenarios);

  return scenario;
}

export function clearScenarios() {
  localStorage.removeItem(STORAGE_KEY);
}
