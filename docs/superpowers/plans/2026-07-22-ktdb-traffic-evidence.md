# KTDB Traffic Evidence Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Goal: Integrate KTDB/View-T road-link traffic volume into Fest-Twin so safety/logistics planning can show access traffic risk, parking-pressure adjustment, and source-detail evidence.

Architecture: Add a server-side `/api/traffic/selected-link` proxy modeled after the existing TourAPI proxy, then add a client `trafficAdapter` that maps festival plans to representative road links and normalizes View-T responses into `TrafficContext`. Pass `TrafficContext` into safety/logistics metrics and metric evidence composition, then render access traffic risk in the dashboard and evidence drawer.

Tech Stack: React, TypeScript, Vite, Vitest, Testing Library, Express, Docker, KTDB/View-T public API.

## Global Constraints

- Treat KTDB/View-T traffic as `기준년도 교통량 기반 접근 리스크`, not real-time traffic.
- Do not collect personal movement paths, vehicle numbers, device locations, or any personal data.
- Do not expose external raw URLs, server environment values, `serviceKey`, `clientSecret`, `Authorization`, `Cookie`, or secret-bearing URLs.
- Preserve the region-first TourAPI lookup flow and existing TourAPI proxy behavior.
- Use manual/sample `LINKID` mapping in the first implementation; do not implement Shape-file automatic road matching.
- Fallback states must still produce visible source-detail evidence explaining which sample link and assumptions were used.
- End with `npm run test`, `$env:VITE_VWORLD_API_KEY='your_vworld_api_key'; npm run build`, GitHub push, and remote Docker deployment verification.

---

## File Structure

- Create `server/trafficProxy.js`
  - Express router for `/api/traffic/selected-link`.
  - Validates `linkId`, `year`, `weekType`, and `time`.
  - Converts app query params into View-T query params.

- Modify `server/index.js`
  - Mount the traffic proxy under `/api/traffic`.

- Create `server/trafficProxy.test.ts`
  - Tests validation, upstream URL generation, and failure mapping.

- Modify `src/domain/types.ts`
  - Add `TrafficSourceStatus`, `TrafficRiskLabel`, `TrafficLinkRecord`, and `TrafficContext`.
  - Extend `EvidenceSourceType` with `"ktdb"` so KTDB/View-T evidence is not mislabeled as TourAPI evidence.

- Create `src/data/sampleTraffic.ts`
  - Contains manual `LINKID` mappings and fallback sample traffic context.

- Create `src/services/trafficAdapter.ts`
  - Resolves plan to representative traffic mapping.
  - Calls `/api/traffic/selected-link`.
  - Normalizes traffic response into `TrafficContext`.
  - Creates source-detail evidence.

- Create `src/services/trafficAdapter.test.ts`
  - Tests live normalization, mapping fallback, sample fallback, and evidence safety.

- Modify `src/services/impactMetrics.ts`
  - Accept optional `TrafficContext`.
  - Add access traffic risk and parking adjustment to `SafetyLogisticsMetrics`.

- Modify `src/services/metricEvidence.ts`
  - Accept `traffic: TrafficContext`.
  - Add traffic source details to parking and safety-related evidence.

- Modify `src/App.tsx`
  - Load traffic context when region, venue address, date, or selected hour changes.
  - Pass traffic into safety metrics and evidence.

- Modify `src/components/SafetyLogisticsPanel.tsx`
  - Render `접근 교통 위험도`.

- Modify `src/styles.css`
  - Add safety panel traffic-risk styling and `source-type-ktdb` evidence badge styling.

- Modify `src/App.test.tsx` for traffic UI behavior.
- Modify `src/services/metricEvidence.test.ts` for traffic evidence composition.
- Do not modify `src/services/forecast.test.ts`; forecast logic should continue to depend on tourism and trend context only.

- Modify `docs/data-methodology.md`
  - Add KTDB/View-T traffic data method and limitations.

---

### Task 1: Server Traffic Proxy

Files:
- Create: `server/trafficProxy.js`
- Modify: `server/index.js`
- Create: `server/trafficProxy.test.ts`

Interfaces:
- Produces: `createTrafficProxyRouter(options?: { fetchImpl?: typeof fetch })`.
- Produces endpoint: `GET /api/traffic/selected-link?linkId=<LINKID>&year=<YEAR>&weekType=<weekday|weekend>&time=<HH|ALL>`.

- [ ] Step 1: Write the failing proxy test

Create `server/trafficProxy.test.ts`:

```ts
import express from "express";
import { describe, expect, it, vi } from "vitest";
import { createTrafficProxyRouter } from "./trafficProxy.js";

function jsonResponse(payload: unknown, options: { ok?: boolean; status?: number } = {}) {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: async () => payload,
  } as Response;
}

async function request(path: string, fetchImpl: typeof fetch) {
  const app = express();
  app.use("/api/traffic", createTrafficProxyRouter({ fetchImpl }));
  const server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Test server did not start on a TCP port");
  }

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`);
    const body = await response.json();
    return { response, body };
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

