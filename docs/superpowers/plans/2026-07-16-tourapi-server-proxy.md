# TourAPI 서버 프록시 구현 계획

> agent 작업자 필수 지침: 이 계획을 구현할 때는 `superpowers:subagent-driven-development`(권장) 또는 `superpowers:executing-plans`를 사용한다. 각 단계는 진행 추적을 위해 체크박스(`- [ ]`) 형식을 사용한다.

목표: TourAPI 인증키 사용을 브라우저 번들에서 서버 프록시로 옮기고, 기존 대시보드 주소와 fallback 동작을 유지한다.

아키텍처: Node/Express 서버를 추가해 빌드된 React 앱을 서빙하고 `/api/tour/*` 요청을 한국관광공사 TourAPI로 프록시한다. React 데이터 어댑터는 같은 origin의 프록시 엔드포인트를 호출하며, 프록시가 없거나 오류를 반환하면 기존 샘플 데이터로 대체한다. Docker는 Node 서버를 컨테이너 포트 `80`에서 실행하고, 호스트 포트는 기존처럼 `18080`에 매핑한다.

기술 스택: React 18, TypeScript, Vite, Vitest, Node 20, Express, Docker.

## 전역 제약

- TourAPI 인증키는 Git, Docker 이미지, 브라우저 번들, 로그, 오류 응답에 저장하거나 노출하지 않는다.
- 서버는 런타임 환경변수 `TOUR_API_KEY`에서만 인증키를 읽는다.
- 공개 대시보드 URL은 `http://192.168.55.223:18080/`를 유지한다.
- 앱은 `TOUR_API_KEY` 없이도 기존 샘플 fallback 데이터로 동작해야 한다.
- Docker 호스트 포트 매핑은 `18080:80`을 유지한다.
- 로그인, 데이터베이스, 키 관리 UI, 외부 API 응답 장기 저장, 실시간 소셜 데이터 연동은 추가하지 않는다.
- `.env*` 파일은 `.env.example`을 제외하고 계속 Docker build context에서 제외한다.

---

## 파일 구조

- 생성 `server/tourProxy.js`: 프록시 요청을 검증하고, `TOUR_API_KEY`로 TourAPI를 호출하며, HTTP 오류를 정규화하고 키를 노출하지 않는다.
- 생성 `server/index.js`: Express 앱을 만들고, `/api/tour/*` 라우터를 붙이며, `dist`와 SPA fallback을 서빙한다.
- 생성 `server/tourProxy.test.ts`: 프록시 URL 생성, query 검증, 키 없음, upstream 실패, 키 비노출을 테스트한다.
- 수정 `package.json`: `express`를 추가하고 서버 시작 스크립트를 추가한다.
- 수정 `package-lock.json`: 새 런타임 의존성을 lock한다.
- 수정 `src/services/tourApiAdapter.ts`: live 호출을 기본적으로 `/api/tour/*`로 보내고 프록시 실패 시 샘플 fallback을 유지한다.
- 수정 `src/services/dataAdapters.test.ts`: 브라우저 `serviceKey` 대신 프록시 경로와 fallback 동작을 검증하도록 TourAPI 어댑터 테스트를 갱신한다.
- 수정 `Dockerfile`: React 앱을 빌드하고, production 서버 의존성과 `server/`, `dist`를 복사한 뒤 `node server/index.js`를 실행한다.
- 유지 `nginx.conf`: 새 Docker runtime은 nginx에 의존하지 않으므로 당장은 사용하지 않는 legacy 파일로 남긴다.
- 수정 `README.md`: 브라우저용 `VITE_TOUR_API_KEY` 사용을 폐기하고 서버 프록시 모드의 `TOUR_API_KEY`를 문서화한다.
- 수정 `docs/internal-docker-deploy.md`: 키 없는 데모 모드와 `TOUR_API_KEY` env-file 모드를 실제 키 없이 문서화한다.

## Task 1: 서버 프록시

파일:
- 생성: `server/tourProxy.js`
- 생성: `server/index.js`
- 생성: `server/tourProxy.test.ts`
- 수정: `package.json`
- 수정: `package-lock.json`

