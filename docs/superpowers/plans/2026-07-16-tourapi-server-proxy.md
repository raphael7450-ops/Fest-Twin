# TourAPI Server Proxy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move TourAPI key usage from the browser bundle to a server-side proxy while preserving the existing dashboard URL and fallback behavior.

**Architecture:** Add a small Node/Express server that serves the built React app and proxies `/api/tour/*` requests to Korea Tourism Organization TourAPI. The React data adapter calls same-origin proxy endpoints and falls back to sample data if the proxy is unavailable or returns an error. Docker runs the Node server on container port `80`, still mapped to host `18080`.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Node 20, Express, Docker.

## Global Constraints

- TourAPI authentication keys must not be stored in Git, Docker images, browser bundles, logs, or error responses.
- The server reads the key only from runtime environment variable `TOUR_API_KEY`.
- The public dashboard URL remains `http://192.168.55.223:18080/`.
- The app must still work without `TOUR_API_KEY` by using existing sample fallback data.
- Docker keeps host port mapping `18080:80`.
- Do not add login, a database, key management UI, long-term external API storage, or real-time social data integration.
- `.env*` files remain excluded from Docker build context except `.env.example`.

---

## File Structure

- Create `server/tourProxy.js`: validates proxy requests, calls TourAPI with `TOUR_API_KEY`, normalizes HTTP errors, and never exposes the key.
- Create `server/index.js`: creates the Express app, mounts `/api/tour/*`, serves `dist`, and applies SPA fallback.
- Create `server/tourProxy.test.ts`: unit tests for proxy URL construction, query validation, missing key, upstream failure, and key redaction.
- Modify `package.json`: add `express`, add server start script, and keep existing test/build commands.
- Modify `package-lock.json`: lock the new runtime dependency.
- Modify `src/services/tourApiAdapter.ts`: route live calls through `/api/tour/*` by default and keep sample fallback on proxy failures.
- Modify `src/services/dataAdapters.test.ts`: update TourAPI adapter tests so they assert proxy paths and fallback behavior instead of browser-side `serviceKey`.
- Modify `Dockerfile`: build the React app, install production server dependencies, copy `server/` and `dist`, and run `node server/index.js`.
- Leave `nginx.conf` unchanged; it becomes an unused legacy file until a later cleanup because the new Docker runtime no longer depends on nginx.
- Modify `README.md`: deprecate browser-side `VITE_TOUR_API_KEY` and document `TOUR_API_KEY` for server proxy mode.
- Modify `docs/internal-docker-deploy.md`: document keyless demo mode and `TOUR_API_KEY` env-file mode without showing any real key.

## Task 1: Server Proxy

**Files:**
- Create: `server/tourProxy.js`
- Create: `server/index.js`
- Create: `server/tourProxy.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Produces: `createTourProxyRouter(options?: { fetchImpl?: typeof fetch; apiKey?: string }): import("express").Router`
- Produces: `createApp(options?: { fetchImpl?: typeof fetch; apiKey?: string; staticDir?: string }): import("express").Express`
- Consumes: server runtime env `TOUR_API_KEY` and optional `PORT`
- Later tasks consume same-origin endpoints:
  - `GET /api/tour/area-code`
  - `GET /api/tour/festivals`
  - `GET /api/tour/detail`
  - `GET /api/tour/nearby`

- [ ] **Step 1: Install Express**

Run:

```powershell
npm install express
```

Expected: `package.json` gains `"express"` under dependencies and `package-lock.json` updates.

- [ ] **Step 2: Add server tests first**

Create `server/tourProxy.test.ts` with this content:

```ts
import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTourProxyRouter } from "./tourProxy.js";

function jsonResponse(payload: unknown, options: { ok?: boolean; status?: number } = {}) {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: async () => payload,
  } as Response;
}

function tourApiPayload(items: unknown, totalCount = 1) {
  return {
    response: {
      header: { resultCode: "0000", resultMsg: "OK" },
      body: {
        items: totalCount === 0 ? "" : { item: items },
        totalCount,
      },
    },
  };
}