describe("KTDB/View-T traffic proxy", () => {
  it("forwards a selected-link request with validated View-T parameters", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        result: [
          {
            LINKID: "12345",
            ROAD_NAME: "테헤란로",
            ROAD_RANK: "주간선도로",
            LANES: 6,
            VALUE_IN: 3200,
            VALUE_OUT: 2800,
          },
        ],
      }),
    );

    const { response, body } = await request(
      "/api/traffic/selected-link?linkId=12345&year=2025&weekType=weekend&time=20",
      fetchMock as unknown as typeof fetch,
    );

    expect(response.status).toBe(200);
    expect(body.result[0].LINKID).toBe("12345");

    const upstreamUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(upstreamUrl.origin).toBe("https://viewt.ktdb.go.kr");
    expect(upstreamUrl.pathname).toBe("/cong/api/moveAPI.do");
    expect(upstreamUrl.searchParams.get("url")).toBe("detail_selectedLink_road");
    expect(upstreamUrl.searchParams.get("LINKID")).toBe("12345");
    expect(upstreamUrl.searchParams.get("YEAR")).toBe("2025");
    expect(upstreamUrl.searchParams.get("WEEKTYPE")).toBe("2");
    expect(upstreamUrl.searchParams.get("TIME")).toBe("20");
  });

  it.each([
    ["/api/traffic/selected-link?linkId=&year=2025&weekType=weekend&time=20"],
    ["/api/traffic/selected-link?linkId=https://evil.test/?serviceKey=x&year=2025&weekType=weekend&time=20"],
    ["/api/traffic/selected-link?linkId=12345&year=2026&weekType=weekend&time=20"],
    ["/api/traffic/selected-link?linkId=12345&year=2025&weekType=holiday&time=20"],
    ["/api/traffic/selected-link?linkId=12345&year=2025&weekType=weekend&time=Infinity"],
    ["/api/traffic/selected-link?linkId=12345&year=2025&weekType=weekend&time=24"],
    ["/api/traffic/selected-link?linkId=12345&year=2025&weekType=weekend&time=20&serviceKey=x"],
  ])("rejects invalid selected-link query %s", async (path) => {
    const fetchMock = vi.fn();
    const { response, body } = await request(path, fetchMock as unknown as typeof fetch);

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_QUERY");
    expect(JSON.stringify(body)).not.toContain("serviceKey");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps upstream failures without leaking raw URLs", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}, { ok: false, status: 502 }));

    const { response, body } = await request(
      "/api/traffic/selected-link?linkId=12345&year=2025&weekType=weekday&time=ALL",
      fetchMock as unknown as typeof fetch,
    );

    expect(response.status).toBe(502);
    expect(body.error.code).toBe("TRAFFIC_UPSTREAM_ERROR");
    expect(JSON.stringify(body)).not.toContain("viewt.ktdb.go.kr");
  });
});
```

- [ ] Step 2: Run the failing proxy test

Run:

```bash
npx vitest run --config vitest.config.ts server/trafficProxy.test.ts
```

Expected: FAIL because `server/trafficProxy.js` does not exist.

- [ ] Step 3: Implement the traffic proxy

Create `server/trafficProxy.js`:

```js
import express from "express";

const VIEWT_BASE_URL = "https://viewt.ktdb.go.kr/cong/api/moveAPI.do";
const ALLOWED_QUERY_KEYS = new Set(["linkId", "year", "weekType", "time"]);
const YEAR_MIN = 2019;
const YEAR_MAX = 2025;

function errorResponse(response, status, code, message) {
  return response.status(status).json({
    error: { code, message },
  });
}

function isScalar(value) {
  return !Array.isArray(value) && typeof value !== "object";
}

function isSafeLinkId(value) {
  return typeof value === "string" && /^[A-Za-z0-9_-]+$/.test(value);
}

function isValidYear(value) {
  return (
    typeof value === "string" &&
    /^\d{4}$/.test(value) &&
    Number(value) >= YEAR_MIN &&
    Number(value) <= YEAR_MAX
  );
}

function isValidWeekType(value) {
  return value === "weekday" || value === "weekend";
}

function isValidTime(value) {
  return value === "ALL" || (/^\d{1,2}$/.test(value) && Number(value) >= 0 && Number(value) <= 23);
}

function validateQuery(query) {
  for (const key of Object.keys(query)) {
    if (!ALLOWED_QUERY_KEYS.has(key)) {
      return { ok: false, message: "Unsupported traffic query parameter." };
    }
    if (!isScalar(query[key])) {
      return { ok: false, message: "Traffic query parameter must be a scalar value." };
    }
  }

  const { linkId, year, weekType, time } = query;

  if (!isSafeLinkId(linkId)) {
    return { ok: false, message: "Traffic linkId is invalid." };
  }
  if (!isValidYear(year)) {
    return { ok: false, message: "Traffic year is invalid." };
  }
  if (!isValidWeekType(weekType)) {
    return { ok: false, message: "Traffic weekType is invalid." };
  }
  if (!isValidTime(time)) {
    return { ok: false, message: "Traffic time is invalid." };
  }

  return { ok: true };
}

function weekTypeToViewT(value) {
  return value === "weekend" ? "2" : "1";
}