인터페이스:
- 제공: `createTourProxyRouter(options?: { fetchImpl?: typeof fetch; apiKey?: string }): import("express").Router`
- 제공: `createApp(options?: { fetchImpl?: typeof fetch; apiKey?: string; staticDir?: string }): import("express").Express`
- 사용: 서버 런타임 환경변수 `TOUR_API_KEY`와 선택 환경변수 `PORT`
- 이후 태스크가 사용할 same-origin 엔드포인트:
  - `GET /api/tour/area-code`
  - `GET /api/tour/festivals`
  - `GET /api/tour/detail`
  - `GET /api/tour/nearby`

- [ ] Step 1: Express 설치

실행:

```powershell
npm install express
```

예상: `package.json`의 dependencies에 `"express"`가 추가되고 `package-lock.json`이 갱신된다.

- [ ] Step 2: 서버 테스트를 먼저 추가

`server/tourProxy.test.ts`를 다음 내용으로 생성한다.

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

- [ ] Step 3: 새 테스트가 실패하는지 확인

실행:

```powershell
npx vitest run --config vitest.config.ts server/tourProxy.test.ts
```

예상: `server/tourProxy.js`가 없어서 실패한다.

- [ ] Step 4: 프록시 라우터 구현

`server/tourProxy.js`를 다음 내용으로 생성한다.

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

- [ ] Step 5: Express 앱 구현

`server/index.js`를 다음 내용으로 생성한다.

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

- [ ] Step 6: package script 추가

`package.json`의 scripts에 `start`를 추가한다.

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

- [ ] Step 7: 서버 프록시 테스트 실행

실행:

```powershell
npx vitest run --config vitest.config.ts server/tourProxy.test.ts
```

예상: `server/tourProxy.test.ts`의 모든 테스트가 통과한다.

- [ ] Step 8: Task 1 커밋

실행:

```powershell
git add package.json package-lock.json server/tourProxy.js server/index.js server/tourProxy.test.ts
git commit -m "feat: add TourAPI server proxy"
```

예상: 커밋이 성공한다.

## Task 2: 클라이언트 어댑터 프록시 전환

파일:
- 수정: `src/services/tourApiAdapter.ts`
- 수정: `src/services/dataAdapters.test.ts`

인터페이스:
- 사용: `GET /api/tour/area-code`, `/api/tour/festivals`, `/api/tour/detail`, `/api/tour/nearby`
- 제공: 기존 `getTourismContext(plan, options)` API는 유지한다.
- 제공: `TourApiOptions.apiKey`는 필요하면 테스트용 legacy override로만 남기고, production code는 `import.meta.env.VITE_TOUR_API_KEY`를 읽지 않는다.

- [ ] Step 1: 어댑터 테스트를 먼저 갱신

`src/services/dataAdapters.test.ts`에서 `"orchestrates all four TourAPI endpoints with decoded-key URL parameters"` 테스트를 다음 테스트로 교체한다.

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

- [ ] Step 2: 어댑터 테스트 실패 확인

실행:

```powershell
npx vitest run --config vitest.config.ts src/services/dataAdapters.test.ts
```

예상: `tourApiAdapter.ts`가 아직 API key를 요구하고 TourAPI 원본 URL을 만들기 때문에 실패한다.

- [ ] Step 3: 어댑터 URL builder 변경

`src/services/tourApiAdapter.ts`에서 `TOUR_API_BASE_URL`을 제거하고, `createTourApiUrl`에서 `apiKey` 인자를 제거하며, operation 이름을 프록시 엔드포인트로 바꾼다.

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

operation 문자열을 다음처럼 교체한다.

```ts
"areaCode2" -> "area-code"
"searchFestival2" -> "festivals"
"detailCommon2" -> "detail"
"locationBasedList2" -> "nearby"
```

- [ ] Step 4: 브라우저 키 없이 fetch orchestration 변경

`fetchTourApiItems`, `resolveAreaCode`, `getTourismContext` 시그니처를 바꿔 production path에서 `import.meta.env.VITE_TOUR_API_KEY`를 읽지 않게 한다.

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

