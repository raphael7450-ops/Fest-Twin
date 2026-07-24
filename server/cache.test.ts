import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearCache, getCachedData, setCachedData } from "./cache.js";

describe("server/cache", () => {
  beforeEach(() => {
    clearCache();
  });

  it("stores and retrieves valid cached data", () => {
    setCachedData("test-key", { message: "hello" });
    expect(getCachedData("test-key")).toEqual({ message: "hello" });
  });

  it("returns null for non-existent keys", () => {
    expect(getCachedData("unknown-key")).toBeNull();
  });

  it("expires cached data after TTL", () => {
    vi.useFakeTimers();
    setCachedData("expiring-key", "data", 1000); // 1초 TTL

    expect(getCachedData("expiring-key")).toBe("data");

    vi.advanceTimersByTime(1001); // 1초 경과

    expect(getCachedData("expiring-key")).toBeNull();
    vi.useRealTimers();
  });

  it("clears all cache entries on clearCache()", () => {
    setCachedData("k1", "v1");
    setCachedData("k2", "v2");

    clearCache();

    expect(getCachedData("k1")).toBeNull();
    expect(getCachedData("k2")).toBeNull();
  });
});
