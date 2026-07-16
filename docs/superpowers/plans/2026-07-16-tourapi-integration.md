# TourAPI Integration Implementation Plan

> Superseded: this plan records the earlier browser-side TourAPI integration phase. Current implementation and deployment follow `docs/superpowers/plans/2026-07-16-tourapi-server-proxy.md`; TourAPI credentials must be provided only as the server runtime `TOUR_API_KEY`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect Fest-Twin's tourism evidence flow to Korea Tourism Organization TourAPI while preserving the current sample-data fallback.

**Architecture:** Keep the app as a Vite + React + TypeScript single-page app. Expand `TourismContext` provenance so UI can distinguish real TourAPI data, partial fallback, and sample fallback. Put TourAPI URL construction, response normalization, and fallback handling inside `src/services/tourApiAdapter.ts`, then make `App.tsx` load tourism context asynchronously without breaking forecast, simulation, or report rendering.

**Tech Stack:** Vite, React 18, TypeScript, Vitest, Testing Library, browser `fetch`, Vite env variable `LEGACY_BROWSER_TOUR_API_KEY_DO_NOT_USE`.

## Global Constraints

- Do not commit the actual TourAPI key.
- Store the key only in `.env.local` as `LEGACY_BROWSER_TOUR_API_KEY_DO_NOT_USE`.
- `.env.local` must remain ignored by Git.
- Use `areaCode2`, `searchFestival2`, `detailCommon2`, and `locationBasedList2` only in this phase.
- If the API key is missing, HTTP fails, JSON parsing fails, response shape changes, region mapping fails, or CORS blocks the request, use the existing sample tourism context.
- Keep `collectedPersonalData` as `false`.
- Show data-source status as text, not color alone.
- Do not add a server proxy in this phase.
- Do not add real-time social trend API integration in this phase.
- Do not change forecast, simulation, or report service public signatures.

---

## File Structure

- Modify `src/domain/types.ts`: add optional provenance status fields and TourAPI-specific source type values without breaking existing callers.
- Modify `src/services/tourApiAdapter.ts`: implement TourAPI client helpers, response conversion, fallback behavior, and test seams.
- Modify `src/services/dataAdapters.test.ts`: cover missing-key fallback, response conversion, and failed-fetch fallback.
- Modify `src/components/DataBasisPanel.tsx`: show actual/fallback data status in Korean.
- Modify `src/App.tsx`: load tourism context through `getTourismContext(plan)` instead of importing `sampleTourismContext` directly.
- Modify `src/App.test.tsx`: wait for asynchronous dashboard data to render.
- Modify `.gitignore`: ensure `.env.local` is ignored.
- Create `.env.example`: document `LEGACY_BROWSER_TOUR_API_KEY_DO_NOT_USE` without a real value.
- Modify `README.md`: add TourAPI key setup and warning that frontend env keys are demo-only.
- Modify `docs/demo-verification.md`: add TourAPI fallback and key-based checks.

---

### Task 1: Provenance Status and Fallback Contract

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/services/tourApiAdapter.ts`
- Modify: `src/services/dataAdapters.test.ts`

**Interfaces:**
- Consumes: existing `FestivalPlan`, `TourismContext`, `DataProvenance`.
- Produces: `DataSourceStatus`, extended `DataProvenance`, `createFallbackTourismContext(plan: FestivalPlan, reason: string): TourismContext`.

- [ ] **Step 1: Write failing tests for explicit fallback status**

Replace the first tourism test in `src/services/dataAdapters.test.ts` with this expanded suite while keeping the existing trend test:

```ts
import { describe, expect, it } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import {
  createFallbackTourismContext,
  getTourismContext,
} from "./tourApiAdapter";
import { getTrendContext } from "./trendAdapter";