이후 나머지 `fetchTourApiItems` 호출에서 `apiKey` 인자를 제거한다.

- [ ] Step 5: fallback semantics 유지

기존 `catch` 블록은 유지한다.

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

예상: `/api/tour/*`가 `503`, `502`, 잘못된 JSON, 네트워크 오류를 반환하면 클라이언트는 sample fallback을 사용한다.

- [ ] Step 6: 어댑터 테스트 실행

실행:

```powershell
npx vitest run --config vitest.config.ts src/services/dataAdapters.test.ts
```

예상: 통과한다.

- [ ] Step 7: Task 2 커밋

실행:

```powershell
git add src/services/tourApiAdapter.ts src/services/dataAdapters.test.ts
git commit -m "feat: route TourAPI calls through server proxy"
```

예상: 커밋이 성공한다.

## Task 3: Docker와 문서

파일:
- 수정: `Dockerfile`
- 수정: `README.md`
- 수정: `docs/internal-docker-deploy.md`

인터페이스:
- 사용: `npm run build` 결과물 `dist`
- 사용: `npm start`
- 제공: `PORT=80`으로 `node server/index.js`를 실행하는 Docker 이미지
- 제공: 키 없는 데모 모드와 `TOUR_API_KEY` env-file 모드 배포 문서

- [ ] Step 1: Dockerfile 갱신

`Dockerfile`을 다음 내용으로 교체한다.

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

- [ ] Step 2: README TourAPI 섹션 갱신

`README.md`의 현재 "TourAPI 실제 연동" 섹션을 다음 내용으로 교체한다.