async function request(path: string, fetchImpl: typeof fetch, apiKey = "server-key+/=") {
  const app = express();
  app.use("/api/tour", createTourProxyRouter({ fetchImpl, apiKey }));
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

describe("TourAPI server proxy", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("adds serviceKey from the server only and forwards an allowed area code request", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(tourApiPayload([{ code: "1", name: "서울" }])));

    const { response, body } = await request(
      "/api/tour/area-code?numOfRows=50&pageNo=1",
      fetchMock as unknown as typeof fetch,
    );

    expect(response.status).toBe(200);
    expect(body.response.header.resultCode).toBe("0000");
    const upstreamUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(upstreamUrl.pathname.endsWith("/areaCode2")).toBe(true);
    expect(upstreamUrl.searchParams.get("serviceKey")).toBe("server-key+/=");
    expect(upstreamUrl.searchParams.get("MobileOS")).toBe("ETC");
    expect(upstreamUrl.searchParams.get("MobileApp")).toBe("FestTwin");
    expect(upstreamUrl.searchParams.get("_type")).toBe("json");
    expect(upstreamUrl.searchParams.get("numOfRows")).toBe("50");
  });

  it("rejects client-supplied serviceKey and unknown parameters", async () => {
    const fetchMock = vi.fn();

    const { response, body } = await request(
      "/api/tour/festivals?serviceKey=client-key&unknown=value",
      fetchMock as unknown as typeof fetch,
    );

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_QUERY");
    expect(JSON.stringify(body)).not.toContain("client-key");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 503 without leaking a key when TOUR_API_KEY is missing", async () => {
    const fetchMock = vi.fn();

    const { response, body } = await request(
      "/api/tour/area-code",
      fetchMock as unknown as typeof fetch,
      "",
    );

    expect(response.status).toBe(503);
    expect(body.error.code).toBe("TOUR_API_KEY_MISSING");
    expect(JSON.stringify(body)).not.toContain("serviceKey");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps upstream HTTP and malformed JSON failures to 502", async () => {
    const upstreamErrorFetch = vi.fn(async () => jsonResponse({}, { ok: false, status: 504 }));
    const malformedJsonFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => Promise.reject(new SyntaxError("invalid JSON")),
    })) as unknown as typeof fetch;

    const upstreamError = await request(
      "/api/tour/nearby?mapX=126.92&mapY=37.52&radius=5000",
      upstreamErrorFetch as unknown as typeof fetch,
    );
    const malformedJson = await request(
      "/api/tour/nearby?mapX=126.92&mapY=37.52&radius=5000",
      malformedJsonFetch,
    );

    expect(upstreamError.response.status).toBe(502);
    expect(upstreamError.body.error.code).toBe("TOUR_API_UPSTREAM_ERROR");
    expect(malformedJson.response.status).toBe(502);
    expect(malformedJson.body.error.code).toBe("TOUR_API_INVALID_RESPONSE");
  });
});
```

- [ ] **Step 3: Run the new test to verify it fails**

Run:

```powershell
npx vitest run --config vitest.config.ts server/tourProxy.test.ts
```

Expected: FAIL because `server/tourProxy.js` does not exist.

- [ ] **Step 4: Implement the proxy router**

Create `server/tourProxy.js` with this content:

```js
import express from "express";

const TOUR_API_BASE_URL = "https://apis.data.go.kr/B551011/KorService2";
const MOBILE_OS = "ETC";
const MOBILE_APP = "FestTwin";

const endpointConfig = {
  "area-code": {
    operation: "areaCode2",
    allowedParams: new Set(["numOfRows", "pageNo", "areaCode"]),
  },
  festivals: {
    operation: "searchFestival2",
    allowedParams: new Set([
      "numOfRows",
      "pageNo",
      "arrange",
      "areaCode",
      "eventStartDate",
      "eventEndDate",
    ]),
  },
  detail: {
    operation: "detailCommon2",
    allowedParams: new Set([
      "contentId",
      "defaultYN",
      "firstImageYN",
      "addrinfoYN",
      "mapinfoYN",
      "overviewYN",
    ]),
  },
  nearby: {
    operation: "locationBasedList2",
    allowedParams: new Set(["numOfRows", "pageNo", "arrange", "mapX", "mapY", "radius"]),
  },
};

const numericParams = new Set([
  "numOfRows",
  "pageNo",
  "areaCode",
  "contentId",
  "mapX",
  "mapY",
  "radius",
]);

function errorResponse(response, status, code, message) {
  return response.status(status).json({
    error: { code, message },
  });
}

