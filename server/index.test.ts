import { describe, expect, it } from "vitest";
import { corsMiddleware, createApp, createRateLimiter, securityHeadersMiddleware } from "./index.js";

async function withAppServer(app: ReturnType<typeof createApp>, callback: (baseUrl: string) => Promise<void>) {
  const server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Test server did not start on a TCP port");
  }

  try {
    await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

describe("server/index", () => {
  it("sets HTTP security headers including Content-Security-Policy", () => {
    const responseHeaders = new Map<string, string>();
    const mockRes: any = {
      setHeader(k: string, v: string) {
        responseHeaders.set(k, v);
      },
    };

    let calledNext = false;
    securityHeadersMiddleware({} as any, mockRes, () => {
      calledNext = true;
    });

    expect(calledNext).toBe(true);
    expect(responseHeaders.get("X-Content-Type-Options")).toBe("nosniff");
    expect(responseHeaders.get("X-Frame-Options")).toBe("DENY");
    expect(responseHeaders.get("X-XSS-Protection")).toBe("1; mode=block");
    expect(responseHeaders.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(responseHeaders.get("Content-Security-Policy")).toContain("oapi.map.naver.com");
  });

  it("handles CORS allowlist for trusted origins", () => {
    const responseHeaders = new Map<string, string>();
    const mockRes: any = {
      setHeader(k: string, v: string) {
        responseHeaders.set(k, v);
      },
      status(code: number) {
        return {
          end() {
            return code;
          },
        };
      },
    };

    const mockReq: any = {
      headers: { origin: "https://cwserver.tail97dbc3.ts.net" },
      method: "GET",
    };

    let calledNext = false;
    corsMiddleware(mockReq, mockRes, () => {
      calledNext = true;
    });

    expect(calledNext).toBe(true);
    expect(responseHeaders.get("Access-Control-Allow-Origin")).toBe("https://cwserver.tail97dbc3.ts.net");
  });

  it("limits API requests when exceeding rate limit threshold", () => {
    const limiter = createRateLimiter({ maxRequests: 2, windowMs: 60000 });

    let status = 200;
    let jsonBody: any = null;
    const makeRequest = () => {
      status = 200;
      jsonBody = null;
      const res: any = {
        setHeader() {},
        status(code: number) {
          status = code;
          return res;
        },
        json(body: any) {
          jsonBody = body;
          return res;
        },
      };
      const req: any = { ip: "127.0.0.1" };
      let calledNext = false;
      limiter(req, res, () => {
        calledNext = true;
      });
      return { status, jsonBody, calledNext };
    };

    expect(makeRequest().calledNext).toBe(true); // 1st request ok
    expect(makeRequest().calledNext).toBe(true); // 2nd request ok
    const third = makeRequest(); // 3rd request blocked
    expect(third.calledNext).toBe(false);
    expect(third.status).toBe(429);
    expect(third.jsonBody?.error?.code).toBe("TOO_MANY_REQUESTS");
  });

  it("keeps the default OpenAPI limit high enough for repeated candidate refreshes", async () => {
    const app = createApp({
      generalRateLimitOptions: { maxRequests: 300 },
      apiKey: "test-key",
      fetchImpl: (async () =>
        new Response(
          JSON.stringify({
            response: {
              header: { resultCode: "0000", resultMsg: "OK" },
              body: {
                items: {
                  item: [{ rnum: 1, code: "1", name: "서울" }],
                },
                totalCount: 1,
              },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        )) as typeof fetch,
      disableHttpLogging: true,
    });

    await withAppServer(app, async (baseUrl) => {
      const responses = await Promise.all(
        Array.from({ length: 31 }, () => fetch(`${baseUrl}/api/tour/area-code?numOfRows=50&pageNo=1`)),
      );

      expect(responses.every((response) => response.status === 200)).toBe(true);
      expect(responses[30].headers.get("X-RateLimit-Limit")).toBe("120");
    });
  });

  it("parses JSON bodies for trend proxy requests mounted through createApp", async () => {
    const dummyLimiter = (_req: any, _res: any, next: any) => next();
    const app = createApp({
      generalRateLimiter: dummyLimiter,
      openApiRateLimiter: dummyLimiter,
      naverDataLabClientId: "",
      naverDataLabClientSecret: "",
      disableHttpLogging: true,
    });

    await withAppServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/trends/naver-search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: "2026-07-01",
          endDate: "2026-07-28",
          timeUnit: "week",
          keywordGroups: [{ groupName: "Fest Twin", keywords: ["festival"] }],
        }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.sourceStatus).toBe("sample-fallback");
      expect(body.results[0].keywords).toEqual(["festival"]);
    });
  });
});