function buildViewTUrl(query) {
  const url = new URL(VIEWT_BASE_URL);

  url.searchParams.set("url", "detail_selectedLink_road");
  url.searchParams.set("LINKID", String(query.linkId));
  url.searchParams.set("YEAR", String(query.year));
  url.searchParams.set("WEEKTYPE", weekTypeToViewT(query.weekType));
  url.searchParams.set("TIME", String(query.time));

  return url;
}

export function createTrafficProxyRouter(options = {}) {
  const router = express.Router();
  const fetchImpl = options.fetchImpl ?? fetch;

  router.get("/selected-link", async (request, response) => {
    const validation = validateQuery(request.query);
    if (!validation.ok) {
      return errorResponse(response, 400, "INVALID_QUERY", validation.message);
    }

    try {
      const upstreamResponse = await fetchImpl(buildViewTUrl(request.query));
      if (!upstreamResponse.ok) {
        return errorResponse(
          response,
          502,
          "TRAFFIC_UPSTREAM_ERROR",
          "Traffic upstream request failed.",
        );
      }

      return response.status(200).json(await upstreamResponse.json());
    } catch (error) {
      const code = error instanceof SyntaxError
        ? "TRAFFIC_INVALID_RESPONSE"
        : "TRAFFIC_UPSTREAM_ERROR";
      return errorResponse(response, 502, code, "Traffic proxy request failed.");
    }
  });

  return router;
}
```

- [ ] Step 4: Mount the router

Modify `server/index.js`:

```js
import { createTrafficProxyRouter } from "./trafficProxy.js";
```

Inside `createApp`, add after `/api/tour`:

```js
app.use(
  "/api/traffic",
  createTrafficProxyRouter({
    fetchImpl: options.fetchImpl,
  }),
);
```

- [ ] Step 5: Run proxy tests

Run:

```bash
npx vitest run --config vitest.config.ts server/trafficProxy.test.ts server/tourProxy.test.ts
```

Expected: PASS.

- [ ] Step 6: Commit

```bash
git add server/trafficProxy.js server/trafficProxy.test.ts server/index.js
git commit -m "feat: add KTDB traffic proxy"
```

---

### Task 2: Traffic Domain And Adapter

Files:
- Modify: `src/domain/types.ts`
- Create: `src/data/sampleTraffic.ts`
- Create: `src/services/trafficAdapter.ts`
- Create: `src/services/trafficAdapter.test.ts`

Interfaces:
- Produces: `TrafficContext`.
- Produces: `getTrafficContext(plan: FestivalPlan, options?: { fetchImpl?: typeof fetch; signal?: AbortSignal; hour?: number }): Promise<TrafficContext>`.
- Produces: `createFallbackTrafficContext(plan: FestivalPlan, reason: string, hour?: number): TrafficContext`.

- [ ] Step 1: Write the failing adapter test

Create `src/services/trafficAdapter.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import {
  createFallbackTrafficContext,
  getTrafficContext,
} from "./trafficAdapter";

function jsonResponse(payload: unknown, options: { ok?: boolean; status?: number } = {}) {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: async () => payload,
  } as Response;
}

describe("trafficAdapter", () => {
  it("loads KTDB/View-T link traffic as a normalized traffic context", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        result: [
          {
            LINKID: "TEHERAN-001",
            ROAD_NAME: "테헤란로",
            ROAD_RANK: "주간선도로",
            LANES: "6",
            VALUE_IN: "3200",
            VALUE_OUT: "2800",
          },
        ],
      }),
    );

    const traffic = await getTrafficContext(sampleFestivalPlan, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      hour: 20,
    });

    expect(traffic.status).toBe("live");
    expect(traffic.year).toBe(2025);
    expect(traffic.weekType).toBe("weekend");
    expect(traffic.time).toBe("20");
    expect(traffic.links[0]).toMatchObject({
      linkId: "TEHERAN-001",
      roadName: "테헤란로",
      inboundVolume: 3200,
      outboundVolume: 2800,
      totalVolume: 6000,
    });
    expect(traffic.riskScore).toBeGreaterThan(0);
    expect(JSON.stringify(traffic.sourceDetails)).toContain("KTDB/View-T 도로 교통량 조회");

    const requestUrl = new URL(String(fetchImpl.mock.calls[0][0]), "http://localhost");
    expect(requestUrl.pathname).toBe("/api/traffic/selected-link");
    expect(requestUrl.searchParams.get("linkId")).toBe("TEHERAN-001");
    expect(requestUrl.searchParams.get("year")).toBe("2025");
    expect(requestUrl.searchParams.get("weekType")).toBe("weekend");
    expect(requestUrl.searchParams.get("time")).toBe("20");
  });

  it("returns sample fallback evidence when no mapping or upstream data is available", async () => {
    const plan = {
      ...sampleFestivalPlan,
      region: "매핑없는지역",
      venueAddress: "매핑없는주소",
    };
    const fetchImpl = vi.fn();

    const traffic = await getTrafficContext(plan, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      hour: 14,
    });

    expect(traffic.status).toBe("sample-fallback");
    expect(traffic.links.length).toBeGreaterThan(0);
    expect(traffic.sourceDetails[0].sourceType).toBe("sample");
    expect(JSON.stringify(traffic.sourceDetails)).toContain("샘플 교통량");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("creates fallback traffic context without personal data", () => {
    const traffic = createFallbackTrafficContext(sampleFestivalPlan, "테스트 fallback", 18);

    expect(traffic.provenance.collectedPersonalData).toBe(false);
    expect(traffic.provenance.fallbackReason).toBe("테스트 fallback");
    expect(JSON.stringify(traffic.sourceDetails)).not.toMatch(
      /serviceKey|clientSecret|Authorization|Cookie/i,
    );
  });
});
```

- [ ] Step 2: Run failing adapter tests

Run:

```bash
npm run test -- src/services/trafficAdapter.test.ts
```

Expected: FAIL because traffic adapter files do not exist.

- [ ] Step 3: Add domain types

Modify `src/domain/types.ts`:

```ts
export type EvidenceSourceType = "tourapi" | "ktdb" | "user-input" | "derived" | "sample";

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
```

- [ ] Step 4: Create sample traffic data

Create `src/data/sampleTraffic.ts`:

```ts
import type { MetricEvidenceSourceDetail, TrafficContext } from "../domain/types";