```markdown
## TourAPI 실제 연동

서버 배포와 실제 시연에서는 브라우저용 `VITE_TOUR_API_KEY`를 사용하지 않습니다. TourAPI 인증키는 서버 런타임 환경변수 `TOUR_API_KEY`로만 제공합니다.

```env
TOUR_API_KEY=발급받은_일반_인증키_Decoding_값
```

React 앱은 같은 origin의 `/api/tour/*` 프록시만 호출합니다. 프록시 서버가 `serviceKey`를 붙여 한국관광공사 TourAPI의 `areaCode2`, `searchFestival2`, `detailCommon2`, `locationBasedList2`를 호출합니다. 인증키가 없거나 호출·응답 검증에 실패하면 기존 TourAPI 형태의 샘플 데이터로 자동 대체됩니다.

로컬에서 Vite 개발 서버만 실행하면 프록시가 없으므로 sample fallback으로 동작합니다. 실제 TourAPI를 로컬에서 검증하려면 `npm run build` 후 `TOUR_API_KEY`와 함께 `npm start`를 실행합니다.
```

실제 파일에서는 Markdown 코드 fence가 올바르게 닫히도록 작성한다.

- [ ] Step 3: Docker 배포 문서 갱신

`docs/internal-docker-deploy.md`의 전제 조건과 실행 섹션에 다음 내용을 포함한다.

```markdown
- 키 없는 내부 데모는 `TOUR_API_KEY` 없이 실행하며 sample fallback으로 동작한다.
- 실제 TourAPI 모드는 서버에만 있는 env 파일로 `TOUR_API_KEY`를 주입한다.
```

실제 키가 없는 서버 env-file 예시를 추가한다.

```bash
cat > "$HOME/fest-twin-demo.env" <<'EOF'
TOUR_API_KEY=발급받은_일반_인증키_Decoding_값
EOF
chmod 600 "$HOME/fest-twin-demo.env"
```

키 없는 실행을 문서화한다.

```bash
docker run -d --name fest-twin-demo --label com.fest-twin.managed-by=fest-twin-internal-demo --restart unless-stopped -p 18080:80 fest-twin-demo:initial
```

실제 TourAPI 실행을 문서화한다.

```bash
docker run -d --name fest-twin-demo --env-file "$HOME/fest-twin-demo.env" --label com.fest-twin.managed-by=fest-twin-internal-demo --restart unless-stopped -p 18080:80 fest-twin-demo:initial
```

- [ ] Step 4: build 실행

실행:

```powershell
npm run build
```

예상: 통과한다.

- [ ] Step 5: 문서/설정 비밀값 scan 실행

실행:

```powershell
rg -n -i '(\b(ENV|ARG)\s+[A-Z0-9_]*(KEY|PASSWORD|PASSWD|SECRET|TOKEN)[A-Z0-9_]*\s*(=|\s)|--build-arg\s+[A-Z0-9_]*(KEY|PASSWORD|PASSWD|SECRET|TOKEN)[A-Z0-9_]*=|[A-Z0-9_]*(KEY|PASSWORD|PASSWD|SECRET|TOKEN)[A-Z0-9_]*\s*[:=]\s*[''"]?[A-Za-z0-9_./+\-]{12,})' Dockerfile .dockerignore server README.md docs/internal-docker-deploy.md docs/superpowers/specs/2026-07-16-tourapi-server-proxy-design.md docs/superpowers/plans/2026-07-16-tourapi-server-proxy.md
```

예상: 출력이 없고 exit code는 `1`이다.

- [ ] Step 6: Task 3 커밋

실행:

```powershell
git add Dockerfile README.md docs/internal-docker-deploy.md
git commit -m "chore: run Fest-Twin through Node server"
```

예상: 커밋이 성공한다.

## Task 4: 전체 검증과 서버 재배포

파일:
- 검증 중 root cause가 확인되어 수정이 필요한 경우에만 변경한다.

인터페이스:
- 사용: Task 1-3의 커밋된 구현
- 제공: `192.168.55.223:18080`의 재배포된 `fest-twin-demo` 컨테이너

- [ ] Step 1: 전체 테스트 실행

실행:

```powershell
npm run test
```

예상: 모든 Vitest 파일이 통과한다.

- [ ] Step 2: production build 실행

실행:

```powershell
npm run build
```

예상: TypeScript와 Vite build가 통과한다.

- [ ] Step 3: whitespace check 실행

실행:

```powershell
git diff --check
```

예상: 출력이 없다.

- [ ] Step 4: 로컬 Docker 가능 여부 확인

실행:

```powershell
docker --version
```

예상: 이 워크스테이션에서는 Docker가 없을 수 있다. 없으면 서버 재배포 과정에서 Docker build를 검증한다.

- [ ] Step 5: 커밋된 HEAD archive 업로드

실행:

```powershell
git archive -o fest-twin-demo.tar HEAD
scp .\fest-twin-demo.tar cwuser@192.168.55.223:~/fest-twin-demo.tar
Remove-Item .\fest-twin-demo.tar
```

예상: 업로드가 성공한다.

- [ ] Step 6: 문서화된 rollback 절차로 서버 재배포

`docs/internal-docker-deploy.md`의 재배포 절차를 실행한다. 사용자가 실제 키를 서버 env 파일에 넣으라고 명확히 승인하지 않으면 키 없는 모드로 먼저 실행한다.

예상:

```text
fest-twin-demo ... 0.0.0.0:18080->80/tcp ... Up
```

- [ ] Step 7: 서버 엔드포인트 검증

실행:

```powershell
ssh -o BatchMode=yes cwuser@192.168.55.223 'docker ps --filter name=fest-twin-demo --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"; curl -fsSI --max-time 10 http://127.0.0.1:18080/; curl -fsS --max-time 10 http://127.0.0.1:18080/api/tour/area-code || true'
curl.exe -I --max-time 15 http://192.168.55.223:18080/
```

예상:

- `/`는 `HTTP/1.1 200 OK`를 반환한다.
- `TOUR_API_KEY`가 없으면 `/api/tour/area-code`는 JSON error code `TOUR_API_KEY_MISSING`을 반환한다.
- 대시보드는 계속 로드되고 sample TourAPI 데이터로 fallback한다.

- [ ] Step 8: 필요한 경우 배포 문서 보완 커밋

재배포 중 문서 gap이 확인되어 문서 patch를 만들었다면 실행한다.

```powershell
git add docs/internal-docker-deploy.md
git commit -m "docs: clarify TourAPI proxy deployment"
```

예상: 문서가 변경된 경우에만 커밋한다.