function validateQuery(endpoint, query) {
  const config = endpointConfig[endpoint];
  if (!config) {
    return { ok: false, message: "Unsupported TourAPI proxy endpoint." };
  }

  for (const key of Object.keys(query)) {
    if (key === "serviceKey" || !config.allowedParams.has(key)) {
      return { ok: false, message: "Unsupported TourAPI query parameter." };
    }
    const value = query[key];
    if (Array.isArray(value) || typeof value === "object") {
      return { ok: false, message: "TourAPI query parameter must be a scalar value." };
    }
    if (numericParams.has(key) && value !== undefined && value !== "" && Number.isNaN(Number(value))) {
      return { ok: false, message: "TourAPI numeric query parameter is invalid." };
    }
  }

  return { ok: true };
}

function buildTourApiUrl(endpoint, apiKey, query) {
  const config = endpointConfig[endpoint];
  const url = new URL(`${TOUR_API_BASE_URL}/${config.operation}`);

  url.searchParams.set("serviceKey", apiKey);
  url.searchParams.set("MobileOS", MOBILE_OS);
  url.searchParams.set("MobileApp", MOBILE_APP);
  url.searchParams.set("_type", "json");

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  return url;
}

export function createTourProxyRouter(options = {}) {
  const router = express.Router();
  const fetchImpl = options.fetchImpl ?? fetch;

  router.get("/:endpoint", async (request, response) => {
    const apiKey = options.apiKey ?? process.env.TOUR_API_KEY ?? "";
    if (!apiKey) {
      return errorResponse(
        response,
        503,
        "TOUR_API_KEY_MISSING",
        "TourAPI server key is not configured.",
      );
    }

    const validation = validateQuery(request.params.endpoint, request.query);
    if (!validation.ok) {
      return errorResponse(response, 400, "INVALID_QUERY", validation.message);
    }

    const upstreamUrl = buildTourApiUrl(request.params.endpoint, apiKey, request.query);

    try {
      const upstreamResponse = await fetchImpl(upstreamUrl);
      if (!upstreamResponse.ok) {
        return errorResponse(
          response,
          502,
          "TOUR_API_UPSTREAM_ERROR",
          "TourAPI upstream request failed.",
        );
      }

      const payload = await upstreamResponse.json();
      return response.status(200).json(payload);
    } catch (error) {
      const code = error instanceof SyntaxError
        ? "TOUR_API_INVALID_RESPONSE"
        : "TOUR_API_UPSTREAM_ERROR";
      return errorResponse(response, 502, code, "TourAPI proxy request failed.");
    }
  });

  return router;
}
```

- [ ] **Step 5: Implement the Express app**

Create `server/index.js` with this content:

```js
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTourProxyRouter } from "./tourProxy.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(options = {}) {
  const app = express();
  const staticDir = options.staticDir ?? path.resolve(__dirname, "../dist");

  app.use(
    "/api/tour",
    createTourProxyRouter({
      fetchImpl: options.fetchImpl,
      apiKey: options.apiKey,
    }),
  );
  app.use(express.static(staticDir));
  app.get("*", (_request, response) => {
    response.sendFile(path.join(staticDir, "index.html"));
  });

  return app;
}