export interface TrafficLinkMapping {
  id: string;
  regionKeyword: string;
  venueKeyword?: string;
  linkId: string;
  roadName: string;
  note: string;
}

export const trafficLinkMappings: TrafficLinkMapping[] = [
  {
    id: "gangnam-teheran",
    regionKeyword: "서울",
    venueKeyword: "강남",
    linkId: "TEHERAN-001",
    roadName: "테헤란로",
    note: "강남권 축제 데모용 대표 접근 도로 링크입니다.",
  },
  {
    id: "gwanghwamun-sejong",
    regionKeyword: "서울",
    venueKeyword: "광화문",
    linkId: "SEJONG-001",
    roadName: "세종대로",
    note: "광화문권 축제 데모용 대표 접근 도로 링크입니다.",
  },
];

export const sampleTrafficSourceDetails: MetricEvidenceSourceDetail[] = [
  {
    sourceId: "sample-traffic-link",
    sourceName: "샘플 교통량 근거",
    sourceType: "sample",
    statusLabel: "샘플 교통량 사용",
    endpoint: "/api/traffic/selected-link",
    query: [
      { label: "linkId", value: "TEHERAN-001" },
      { label: "year", value: "2025" },
      { label: "weekType", value: "weekend" },
      { label: "time", value: "20" },
    ],
    records: [
      {
        label: "테헤란로",
        fields: [
          { label: "LINKID", value: "TEHERAN-001" },
          { label: "도로명", value: "테헤란로" },
          { label: "도로등급", value: "주간선도로" },
          { label: "차선수", value: "6" },
          { label: "진입 차량 수", value: "3,200대" },
          { label: "진출 차량 수", value: "2,800대" },
          { label: "총 교통량", value: "6,000대" },
        ],
      },
    ],
    note: "View-T 링크 자동 매칭 전까지 데모용 대표 도로 링크를 사용합니다. 기준년도 교통량 기반 접근 리스크이며 실시간 교통정보가 아닙니다.",
  },
];

export const sampleTrafficContext: TrafficContext = {
  status: "sample-fallback",
  year: 2025,
  weekType: "weekend",
  time: "20",
  riskScore: 68,
  riskLabel: "보통",
  links: [
    {
      linkId: "TEHERAN-001",
      roadName: "테헤란로",
      roadRank: "주간선도로",
      lanes: 6,
      inboundVolume: 3200,
      outboundVolume: 2800,
      totalVolume: 6000,
    },
  ],
  provenance: {
    sourceName: "KTDB/View-T 교통량 샘플",
    sourceType: "public-data",
    sourceStatus: "sample-fallback",
    basisText: "KTDB/View-T 도로 링크 교통량 구조를 기준으로 한 샘플 접근 교통 리스크입니다.",
    fallbackText: "링크 매핑 또는 View-T 조회 실패 시 샘플 교통량을 사용합니다.",
    fallbackReason: "초기 데모용 샘플 교통량 사용",
    retrievedAt: "샘플 기준",
    collectedPersonalData: false,
  },
  sourceDetails: sampleTrafficSourceDetails,
};
```

- [ ] Step 5: Implement traffic adapter

Create `src/services/trafficAdapter.ts` with:

```ts
import { sampleTrafficContext, sampleTrafficSourceDetails, trafficLinkMappings } from "../data/sampleTraffic";
import type {
  FestivalPlan,
  MetricEvidenceSourceDetail,
  TrafficContext,
  TrafficLinkRecord,
  TrafficRiskLabel,
} from "../domain/types";

interface TrafficOptions {
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  hour?: number;
}

interface ViewTRecord {
  LINKID?: string | number;
  ROAD_NAME?: string;
  ROAD_RANK?: string;
  LANES?: string | number;
  VALUE_IN?: string | number;
  VALUE_OUT?: string | number;
}

const DEFAULT_YEAR = 2025;

