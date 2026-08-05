import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearCache, getCachedData, setCacheCapacity, setCachedData } from "./cache.js";

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

  it("evicts least recently used (LRU) entry when max capacity is reached", () => {
    setCacheCapacity(3);

    setCachedData("k1", "v1");
    setCachedData("k2", "v2");
    setCachedData("k3", "v3");

    // Access k1 so k2 becomes the oldest (LRU)
    expect(getCachedData("k1")).toBe("v1");

    // Add 4th item -> should evict k2
    setCachedData("k4", "v4");

    expect(getCachedData("k2")).toBeNull(); // Evicted
    expect(getCachedData("k1")).toBe("v1");
    expect(getCachedData("k3")).toBe("v3");
    expect(getCachedData("k4")).toBe("v4");
  });
});

