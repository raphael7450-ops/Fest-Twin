import { describe, expect, it, vi } from "vitest";
import { getFestivalCandidates } from "./tourApiAdapter";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import { applyFestivalCandidateToPlan } from "./festivalSelection";

function api(items: unknown[]) {
  return { response: { header: { resultCode: "0000" }, body: { items: { item: items }, totalCount: items.length } } };
}

function mockSource(records: unknown[], tourItems: unknown[] = []) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), "http://localhost");
    const payload = url.pathname === "/api/regional-festivals" ? { records }
      : url.pathname === "/api/tour/area-code" ? api([{ code: "1", name: "서울" }])
      : url.pathname === "/api/tour/festivals" ? api(tourItems) : api([]);
    return new Response(JSON.stringify(payload), { status: 200 });
  });
}

const plan = { ...sampleFestivalPlan, region: "서울", startDate: "2026-10-17", endDate: "2026-10-21", keywords: [] };

describe("festival schedule reliability", () => {
  it("reads every regional page before returning the complete result", async () => {
    const records = Array.from({ length: 105 }, (_, i) => ({ id: `page-${i}`, name: `서울 페이지축제 ${i}`, region: "서울",
      startDate: "2026-10-17", endDate: "2026-10-21" }));
    const base = mockSource([]);
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");
      if (url.pathname !== "/api/regional-festivals") return base(input);
      const offset = Number(url.searchParams.get("offset"));
      return new Response(JSON.stringify({ records: records.slice(offset, offset + 100) }));
    });
    expect(await getFestivalCandidates(plan, { fetchImpl, today: "2026-09-09" })).toHaveLength(105);
  });
  it("does not hide candidates after the first twenty results", async () => {
    const fetchImpl = mockSource(Array.from({ length: 35 }, (_, i) => ({ id: `row-${i}`, name: `서울 축제 ${i}`, region: "서울",
      startDate: "2026-10-17", endDate: "2026-10-21" })));
    const candidates = await getFestivalCandidates(plan, { fetchImpl, today: "2026-09-09" });
    expect(candidates).toHaveLength(35);
  });
  it("does not stretch reported dates with an uncertain regional search window", async () => {
    const fetchImpl = mockSource([{ id: "uncertain", name: "서울 비교축제", region: "서울",
      dateStatus: "needs-review", searchStartDate: "2026-10-01", searchEndDate: "2026-10-31" }],
      [{ contentid: "tour", title: "서울 비교축제", addr1: "서울", eventstartdate: "20261017", eventenddate: "20261021" }]);
    const candidates = await getFestivalCandidates(plan, { fetchImpl, today: "2026-09-09" });
    expect(candidates.find((item) => item.id === "tour")).toMatchObject({ startDate: "2026-10-17", endDate: "2026-10-21" });
  });
  it("does not mutate the plan if an uncertain candidate bypasses the UI", () => {
    expect(applyFestivalCandidateToPlan(plan, { id: "blocked", title: "미확정", address: "서울",
      startDate: "2026-10-01", endDate: "2026-10-31", dateStatus: "needs-review", searchScope: "regional-supplement" })).toBe(plan);
  });
  it("retains uncertain candidates without exposing search bounds as event dates", async () => {
    const fetchImpl = mockSource([{ id: "uncertain", name: "확인대기축제", region: "서울",
      startDate: null, endDate: null, dateStatus: "needs-review", periodLabel: "2026-10 일정 확인 필요",
      searchStartDate: "2026-10-01", searchEndDate: "2026-10-31" }]);
    const candidates = await getFestivalCandidates(plan, { fetchImpl, today: "2026-09-09" });
    expect(candidates.find((item) => item.id === "uncertain")).toMatchObject({
      startDate: "", endDate: "", dateStatus: "needs-review", periodLabel: "2026-10 일정 확인 필요",
    });
  });

  it("keeps a confirmed December event that finishes next January", async () => {
    const fetchImpl = mockSource([{ id: "winter", name: "2026 서울라이트 광화문", region: "서울",
      startDate: "2026-12-18", endDate: "2026-12-31" }]);
    const candidates = await getFestivalCandidates({ ...plan, startDate: "2026-12-01", endDate: "2026-12-31" }, { fetchImpl, today: "2026-09-09" });
    expect(candidates.find((item) => item.id === "winter")).toMatchObject({ startDate: "2026-12-11", endDate: "2027-01-03" });
  });

  it("does not include annual fallback events outside the chosen dates", async () => {
    const fetchImpl = mockSource([], [{ contentid: "other", title: "서울 다른달축제", addr1: "서울",
      eventstartdate: "20261110", eventenddate: "20261112" }]);
    const candidates = await getFestivalCandidates(plan, { fetchImpl, today: "2026-09-09" });
    expect(candidates.some((item) => item.id === "other")).toBe(false);
  });

  it("surfaces total lookup failure instead of returning an empty result", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 429 }));
    await expect(getFestivalCandidates(plan, { fetchImpl, today: "2026-09-09" })).rejects.toThrow();
  });
});