if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT ?? 80);
  createApp().listen(port, "0.0.0.0", () => {
    console.log(`Fest-Twin server listening on port ${port}`);
  });
}
```

- [ ] **Step 6: Add package scripts**

Modify `package.json` scripts to include:

```json
{
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc -b && vite build",
    "start": "node server/index.js",
    "test": "vitest run --config vitest.config.ts",
    "test:watch": "vitest --config vitest.config.ts"
  }
}
```

- [ ] **Step 7: Run server proxy tests**

Run:

```powershell
npx vitest run --config vitest.config.ts server/tourProxy.test.ts
```

Expected: PASS for all tests in `server/tourProxy.test.ts`.

- [ ] **Step 8: Commit Task 1**

Run:

```powershell
git add package.json package-lock.json server/tourProxy.js server/index.js server/tourProxy.test.ts
git commit -m "feat: add TourAPI server proxy"
```

Expected: commit succeeds.

## Task 2: Client Adapter Proxy Switch

**Files:**
- Modify: `src/services/tourApiAdapter.ts`
- Modify: `src/services/dataAdapters.test.ts`

**Interfaces:**
- Consumes: `GET /api/tour/area-code`, `/api/tour/festivals`, `/api/tour/detail`, `/api/tour/nearby`
- Produces: existing `getTourismContext(plan, options)` API remains unchanged
- Produces: `TourApiOptions.apiKey` becomes test-only legacy override for direct URL mode only if needed; production code does not read `import.meta.env.VITE_TOUR_API_KEY`

- [ ] **Step 1: Update adapter tests first**

In `src/services/dataAdapters.test.ts`, replace the test named `"orchestrates all four TourAPI endpoints with decoded-key URL parameters"` with:

```ts
  it("orchestrates all four TourAPI proxy endpoints without exposing a browser service key", async () => {
    const responses = [
      tourApiPayload([{ code: "1", name: "서울" }]),
      tourApiPayload([
        {
          contentid: "100",
          title: "한강 K-POP 푸드 축제",
          addr1: "서울특별시 영등포구",
          eventstartdate: "20260918",
          eventenddate: "20260920",
        },
      ]),
      tourApiPayload([
        {
          contentid: "100",
          title: "한강 K-POP 푸드 축제",
          addr1: "서울특별시 영등포구",
          firstimage: "https://example.com/festival.jpg",
          eventstartdate: "20260918",
          eventenddate: "20260920",
          overview: "한강 먹거리와 K-POP 공연이 함께 열리는 축제",
          mapx: "126.92",
          mapy: "37.52",
        },
      ]),
      tourApiPayload([
        {
          contentid: "200",
          title: "여의도 한강공원",
          contenttypeid: "12",
          dist: "800",
        },
      ]),
    ];
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) =>
      jsonResponse(responses.shift()),
    );
    const fetchImpl = fetchMock as unknown as typeof fetch;

    const tourism = await getTourismContext(sampleFestivalPlan, { fetchImpl });

    expect(tourism.provenance.sourceStatus).toBe("live");
    expect(tourism.similarFestivals[0]).toMatchObject({
      id: "100",
      name: "한강 K-POP 푸드 축제",
      region: "서울특별시 영등포구",
    });
    expect(tourism.nearbySpots[0]).toMatchObject({
      id: "200",
      name: "여의도 한강공원",
      category: "관광지",
      distanceKm: 0.8,
    });

    const urls = fetchMock.mock.calls.map(([input]) => new URL(String(input), "http://localhost"));
    expect(urls.map((url) => url.pathname)).toEqual([
      "/api/tour/area-code",
      "/api/tour/festivals",
      "/api/tour/detail",
      "/api/tour/nearby",
    ]);
    expect(urls.every((url) => url.searchParams.has("serviceKey"))).toBe(false);
    expect(urls[1].searchParams.get("areaCode")).toBe("1");
    expect(urls[1].searchParams.get("eventStartDate")).toBe("20260918");
    expect(urls[1].searchParams.get("eventEndDate")).toBe("20260920");
    expect(urls[2].searchParams.get("contentId")).toBe("100");
    expect(urls[3].searchParams.get("mapX")).toBe("126.92");
    expect(urls[3].searchParams.get("radius")).toBe("5000");
  });
```

- [ ] **Step 2: Run adapter tests to verify they fail**

Run:

```powershell
npx vitest run --config vitest.config.ts src/services/dataAdapters.test.ts
```

Expected: FAIL because `tourApiAdapter.ts` still requires an API key and builds TourAPI origin URLs.

- [ ] **Step 3: Change the adapter URL builder**

In `src/services/tourApiAdapter.ts`, remove `TOUR_API_BASE_URL`, remove `apiKey` from `createTourApiUrl`, and replace the operation names with proxy endpoints:

```ts
type TourApiOperation =
  | "area-code"
  | "festivals"
  | "detail"
  | "nearby";

function createTourApiUrl(
  operation: TourApiOperation,
  params: Record<string, string | number | undefined>,
) {
  const url = new URL(`/api/tour/${operation}`, window.location.origin);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return `${url.pathname}${url.search}`;
}
```

Also replace each operation string:

```ts
"areaCode2" -> "area-code"
"searchFestival2" -> "festivals"
"detailCommon2" -> "detail"
"locationBasedList2" -> "nearby"
```

- [ ] **Step 4: Change fetch orchestration to not require a browser key**

Update `fetchTourApiItems`, `resolveAreaCode`, and `getTourismContext` signatures so no production path reads `import.meta.env.VITE_TOUR_API_KEY`:

```ts
async function fetchTourApiItems(
  operation: TourApiOperation,
  params: Record<string, string | number | undefined>,
  fetchImpl: typeof fetch,
  signal?: AbortSignal,
) {
  const response = await fetchImpl(createTourApiUrl(operation, params), { signal });

  if (!response.ok) {
    throw new Error(`TourAPI ${operation} HTTP ${response.status}`);
  }

  return normalizeItems(operation, await response.json());
}