function isWeekendPlan(plan: FestivalPlan) {
  const day = new Date(plan.startDate).getDay();
  return day === 0 || day === 6;
}

function normalizeTime(hour?: number) {
  if (typeof hour !== "number" || !Number.isFinite(hour)) return "ALL";
  return String(Math.min(Math.max(Math.round(hour), 0), 23));
}

function findTrafficMapping(plan: FestivalPlan) {
  return trafficLinkMappings.find((mapping) => {
    const regionMatches = plan.region.includes(mapping.regionKeyword);
    const venueMatches = mapping.venueKeyword
      ? `${plan.venueAddress} ${plan.name}`.includes(mapping.venueKeyword)
      : true;

    return regionMatches && venueMatches;
  });
}

function numberValue(value: unknown) {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
}

function riskLabel(score: number): TrafficRiskLabel {
  if (score >= 70) return "높음";
  if (score >= 40) return "보통";
  return "낮음";
}

function calculateTrafficRisk(links: TrafficLinkRecord[], weekType: "weekday" | "weekend", time: string) {
  const maxPerLane = Math.max(
    ...links.map((link) => link.totalVolume / Math.max(link.lanes ?? 1, 1)),
    0,
  );
  const weekendBonus = weekType === "weekend" ? 8 : 0;
  const hour = Number(time);
  const peakHourBonus = Number.isFinite(hour) && hour >= 17 && hour <= 21 ? 8 : 0;

  return Math.min(100, Math.round((maxPerLane / 1800) * 100 + weekendBonus + peakHourBonus));
}

function normalizeViewTRecords(records: ViewTRecord[], fallbackRoadName: string): TrafficLinkRecord[] {
  return records.map((record) => {
    const inboundVolume = numberValue(record.VALUE_IN);
    const outboundVolume = numberValue(record.VALUE_OUT);

    return {
      linkId: String(record.LINKID ?? "-"),
      roadName: record.ROAD_NAME ?? fallbackRoadName,
      roadRank: record.ROAD_RANK,
      lanes: numberValue(record.LANES) || undefined,
      inboundVolume,
      outboundVolume,
      totalVolume: inboundVolume + outboundVolume,
    };
  });
}

function createTrafficSourceDetails({
  linkId,
  year,
  weekType,
  time,
  links,
  statusLabel,
  note,
}: {
  linkId: string;
  year: number;
  weekType: "weekday" | "weekend";
  time: string;
  links: TrafficLinkRecord[];
  statusLabel: string;
  note: string;
}): MetricEvidenceSourceDetail[] {
  return [
    {
      sourceId: "ktdb-viewt-selected-link",
      sourceName: "KTDB/View-T 도로 교통량 조회",
      sourceType: "ktdb",
      statusLabel,
      retrievedAt: new Date().toISOString(),
      endpoint: "/api/traffic/selected-link",
      query: [
        { label: "linkId", value: linkId },
        { label: "year", value: String(year) },
        { label: "weekType", value: weekType },
        { label: "time", value: time },
      ],
      records: links.map((link) => ({
        label: link.roadName,
        fields: [
          { label: "LINKID", value: link.linkId },
          { label: "도로명", value: link.roadName },
          { label: "도로등급", value: link.roadRank ?? "-" },
          { label: "차선수", value: link.lanes ? String(link.lanes) : "-" },
          { label: "진입 차량 수", value: `${link.inboundVolume.toLocaleString("ko-KR")}대` },
          { label: "진출 차량 수", value: `${link.outboundVolume.toLocaleString("ko-KR")}대` },
          { label: "총 교통량", value: `${link.totalVolume.toLocaleString("ko-KR")}대` },
        ],
      })),
      note,
    },
  ];
}

export function createFallbackTrafficContext(
  plan: FestivalPlan,
  reason: string,
  hour?: number,
): TrafficContext {
  return {
    ...sampleTrafficContext,
    time: normalizeTime(hour),
    provenance: {
      ...sampleTrafficContext.provenance,
      fallbackReason: reason,
      retrievedAt: new Date().toISOString(),
    },
    sourceDetails: sampleTrafficSourceDetails.map((detail) => ({
      ...detail,
      statusLabel: "샘플 교통량 사용",
      note: `${detail.note} 사유: ${reason}`,
    })),
  };
}

