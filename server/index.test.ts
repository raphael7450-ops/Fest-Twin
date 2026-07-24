import { describe, expect, it } from "vitest";
import { securityHeadersMiddleware, createRateLimiter } from "./index.js";

describe("server/index", () => {
  it("sets HTTP security headers on responses", () => {
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
});