async function resolveAreaCode(
  plan: FestivalPlan,
  fetchImpl: typeof fetch,
  signal?: AbortSignal,
) {
  const items = await fetchTourApiItems(
    "area-code",
    { numOfRows: 50, pageNo: 1 },
    fetchImpl,
    signal,
  );

  return items.find((item) => item.name && plan.region.includes(item.name))?.code;
}

export async function getTourismContext(
  plan: FestivalPlan,
  options: TourApiOptions = {},
): Promise<TourismContext> {
  const fetchImpl = options.fetchImpl ?? fetch;

  try {
    const areaCode = await resolveAreaCode(plan, fetchImpl, options.signal);
```

Then remove `apiKey` arguments from the remaining `fetchTourApiItems` calls.

- [ ] **Step 5: Keep fallback semantics**

Ensure the existing `catch` block remains:

```ts
  } catch (error) {
    if (
      options.signal?.aborted ||
      (typeof error === "object" && error !== null && "name" in error && error.name === "AbortError")
    ) {
      throw error;
    }
    return createFallbackTourismContext(
      plan,
      "TourAPI 호출 실패로 샘플 데이터를 사용합니다.",
    );
  }
```

Expected: when `/api/tour/*` returns `503`, `502`, malformed JSON, or a failed network request, the client uses sample fallback.

- [ ] **Step 6: Run adapter tests**

Run:

```powershell
npx vitest run --config vitest.config.ts src/services/dataAdapters.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit Task 2**

Run:

```powershell
git add src/services/tourApiAdapter.ts src/services/dataAdapters.test.ts
git commit -m "feat: route TourAPI calls through server proxy"
```

Expected: commit succeeds.

## Task 3: Docker and Documentation

**Files:**
- Modify: `Dockerfile`
- Modify: `README.md`
- Modify: `docs/internal-docker-deploy.md`

**Interfaces:**
- Consumes: `npm run build` output in `dist`
- Consumes: `npm start`
- Produces: Docker image that runs `node server/index.js` with `PORT=80`
- Produces: deployment docs for keyless demo mode and `TOUR_API_KEY` env-file mode

- [ ] **Step 1: Update Dockerfile**

Replace `Dockerfile` with:

```Dockerfile
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=80

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server ./server
COPY --from=build /app/dist ./dist

EXPOSE 80

CMD ["node", "server/index.js"]
```

- [ ] **Step 2: Update README TourAPI section**

In `README.md`, replace the current "TourAPI 실제 연동" section with text that states:

```markdown
## TourAPI 실제 연동

서버 배포와 실제 시연에서는 브라우저용 `VITE_TOUR_API_KEY`를 사용하지 않습니다. TourAPI 인증키는 서버 런타임 환경변수 `TOUR_API_KEY`로만 제공합니다.

```env
TOUR_API_KEY=발급받은_일반_인증키_Decoding_값
```

React 앱은 같은 origin의 `/api/tour/*` 프록시만 호출합니다. 프록시 서버가 `serviceKey`를 붙여 한국관광공사 TourAPI의 `areaCode2`, `searchFestival2`, `detailCommon2`, `locationBasedList2`를 호출합니다. 인증키가 없거나 호출·응답 검증에 실패하면 기존 TourAPI 형태의 샘플 데이터로 자동 대체됩니다.

로컬에서 Vite 개발 서버만 실행하면 프록시가 없으므로 sample fallback으로 동작합니다. 실제 TourAPI를 로컬에서 검증하려면 `npm run build` 후 `TOUR_API_KEY`와 함께 `npm start`를 실행합니다.
```

Close and reopen code fences correctly in the actual file.

- [ ] **Step 3: Update Docker deployment docs**

In `docs/internal-docker-deploy.md`, update the prerequisites and run sections so they include:

```markdown
- 키 없는 내부 데모는 `TOUR_API_KEY` 없이 실행하며 sample fallback으로 동작한다.
- 실제 TourAPI 모드는 서버에만 있는 env 파일로 `TOUR_API_KEY`를 주입한다.
```

Add a server-side env-file example without any real key:

```bash
cat > "$HOME/fest-twin-demo.env" <<'EOF'
TOUR_API_KEY=발급받은_일반_인증키_Decoding_값
EOF
chmod 600 "$HOME/fest-twin-demo.env"
```

Document keyless run:

```bash
docker run -d --name fest-twin-demo --label com.fest-twin.managed-by=fest-twin-internal-demo --restart unless-stopped -p 18080:80 fest-twin-demo:initial
```

Document real TourAPI run:

```bash
docker run -d --name fest-twin-demo --env-file "$HOME/fest-twin-demo.env" --label com.fest-twin.managed-by=fest-twin-internal-demo --restart unless-stopped -p 18080:80 fest-twin-demo:initial
```

- [ ] **Step 4: Run build**

Run:

```powershell
npm run build
```

Expected: PASS.

- [ ] **Step 5: Run docs secret scan**

Run:

```powershell
rg -n -i '(\b(ENV|ARG)\s+[A-Z0-9_]*(KEY|PASSWORD|PASSWD|SECRET|TOKEN)[A-Z0-9_]*\s*(=|\s)|--build-arg\s+[A-Z0-9_]*(KEY|PASSWORD|PASSWD|SECRET|TOKEN)[A-Z0-9_]*=|[A-Z0-9_]*(KEY|PASSWORD|PASSWD|SECRET|TOKEN)[A-Z0-9_]*\s*[:=]\s*[''"]?[A-Za-z0-9_./+\-]{12,})' Dockerfile .dockerignore server README.md docs/internal-docker-deploy.md docs/superpowers/specs/2026-07-16-tourapi-server-proxy-design.md docs/superpowers/plans/2026-07-16-tourapi-server-proxy.md
```

Expected: no output and exit code `1`.

- [ ] **Step 6: Commit Task 3**

Run:

```powershell
git add Dockerfile README.md docs/internal-docker-deploy.md
git commit -m "chore: run Fest-Twin through Node server"
```

Expected: commit succeeds.

## Task 4: Full Verification and Server Redeploy

**Files:**
- Modify only if verification reveals a root cause that must be fixed.

**Interfaces:**
- Consumes: committed implementation from Tasks 1-3
- Produces: redeployed `fest-twin-demo` container on `192.168.55.223:18080`

- [ ] **Step 1: Run the full test suite**

Run:

```powershell
npm run test
```

Expected: all Vitest files pass.

- [ ] **Step 2: Run production build**

Run:

```powershell
npm run build
```

Expected: TypeScript and Vite build pass.

- [ ] **Step 3: Run whitespace check**

Run:

```powershell
git diff --check
```

Expected: no output.

- [ ] **Step 4: Confirm Docker is still unavailable locally or build locally if available**

Run:

```powershell
docker --version
```

Expected on this workstation today: Docker may be unavailable. If unavailable, perform Docker build verification on the server during redeploy.

- [ ] **Step 5: Archive and upload committed HEAD**

Run:

```powershell
git archive -o fest-twin-demo.tar HEAD
scp .\fest-twin-demo.tar cwuser@192.168.55.223:~/fest-twin-demo.tar
Remove-Item .\fest-twin-demo.tar
```

Expected: upload succeeds.

- [ ] **Step 6: Redeploy on the server using the documented rollback procedure**

Run the redeploy procedure from `docs/internal-docker-deploy.md`. Use keyless mode first unless the user confirms the server env file should be created with the real key.

Expected:

```text
fest-twin-demo ... 0.0.0.0:18080->80/tcp ... Up
```

- [ ] **Step 7: Verify server endpoints**

Run:

```powershell
ssh -o BatchMode=yes cwuser@192.168.55.223 'docker ps --filter name=fest-twin-demo --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"; curl -fsSI --max-time 10 http://127.0.0.1:18080/; curl -fsS --max-time 10 http://127.0.0.1:18080/api/tour/area-code || true'
curl.exe -I --max-time 15 http://192.168.55.223:18080/
```

Expected:

- `/` returns `HTTP/1.1 200 OK`.
- Without `TOUR_API_KEY`, `/api/tour/area-code` returns JSON error code `TOUR_API_KEY_MISSING`.
- The dashboard still loads and falls back to sample TourAPI data.

- [ ] **Step 8: Commit deployment documentation adjustments if any**

If redeploy reveals a documentation gap and a docs patch is made, run:

```powershell
git add docs/internal-docker-deploy.md
git commit -m "docs: clarify TourAPI proxy deployment"
```

Expected: commit succeeds only if docs changed.