export async function getTrafficContext(
  plan: FestivalPlan,
  options: TrafficOptions = {},
): Promise<TrafficContext> {
  const mapping = findTrafficMapping(plan);
  const fetchImpl = options.fetchImpl ?? fetch;
  const weekType = isWeekendPlan(plan) ? "weekend" : "weekday";
  const time = normalizeTime(options.hour);

  if (!mapping) {
    return createFallbackTrafficContext(plan, "행사장에 매핑된 KTDB LINKID가 없어 샘플 교통량을 사용합니다.", options.hour);
  }

  try {
    const url = new URL("/api/traffic/selected-link", window.location.origin);
    url.searchParams.set("linkId", mapping.linkId);
    url.searchParams.set("year", String(DEFAULT_YEAR));
    url.searchParams.set("weekType", weekType);
    url.searchParams.set("time", time);

    const response = await fetchImpl(`${url.pathname}${url.search}`, { signal: options.signal });
    if (!response.ok) {
      throw new Error(`Traffic proxy HTTP ${response.status}`);
    }

    const payload = await response.json();
    const rawRecords = Array.isArray(payload.result) ? payload.result : [];
    const links = normalizeViewTRecords(rawRecords, mapping.roadName).filter(
      (link) => link.totalVolume > 0,
    );

    if (links.length === 0) {
      throw new Error("Traffic response did not include usable link records");
    }

    const riskScore = calculateTrafficRisk(links, weekType, time);

    return {
      status: "live",
      year: DEFAULT_YEAR,
      weekType,
      time,
      riskScore,
      riskLabel: riskLabel(riskScore),
      links,
      provenance: {
        sourceName: "KTDB/View-T 도로 교통량",
        sourceType: "public-data",
        sourceStatus: "live",
        basisText: "KTDB/View-T 도로 링크 교통량을 기준으로 행사장 접근 교통 리스크를 추정합니다.",
        fallbackText: "조회 실패 또는 링크 매핑 누락 시 샘플 교통량을 사용합니다.",
        retrievedAt: new Date().toISOString(),
        collectedPersonalData: false,
      },
      sourceDetails: createTrafficSourceDetails({
        linkId: mapping.linkId,
        year: DEFAULT_YEAR,
        weekType,
        time,
        links,
        statusLabel: "기준년도 교통량 조회 성공",
        note: "2025년 기준 도로 링크 교통량 기반 접근 리스크이며 실시간 교통정보가 아닙니다.",
      }),
    };
  } catch (error) {
    if (
      options.signal?.aborted ||
      (typeof error === "object" && error !== null && "name" in error && error.name === "AbortError")
    ) {
      throw error;
    }

    return createFallbackTrafficContext(plan, "KTDB/View-T 교통량 조회 실패로 샘플 교통량을 사용합니다.", options.hour);
  }
}
```

- [ ] Step 6: Run adapter tests

Run:

```bash
npm run test -- src/services/trafficAdapter.test.ts
```

Expected: PASS.

- [ ] Step 7: Commit

```bash
git add src/domain/types.ts src/data/sampleTraffic.ts src/services/trafficAdapter.ts src/services/trafficAdapter.test.ts
git commit -m "feat: add traffic context adapter"
```

---

### Task 3: Safety Metrics And Evidence Integration

Files:
- Modify: `src/services/impactMetrics.ts`
- Modify: `src/services/metricEvidence.ts`
- Modify: `src/services/metricEvidence.test.ts`

Interfaces:
- Consumes: `TrafficContext`.
- Updates: `createSafetyLogisticsMetrics(plan, forecast, simulation, traffic?)`.
- Updates: `createMetricEvidenceSet(plan, forecast, simulation, tourism, trends, traffic)`.

- [ ] Step 1: Add failing metrics tests

Add to `src/services/metricEvidence.test.ts`:

```ts
import { sampleTrafficContext } from "../data/sampleTraffic";
```

Add:

```ts
it("includes KTDB traffic evidence for parking and safety metrics", () => {
  const evidence = createMetricEvidenceSet(
    sampleFestivalPlan,
    sampleForecastResult,
    sampleSimulationResult,
    sampleTourismContext,
    sampleTrendContext,
    sampleTrafficContext,
  );

  expect(JSON.stringify(evidence["parking-occupancy"].sourceDetails)).toContain(
    "KTDB/View-T",
  );
  expect(JSON.stringify(evidence["safety-staff"].sourceDetails)).toContain(
    "접근 교통 위험도",
  );
  expect(JSON.stringify(evidence["medical-staff"].sourceDetails)).toContain(
    "접근 교통 위험도",
  );
});
```

- [ ] Step 2: Run failing metric tests

Run:

```bash
npm run test -- src/services/metricEvidence.test.ts
```

Expected: FAIL because function signatures and traffic evidence are not integrated.

- [ ] Step 3: Update safety metrics

Modify `src/services/impactMetrics.ts`:

```ts
import type {
  FestivalPlan,
  ForecastResult,
  SimulationResult,
  TourismContext,
  TrafficContext,
} from "../domain/types";
```

Add to `SafetyLogisticsMetrics`:

```ts
trafficRiskScore: number;
trafficRiskLabel: "낮음" | "보통" | "높음";
trafficRoadName: string;
parkingBaseOccupancyRate: number;
```

Update function signature:

```ts
export function createSafetyLogisticsMetrics(
  plan: FestivalPlan,
  forecast: ForecastResult,
  simulation: SimulationResult,
  traffic?: TrafficContext,
): SafetyLogisticsMetrics {
```

After existing parking base calculation:

```ts
const parkingBaseOccupancyRate = Math.round(
  clamp((estimatedCars / assumedParkingCapacity) * 100, 0, 100),
);
const trafficRiskScore = traffic?.riskScore ?? 0;
const trafficParkingAdjustment = Math.round(trafficRiskScore * 0.12);
const parkingOccupancyRate = Math.round(
  clamp(parkingBaseOccupancyRate + trafficParkingAdjustment, 0, 100),
);
```

Return:

```ts
trafficRiskScore,
trafficRiskLabel: traffic?.riskLabel ?? "낮음",
trafficRoadName: traffic?.links[0]?.roadName ?? "교통량 기준 도로 없음",
parkingBaseOccupancyRate,
```

- [ ] Step 4: Update metric evidence composition

Modify `src/services/metricEvidence.ts` signature:

```ts
traffic?: TrafficContext,
```

Create helper:

```ts
function trafficDerivedDetails(traffic?: TrafficContext): MetricEvidence["sourceDetails"] {
  if (!traffic) return [];

  return [
    ...traffic.sourceDetails,
    {
      sourceId: "derived-traffic-risk",
      sourceName: "접근 교통 위험도 산출값",
      sourceType: "derived",
      statusLabel: "시스템 산출값",
      calculationInputs: [
        { label: "위험도", value: `${traffic.riskScore}점` },
        { label: "위험 단계", value: traffic.riskLabel },
        { label: "기준 도로", value: traffic.links[0]?.roadName ?? "-" },
        { label: "기준년도", value: `${traffic.year}년` },
        { label: "시간 조건", value: traffic.time },
      ],
      note: "KTDB/View-T 기준년도 교통량을 이용한 접근 리스크이며 실시간 교통정보가 아닙니다.",
    },
  ];
}
```

Use:

```ts
const trafficDetails = trafficDerivedDetails(traffic);
const safety = createSafetyLogisticsMetrics(plan, forecast, simulation, traffic);
```

Add `...trafficDetails` to `safety-staff`, `medical-staff`, and `parking-occupancy` sourceDetails.

- [ ] Step 5: Run metric tests

Run:

```bash
npm run test -- src/services/metricEvidence.test.ts
```

Expected: PASS.

- [ ] Step 6: Commit

```bash
git add src/services/impactMetrics.ts src/services/metricEvidence.ts src/services/metricEvidence.test.ts
git commit -m "feat: apply traffic risk to safety evidence"
```

---

### Task 4: App State And Safety Panel UI

Files:
- Modify: `src/App.tsx`
- Modify: `src/components/SafetyLogisticsPanel.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/styles.css`

Interfaces:
- Consumes: `getTrafficContext`.
- Passes `traffic` into `SafetyLogisticsPanel` and `createMetricEvidenceSet`.

- [ ] Step 1: Add failing UI test

Modify `src/App.test.tsx` to mock `getTrafficContext` from `src/services/trafficAdapter.ts` and default it to `sampleTrafficContext`.

Add:

```ts
it("shows KTDB access traffic risk in the safety logistics panel and evidence drawer", async () => {
  render(<App />);

  expect(await screen.findByText("접근 교통 위험도")).toBeInTheDocument();
  expect(screen.getByText(/테헤란로|세종대로/)).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: /주차 수용 차오름 비율 근거 보기/ }));

  expect(await screen.findByText("사용 데이터 상세")).toBeInTheDocument();
  expect(screen.getByText(/KTDB\/View-T/)).toBeInTheDocument();
  expect(screen.getByText(/LINKID/)).toBeInTheDocument();
});
```

Use the same evidence-button selection style already used by the existing `opens a metric evidence drawer from the dashboard` test in `src/App.test.tsx`; target the parking metric button in the safety/logistics panel and assert the drawer content after the click.

- [ ] Step 2: Run failing UI test

Run:

```bash
npm run test -- src/App.test.tsx
```

Expected: FAIL because traffic is not loaded or rendered yet.

- [ ] Step 3: Wire traffic state in App

Modify `src/App.tsx`:

```ts
import { sampleTrafficContext } from "./data/sampleTraffic";
import { getTrafficContext } from "./services/trafficAdapter";
```

Add traffic state:

```ts
const trafficPlanKey = JSON.stringify({
  region: plan.region,
  venueAddress: plan.venueAddress,
  name: plan.name,
  startDate: plan.startDate,
  selectedHour,
});
const [trafficState, setTrafficState] = useState(() => ({
  planKey: trafficPlanKey,
  context: sampleTrafficContext,
}));
const traffic =
  trafficState.planKey === trafficPlanKey ? trafficState.context : sampleTrafficContext;