describe("public data adapters", () => {
  it("returns TourAPI-like fallback data with explicit provenance when no API key is configured", async () => {
    const tourism = await getTourismContext(sampleFestivalPlan);

    expect(tourism.provenance.sourceName).toContain("TourAPI");
    expect(tourism.provenance.sourceStatus).toBe("sample-fallback");
    expect(tourism.provenance.collectedPersonalData).toBe(false);
    expect(tourism.provenance.fallbackReason).toContain("인증키");
    expect(tourism.nearbySpots[0].category).toContain(sampleFestivalPlan.region);
  });

  it("creates a region-aware fallback context with a public-data explanation", () => {
    const tourism = createFallbackTourismContext(sampleFestivalPlan, "테스트 실패");

    expect(tourism.provenance.basisText).toContain("샘플");
    expect(tourism.provenance.fallbackReason).toBe("테스트 실패");
    expect(tourism.nearbySpots.every((spot) => spot.category.includes("서울"))).toBe(true);
  });

  it("returns non-personal trend signals filtered by festival keywords", async () => {
    const trends = await getTrendContext(sampleFestivalPlan);
    const keywords = trends.signals.map((signal) => signal.keyword);

    expect(trends.provenance.collectedPersonalData).toBe(false);
    expect(keywords).toContain("K-POP");
    expect(keywords.every((keyword) => sampleFestivalPlan.keywords.includes(keyword))).toBe(true);
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```powershell
npm run test -- src/services/dataAdapters.test.ts
```

Expected: FAIL because `sourceStatus`, `fallbackReason`, and `createFallbackTourismContext` do not exist.

- [ ] **Step 3: Extend domain types**

Modify `src/domain/types.ts`:

```ts
export type DataSourceStatus =
  | "live"
  | "partial-fallback"
  | "sample-fallback";
```

Then replace `DataProvenance` with:

```ts
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
```

- [ ] **Step 4: Add fallback helper**

Replace `src/services/tourApiAdapter.ts` with:

```ts
import { sampleTourismContext } from "../data/sampleTourApi";
import type { FestivalPlan, TourismContext } from "../domain/types";

export function createFallbackTourismContext(
  plan: FestivalPlan,
  reason: string,
): TourismContext {
  return {
    ...sampleTourismContext,
    provenance: {
      ...sampleTourismContext.provenance,
      sourceStatus: "sample-fallback",
      basisText:
        "TourAPI 형태의 샘플 공공데이터를 사용해 수요 예측 근거를 유지합니다.",
      fallbackReason: reason,
      retrievedAt: new Date().toISOString(),
    },
    nearbySpots: sampleTourismContext.nearbySpots.map((spot) => ({
      ...spot,
      category: `${plan.region} ${spot.category}`,
    })),
  };
}

export async function getTourismContext(plan: FestivalPlan): Promise<TourismContext> {
  const hasTourApiKey = Boolean(import.meta.env.LEGACY_BROWSER_TOUR_API_KEY_DO_NOT_USE);

  if (!hasTourApiKey) {
    return createFallbackTourismContext(plan, "TourAPI 인증키가 없어 샘플 데이터를 사용합니다.");
  }

  return createFallbackTourismContext(
    plan,
    "TourAPI 실제 호출은 다음 작업에서 연결합니다.",
  );
}
```

- [ ] **Step 5: Run the focused test and verify it passes**

Run:

```powershell
npm run test -- src/services/dataAdapters.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 1**

```powershell
git add src/domain/types.ts src/services/tourApiAdapter.ts src/services/dataAdapters.test.ts
git commit -m "feat: add TourAPI provenance fallback contract"
```

---

### Task 2: TourAPI Client, Response Parsing, and Conversion

**Files:**
- Modify: `src/services/tourApiAdapter.ts`
- Modify: `src/services/dataAdapters.test.ts`

**Interfaces:**
- Consumes: `FestivalPlan`, `TourismContext`, `createFallbackTourismContext`.
- Produces: `getTourismContext(plan, options?)`, `mapTourApiItemsToTourismContext(plan, festivalItems, nearbyItems, retrievedAt)`.

- [ ] **Step 1: Add failing tests for conversion and failed live fetch fallback**

Append these tests inside `describe("public data adapters", ...)` in `src/services/dataAdapters.test.ts`:

```ts
import type { TourismContext } from "../domain/types";
```

Then add:

```ts
  it("maps TourAPI festival and location items into the existing tourism context shape", () => {
    const tourism: TourismContext = mapTourApiItemsToTourismContext(
      sampleFestivalPlan,
      [
        {
          contentid: "100",
          title: "한강 K-POP 푸드 축제",
          addr1: "서울특별시 영등포구",
          firstimage: "https://example.com/festival.jpg",
          eventstartdate: "20260918",
          eventenddate: "20260920",
          overview: "한강 먹거리와 K-POP 공연이 함께 열리는 축제",
        },
      ],
      [
        {
          contentid: "200",
          title: "여의도 한강공원",
          contenttypeid: "12",
          dist: "800",
          firstimage: "https://example.com/spot.jpg",
        },
      ],
      "2026-07-16T00:00:00.000Z",
    );

    expect(tourism.provenance.sourceStatus).toBe("live");
    expect(tourism.provenance.retrievedAt).toBe("2026-07-16T00:00:00.000Z");
    expect(tourism.similarFestivals[0]).toMatchObject({
      id: "100",
      name: "한강 K-POP 푸드 축제",
      region: "서울특별시 영등포구",
    });
    expect(tourism.similarFestivals[0].visitors).toBeGreaterThan(0);
    expect(tourism.similarFestivals[0].themeOverlap).toBeGreaterThan(0);
    expect(tourism.nearbySpots[0]).toMatchObject({
      id: "200",
      name: "여의도 한강공원",
      category: "관광지",
      distanceKm: 0.8,
    });
  });

  it("falls back to sample data when the live TourAPI fetch fails", async () => {
    const failingFetch = async () => {
      throw new Error("network blocked");
    };
    const tourism = await getTourismContext(sampleFestivalPlan, {
      apiKey: "demo-key",
      fetchImpl: failingFetch,
    });

    expect(tourism.provenance.sourceStatus).toBe("sample-fallback");
    expect(tourism.provenance.fallbackReason).toContain("TourAPI 호출 실패");
  });
```

Also update the import from `./tourApiAdapter`:

```ts
import {
  createFallbackTourismContext,
  getTourismContext,
  mapTourApiItemsToTourismContext,
} from "./tourApiAdapter";
```

- [ ] **Step 2: Run focused tests and verify they fail**

Run:

```powershell
npm run test -- src/services/dataAdapters.test.ts
```

Expected: FAIL because `mapTourApiItemsToTourismContext` and the `getTourismContext` options parameter are not implemented.

- [ ] **Step 3: Implement TourAPI helpers and conversion**

Replace `src/services/tourApiAdapter.ts` with:

```ts
import { sampleTourismContext } from "../data/sampleTourApi";
import type {
  FestivalPlan,
  SimilarFestival,
  TourismContext,
  TourismSpot,
} from "../domain/types";
import { clamp } from "./forecast";

const TOUR_API_BASE_URL = "https://apis.data.go.kr/B551011/KorService2";
const MOBILE_OS = "ETC";
const MOBILE_APP = "FestTwin";

interface TourApiOptions {
  apiKey?: string;
  fetchImpl?: typeof fetch;
}

interface TourApiItem {
  contentid?: string | number;
  title?: string;
  addr1?: string;
  contenttypeid?: string | number;
  dist?: string | number;
  firstimage?: string;
  eventstartdate?: string;
  eventenddate?: string;
  overview?: string;
  mapx?: string | number;
  mapy?: string | number;
}

interface TourApiAreaCodeItem {
  code?: string;
  name?: string;
}

export function createFallbackTourismContext(
  plan: FestivalPlan,
  reason: string,
): TourismContext {
  return {
    ...sampleTourismContext,
    provenance: {
      ...sampleTourismContext.provenance,
      sourceStatus: "sample-fallback",
      basisText:
        "TourAPI 형태의 샘플 공공데이터를 사용해 수요 예측 근거를 유지합니다.",
      fallbackReason: reason,
      retrievedAt: new Date().toISOString(),
    },
    nearbySpots: sampleTourismContext.nearbySpots.map((spot) => ({
      ...spot,
      category: `${plan.region} ${spot.category}`,
    })),
  };
}

function createTourApiUrl(
  operation: string,
  apiKey: string,
  params: Record<string, string | number | undefined>,
) {
  const url = new URL(`${TOUR_API_BASE_URL}/${operation}`);

  url.searchParams.set("serviceKey", apiKey);
  url.searchParams.set("MobileOS", MOBILE_OS);
  url.searchParams.set("MobileApp", MOBILE_APP);
  url.searchParams.set("_type", "json");

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

function normalizeItems(payload: unknown): TourApiItem[] {
  const body = (payload as { response?: { body?: { items?: { item?: unknown } } } })
    .response?.body;
  const item = body?.items?.item;

  if (!item) return [];
  return Array.isArray(item) ? (item as TourApiItem[]) : [item as TourApiItem];
}

async function fetchTourApiItems(
  operation: string,
  apiKey: string,
  params: Record<string, string | number | undefined>,
  fetchImpl: typeof fetch,
) {
  const response = await fetchImpl(createTourApiUrl(operation, apiKey, params));

  if (!response.ok) {
    throw new Error(`TourAPI ${operation} HTTP ${response.status}`);
  }

  return normalizeItems(await response.json());
}

function contentTypeLabel(contentTypeId: string | number | undefined) {
  const labels: Record<string, string> = {
    "12": "관광지",
    "14": "문화시설",
    "15": "축제·공연·행사",
    "28": "레포츠",
    "38": "쇼핑",
    "39": "음식점",
  };

  return labels[String(contentTypeId ?? "")] ?? "관광지";
}

function distanceToKm(distance: string | number | undefined, fallback: number) {
  const meters = Number(distance);

  if (!Number.isFinite(meters) || meters <= 0) return fallback;
  return Math.round((meters / 1000) * 10) / 10;
}

function textIncludesAnyKeyword(text: string, keywords: string[]) {
  return keywords.filter((keyword) => text.includes(keyword)).length;
}

function estimateVisitors(item: TourApiItem, nearbyCount: number) {
  const hasImageBonus = item.firstimage ? 6000 : 0;
  const hasOverviewBonus = item.overview ? 5000 : 0;
  const durationBonus =
    item.eventstartdate && item.eventenddate && item.eventstartdate !== item.eventenddate
      ? 8000
      : 3000;

  return 18000 + hasImageBonus + hasOverviewBonus + durationBonus + nearbyCount * 1200;
}

function mapNearbySpot(item: TourApiItem, index: number): TourismSpot {
  const distanceKm = distanceToKm(item.dist, index + 1);

  return {
    id: String(item.contentid ?? `spot-${index + 1}`),
    name: item.title ?? `주변 관광지 ${index + 1}`,
    category: contentTypeLabel(item.contenttypeid),
    distanceKm,
    appealScore: Math.round(
      clamp(86 - distanceKm * 7 + (item.firstimage ? 8 : 0), 40, 95),
    ),
  };
}

function mapSimilarFestival(
  plan: FestivalPlan,
  item: TourApiItem,
  nearbyCount: number,
  index: number,
): SimilarFestival {
  const text = `${item.title ?? ""} ${item.overview ?? ""}`;
  const matchedKeywords = textIncludesAnyKeyword(text, plan.keywords);
  const themeOverlap = clamp(0.35 + matchedKeywords * 0.18, 0.35, 0.95);

  return {
    id: String(item.contentid ?? `festival-${index + 1}`),
    name: item.title ?? `유사 축제 ${index + 1}`,
    region: item.addr1 || plan.region,
    visitors: estimateVisitors(item, nearbyCount),
    themeOverlap: Math.round(themeOverlap * 100) / 100,
  };
}

export function mapTourApiItemsToTourismContext(
  plan: FestivalPlan,
  festivalItems: TourApiItem[],
  nearbyItems: TourApiItem[],
  retrievedAt: string,
): TourismContext {
  const nearbySpots = nearbyItems.slice(0, 6).map(mapNearbySpot);
  const similarFestivals = festivalItems
    .slice(0, 5)
    .map((item, index) => mapSimilarFestival(plan, item, nearbySpots.length, index));

  if (nearbySpots.length === 0 || similarFestivals.length === 0) {
    return {
      ...createFallbackTourismContext(
        plan,
        "TourAPI 응답에 예측에 필요한 관광지 또는 축제 데이터가 부족해 샘플을 보완했습니다.",
      ),
      provenance: {
        ...sampleTourismContext.provenance,
        sourceName: "한국관광공사 TourAPI + 샘플 보완",
        sourceStatus: "partial-fallback",
        basisText:
          "실제 TourAPI 조회 결과 일부와 샘플 공공데이터를 함께 사용합니다.",
        fallbackText:
          "TourAPI 응답이 부족한 항목은 기존 샘플 데이터로 보완합니다.",
        fallbackReason: "TourAPI 응답 일부 부족",
        retrievedAt,
      },
      nearbySpots: nearbySpots.length > 0 ? nearbySpots : sampleTourismContext.nearbySpots,
      similarFestivals:
        similarFestivals.length > 0
          ? similarFestivals
          : sampleTourismContext.similarFestivals,
    };
  }

  return {
    provenance: {
      sourceName: "한국관광공사 TourAPI",
      sourceType: "public-data",
      sourceStatus: "live",
      basisText:
        "TourAPI 행사정보와 위치기반 관광정보를 실제 조회해 수요 예측 근거로 사용합니다.",
      fallbackText:
        "호출 실패 또는 응답 부족 시 TourAPI 형태의 샘플 데이터를 사용합니다.",
      retrievedAt,
      collectedPersonalData: false,
    },
    nearbySpots,
    similarFestivals,
  };
}

async function resolveAreaCode(
  plan: FestivalPlan,
  apiKey: string,
  fetchImpl: typeof fetch,
) {
  const items = (await fetchTourApiItems(
    "areaCode2",
    apiKey,
    { numOfRows: 50, pageNo: 1 },
    fetchImpl,
  )) as TourApiAreaCodeItem[];

  return items.find((item) => item.name && plan.region.includes(item.name))?.code;
}

export async function getTourismContext(
  plan: FestivalPlan,
  options: TourApiOptions = {},
): Promise<TourismContext> {
  const apiKey = options.apiKey ?? import.meta.env.LEGACY_BROWSER_TOUR_API_KEY_DO_NOT_USE;
  const fetchImpl = options.fetchImpl ?? fetch;

  if (!apiKey) {
    return createFallbackTourismContext(
      plan,
      "TourAPI 인증키가 없어 샘플 데이터를 사용합니다.",
    );
  }

  try {
    const areaCode = await resolveAreaCode(plan, apiKey, fetchImpl);

    if (!areaCode) {
      return createFallbackTourismContext(
        plan,
        "TourAPI 지역 코드 매핑에 실패해 샘플 데이터를 사용합니다.",
      );
    }

    const festivalItems = await fetchTourApiItems(
      "searchFestival2",
      apiKey,
      {
        numOfRows: 10,
        pageNo: 1,
        arrange: "A",
        areaCode,
        eventStartDate: plan.startDate.replaceAll("-", ""),
      },
      fetchImpl,
    );
    const detailItems = await Promise.all(
      festivalItems.slice(0, 5).map((item) =>
        fetchTourApiItems(
          "detailCommon2",
          apiKey,
          {
            contentId: item.contentid,
            defaultYN: "Y",
            firstImageYN: "Y",
            addrinfoYN: "Y",
            mapinfoYN: "Y",
            overviewYN: "Y",
          },
          fetchImpl,
        ).then((items) => ({ ...item, ...items[0] })),
      ),
    );
    const firstLocatedItem = detailItems.find((item) => item.mapx && item.mapy);
    const nearbyItems = firstLocatedItem
      ? await fetchTourApiItems(
          "locationBasedList2",
          apiKey,
          {
            numOfRows: 10,
            pageNo: 1,
            arrange: "E",
            mapX: firstLocatedItem.mapx,
            mapY: firstLocatedItem.mapy,
            radius: 5000,
          },
          fetchImpl,
        )
      : [];

    return mapTourApiItemsToTourismContext(
      plan,
      detailItems,
      nearbyItems,
      new Date().toISOString(),
    );
  } catch {
    return createFallbackTourismContext(
      plan,
      "TourAPI 호출 실패로 샘플 데이터를 사용합니다.",
    );
  }
}
```

- [ ] **Step 4: Fix test imports**

At the top of `src/services/dataAdapters.test.ts`, ensure imports are:

```ts
import { describe, expect, it } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import type { TourismContext } from "../domain/types";
import {
  createFallbackTourismContext,
  getTourismContext,
  mapTourApiItemsToTourismContext,
} from "./tourApiAdapter";
import { getTrendContext } from "./trendAdapter";
```

- [ ] **Step 5: Run focused tests and verify they pass**

Run:

```powershell
npm run test -- src/services/dataAdapters.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 2**

```powershell
git add src/services/tourApiAdapter.ts src/services/dataAdapters.test.ts
git commit -m "feat: map TourAPI responses to tourism context"
```

---

### Task 3: Async App Wiring and Data Basis Status UI

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/components/DataBasisPanel.tsx`

**Interfaces:**
- Consumes: `getTourismContext(plan): Promise<TourismContext>`, `DataProvenance.sourceStatus`.
- Produces: dashboard that loads live/fallback tourism context asynchronously and displays status text.

- [ ] **Step 1: Write failing UI expectations**

Replace `src/App.test.tsx` with:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders the government-guided Fest-Twin MVP dashboard", async () => {
    render(<App />);

    expect(screen.getByText("페스트트윈(Fest-Twin)")).toBeInTheDocument();
    expect(screen.getByText("정부 지침 반영 현황")).toBeInTheDocument();
    expect(screen.getByText("축제 기획안 입력")).toBeInTheDocument();
    expect(screen.getByText("데이터 근거")).toBeInTheDocument();
    expect(await screen.findByText("샘플 데이터 대체 사용")).toBeInTheDocument();
    expect(screen.getByText("시간대별 수요 예측")).toBeInTheDocument();
    expect(screen.getByText("혼잡도 시뮬레이션")).toBeInTheDocument();
    expect(screen.getByText("기획 보완 리포트")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run app test and verify it fails**

Run:

```powershell
npm run test -- src/App.test.tsx
```

Expected: FAIL because `샘플 데이터 대체 사용` is not rendered.

- [ ] **Step 3: Update DataBasisPanel status rendering**

Replace `src/components/DataBasisPanel.tsx` with:

```tsx
import type { DataSourceStatus, TourismContext, TrendContext } from "../domain/types";

interface DataBasisPanelProps {
  tourism: TourismContext;
  trends: TrendContext;
}

function statusLabel(status: DataSourceStatus | undefined) {
  if (status === "live") return "실제 TourAPI 조회 성공";
  if (status === "partial-fallback") return "실제 TourAPI 일부 조회 및 샘플 보완";
  return "샘플 데이터 대체 사용";
}

export function DataBasisPanel({ tourism, trends }: DataBasisPanelProps) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>데이터 근거</h2>
        <span>{statusLabel(tourism.provenance.sourceStatus)}</span>
      </div>
      <ul className="evidence-list">
        <li>
          {tourism.provenance.sourceName}: {tourism.provenance.basisText}
        </li>
        <li>TourAPI 상태: {statusLabel(tourism.provenance.sourceStatus)}</li>
        {tourism.provenance.retrievedAt ? (
          <li>
            데이터 기준 시점:{" "}
            {new Date(tourism.provenance.retrievedAt).toLocaleString("ko-KR")}
          </li>
        ) : null}
        <li>{tourism.provenance.fallbackText}</li>
        {tourism.provenance.fallbackReason ? (
          <li>대체 사유: {tourism.provenance.fallbackReason}</li>
        ) : null}
        <li>
          {trends.provenance.sourceName}: {trends.provenance.basisText}
        </li>
        <li>개인정보 수집 여부: 수집하지 않음</li>
      </ul>
    </section>
  );
}
```

- [ ] **Step 4: Wire App to async tourism adapter**

Replace `src/App.tsx` with:

```tsx
import { useEffect, useMemo, useState } from "react";
import { DataBasisPanel } from "./components/DataBasisPanel";
import { ForecastChart } from "./components/ForecastChart";
import { GovernmentHeader } from "./components/GovernmentHeader";
import { GovernmentReadinessPanel } from "./components/GovernmentReadinessPanel";
import { Heatmap } from "./components/Heatmap";
import { PlanForm } from "./components/PlanForm";
import { ReportView } from "./components/ReportView";
import { RiskPanel } from "./components/RiskPanel";
import { ScenarioLibrary } from "./components/ScenarioLibrary";
import { ScenarioControls } from "./components/ScenarioControls";
import { SummaryCards } from "./components/SummaryCards";
import { sampleFestivalPlan } from "./data/sampleFestivalPlan";
import { sampleTourismContext } from "./data/sampleTourApi";
import { sampleTrendContext } from "./data/sampleTrends";
import { createForecast } from "./services/forecast";
import { createPlanningReport } from "./services/report";
import { createSimulation } from "./services/simulation";
import { getTourismContext } from "./services/tourApiAdapter";

export function App() {
  const [plan, setPlan] = useState(sampleFestivalPlan);
  const [selectedHour, setSelectedHour] = useState(20);
  const [tourism, setTourism] = useState(sampleTourismContext);

  useEffect(() => {
    let isCurrent = true;

    getTourismContext(plan).then((nextTourism) => {
      if (isCurrent) {
        setTourism(nextTourism);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [plan]);

  const forecast = useMemo(
    () => createForecast(plan, tourism, sampleTrendContext),
    [plan, tourism],
  );
  const simulation = useMemo(
    () => createSimulation(plan, forecast, selectedHour),
    [forecast, plan, selectedHour],
  );
  const report = useMemo(
    () => createPlanningReport(plan, forecast, simulation),
    [forecast, plan, simulation],
  );

  return (
    <main className="app-shell">
      <GovernmentHeader />
      <GovernmentReadinessPanel />
      <SummaryCards forecast={forecast} simulation={simulation} report={report} />
      <div className="workspace-grid">
        <aside className="left-column">
          <PlanForm plan={plan} onPlanChange={setPlan} />
          <ScenarioControls
            hours={plan.operatingHours}
            selectedHour={selectedHour}
            onSelectedHourChange={setSelectedHour}
          />
          <ScenarioLibrary
            plan={plan}
            selectedHour={selectedHour}
            onLoadScenario={(scenario) => {
              setPlan(scenario.plan);
              setSelectedHour(scenario.selectedHour);
            }}
          />
          <DataBasisPanel tourism={tourism} trends={sampleTrendContext} />
        </aside>
        <section className="main-column">
          <ForecastChart forecast={forecast} />
          <Heatmap plan={plan} simulation={simulation} />
        </section>
        <aside className="right-column">
          <RiskPanel report={report} />
        </aside>
      </div>
      <ReportView report={report} />
    </main>
  );
}
```

- [ ] **Step 5: Run UI tests and full tests**

Run:

```powershell
npm run test -- src/App.test.tsx
npm run test
```

Expected: both commands PASS.

- [ ] **Step 6: Commit Task 3**

```powershell
git add src/App.tsx src/App.test.tsx src/components/DataBasisPanel.tsx
git commit -m "feat: show TourAPI data source status"
```

---

### Task 4: Environment, Documentation, and Build Verification

**Files:**
- Modify: `.gitignore`
- Create: `.env.example`
- Modify: `README.md`
- Modify: `docs/demo-verification.md`

**Interfaces:**
- Consumes: `LEGACY_BROWSER_TOUR_API_KEY_DO_NOT_USE`, current npm scripts.
- Produces: documented local setup and verification path without committing secrets.

- [ ] **Step 1: Verify `.env.local` is ignored**

Run:

```powershell
git check-ignore .env.local
```

Expected: exit code 0 and output `.env.local`. If it does not print `.env.local`, continue to Step 2.

- [ ] **Step 2: Add environment ignore and example**

If `.env.local` is not already ignored, add these lines to `.gitignore`:

```gitignore
.env
.env.local
.env.*.local
```

Create `.env.example`:

```env
LEGACY_BROWSER_TOUR_API_KEY_DO_NOT_USE=replace-with-your-tourapi-service-key
```

- [ ] **Step 3: Update README TourAPI setup**

Add this section after the local run commands in `README.md`:

```md
## TourAPI 실제 연동

한국관광공사 TourAPI 활용 신청을 완료했다면 로컬에 `.env.local`을 만들고 다음 값을 넣습니다.

```env
LEGACY_BROWSER_TOUR_API_KEY_DO_NOT_USE=발급받은_일반_인증키
```

앱은 `areaCode2`, `searchFestival2`, `detailCommon2`, `locationBasedList2`를 우선 사용합니다. 인증키가 없거나 호출에 실패하면 기존 TourAPI 형태의 샘플 데이터로 자동 대체됩니다.

주의: Vite의 `VITE_` 환경변수는 브라우저 번들에 포함될 수 있으므로 이 방식은 데모와 로컬 개발용입니다. 공개 배포 또는 운영 전에는 서버 프록시를 도입해 인증키가 브라우저에 노출되지 않게 해야 합니다.
```
```

- [ ] **Step 4: Update demo verification**

Add this section to `docs/demo-verification.md` before `## 집에서 재확인`:

```md
## TourAPI 실제 연동 확인

- [ ] `.env.local`이 없는 상태에서 앱이 샘플 데이터 대체 사용 상태로 정상 렌더링된다.
- [ ] `.env.local`에 `LEGACY_BROWSER_TOUR_API_KEY_DO_NOT_USE`를 넣은 상태에서 앱이 TourAPI 호출을 시도한다.
- [ ] TourAPI 호출이 성공하면 데이터 근거 패널에 실제 TourAPI 조회 성공 또는 일부 조회 및 샘플 보완 상태가 표시된다.
- [ ] TourAPI 호출이 실패해도 수요 예측, 혼잡도 시뮬레이션, 기획 보완 리포트가 유지된다.
- [ ] 실제 인증키는 Git 변경 목록에 포함되지 않는다.
```

- [ ] **Step 5: Run full verification**

Run:

```powershell
npm run test
npm run build
git status --short
```

Expected:

- `npm run test`: PASS
- `npm run build`: PASS
- `git status --short`: only intended docs/env-example changes are present before commit

- [ ] **Step 6: Commit Task 4**

```powershell
git add .gitignore .env.example README.md docs/demo-verification.md
git commit -m "docs: document TourAPI local setup"
```

---

## Final Verification

- [ ] Run all tests:

```powershell
npm run test
```

Expected: PASS.

- [ ] Run production build:

```powershell
npm run build
```

Expected: PASS.

- [ ] Confirm no secret is staged or committed:

```powershell
git status --short
$tourApiKey = $env:LEGACY_BROWSER_TOUR_API_KEY_DO_NOT_USE
if ([string]::IsNullOrWhiteSpace($tourApiKey)) {
  Write-Output "LEGACY_BROWSER_TOUR_API_KEY_DO_NOT_USE is not set; secret scan skipped."
} else {
  git grep -n --fixed-strings -- $tourApiKey
  if ($LASTEXITCODE -eq 1) {
    Write-Output "No matches for the environment-provided LEGACY_BROWSER_TOUR_API_KEY_DO_NOT_USE value."
  }
  exit $LASTEXITCODE
}
```

Expected: `git status --short` is clean after commits, and the guarded scan reports no matches for the environment-provided `LEGACY_BROWSER_TOUR_API_KEY_DO_NOT_USE` value when the variable is non-empty.

- [ ] Optional local live check with the user's key:

Create `.env.local` locally with:

```env
LEGACY_BROWSER_TOUR_API_KEY_DO_NOT_USE=<actual key>
```

Run:

```powershell
npm run dev -- --port 5173
```

Expected: dashboard renders at `http://127.0.0.1:5173/`; the data basis panel reports live, partial fallback, or sample fallback without breaking the dashboard.