```

Add effect:

```ts
useEffect(() => {
  const controller = new AbortController();
  const planSnapshot = plan;
  const timeoutId = window.setTimeout(() => {
    getTrafficContext(planSnapshot, {
      signal: controller.signal,
      hour: selectedHour,
    })
      .then((nextTraffic) => {
        if (!controller.signal.aborted) {
          setTrafficState({ planKey: trafficPlanKey, context: nextTraffic });
        }
      })
      .catch((error: unknown) => {
        if (
          !controller.signal.aborted &&
          !(typeof error === "object" && error !== null && "name" in error && error.name === "AbortError")
        ) {
          console.error("Traffic context loading failed", error);
        }
      });
  }, 300);

  return () => {
    window.clearTimeout(timeoutId);
    controller.abort();
  };
}, [trafficPlanKey]);
```

Update:

```ts
const metricEvidence = useMemo(
  () => createMetricEvidenceSet(plan, forecast, simulation, tourism, sampleTrendContext, traffic),
  [forecast, plan, simulation, tourism, traffic],
);
```

Update panel:

```tsx
<SafetyLogisticsPanel
  plan={plan}
  forecast={forecast}
  simulation={simulation}
  traffic={traffic}
  onOpenEvidence={setSelectedEvidenceId}
/>
```

- [ ] Step 4: Render traffic risk in SafetyLogisticsPanel

Modify props:

```ts
import type { TrafficContext } from "../domain/types";

traffic?: TrafficContext;
```

Update metrics call:

```ts
const metrics = createSafetyLogisticsMetrics(plan, forecast, simulation, traffic);
```

Add an article before parking:

```tsx
<article className="safety-metric">
  <span className="safety-icon safety-icon-amber" aria-hidden="true">
    ↕
  </span>
  <div>
    <div className="metric-inline-heading">
      <span>접근 교통 위험도</span>
      <EvidenceButton onClick={() => onOpenEvidence("parking-occupancy")} />
    </div>
    <strong>{metrics.trafficRiskLabel}</strong>
    <small>
      {metrics.trafficRoadName} · {metrics.trafficRiskScore}점 · 기준년도 교통량
    </small>
  </div>
</article>
```

Add style for `.safety-icon-amber` in `src/styles.css`:

```css
.safety-icon-amber {
  background: #fff7ed;
  color: #c2410c;
}

.source-type-ktdb {
  background: #eef6ff;
  color: #0369a1;
}
```

- [ ] Step 5: Run UI tests

Run:

```bash
npm run test -- src/App.test.tsx
```

Expected: PASS.

- [ ] Step 6: Commit

```bash
git add src/App.tsx src/components/SafetyLogisticsPanel.tsx src/App.test.tsx src/styles.css
git commit -m "feat: show access traffic risk"
```

---

### Task 5: Documentation, Full Verification, Push, Deploy

Files:
- Modify: `docs/data-methodology.md`

Interfaces:
- Consumes: completed traffic integration.
- Produces: tested, built, pushed, deployed app.

- [ ] Step 1: Update methodology docs

Add to `docs/data-methodology.md`:

```md
## KTDB/View-T 교통량 기반 접근 리스크

Fest-Twin은 안전 및 물류 수용성 판단에 KTDB/View-T 도로 링크 교통량을 보조 근거로 사용할 수 있다.

- 데이터 성격: 기준년도 도로 링크 교통량 기반 접근 리스크이며 실시간 교통정보가 아니다.
- 조회 조건: `LINKID`, 기준년도, 평일/주말, 시간대
- 사용 항목: 도로명, 도로등급, 차선수, 진입 차량 수, 진출 차량 수, 총 교통량
- 반영 지표: 접근 교통 위험도, 주차 수용 차오름 비율 보정, 안전/교통안내 인력 판단 근거
- 한계: 1차 구현은 수동 LINKID 매핑을 사용하며, 행사장 좌표와 도로망 Shape 파일의 자동 매칭은 후속 과제로 분리한다.

개인 이동 경로, 차량 번호, 단말 위치 정보는 수집하지 않는다. API 원본 URL 전체나 인증 관련 값은 화면에 표시하지 않고, 근거 패널에는 내부 프록시 경로와 안전한 조회 조건만 표시한다.
```

- [ ] Step 2: Run full tests

Run:

```bash
npm run test
```

Expected: all tests pass.

- [ ] Step 3: Run production build

Run:

```bash
$env:VITE_VWORLD_API_KEY='your_vworld_api_key'; npm run build
```

Expected: build passes.

- [ ] Step 4: Commit docs

Stage only methodology doc:

```bash
git add docs/data-methodology.md
git commit -m "docs: document KTDB traffic evidence"
```

- [ ] Step 5: Push GitHub

Run:

```bash
git push origin main
```

Expected: `main` pushed.

- [ ] Step 6: Deploy remote Docker

On remote server, clone latest `main`, build image with the Naver map client id, and restart `fest-twin-demo` while preserving TourAPI env file:

```bash
docker run -d --name fest-twin-demo --restart unless-stopped --env-file /home/cwuser/fest-twin-demo.env -p 18080:80 --label com.fest-twin.managed-by=fest-twin-internal-demo fest-twin-demo:<new-tag>
```

- [ ] Step 7: Verify public deployment

Verify:

```bash
curl https://cwserver.tail97dbc3.ts.net/api/tour/area-code?numOfRows=17&pageNo=1
curl https://cwserver.tail97dbc3.ts.net/api/traffic/selected-link?linkId=TEHERAN-001&year=2025&weekType=weekend&time=20
curl https://cwserver.tail97dbc3.ts.net/
```

Expected:

- TourAPI still returns `resultCode: "0000"`.
- Traffic proxy returns either live View-T response or a controlled proxy error without leaking raw URLs.
- Public JS bundle contains `접근 교통 위험도`, `KTDB/View-T`, and `기준년도 교통량`.

- [ ] Step 8: Final report

Report:

- Tests passed.
- Build passed.
- GitHub pushed.
- Remote Docker deployed.
- Public URL verified.
- Existing unrelated dirty files were left untouched.
