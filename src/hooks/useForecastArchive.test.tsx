import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useForecastArchive } from "./useForecastArchive";
import type { FestivalAnalysisSnapshot } from "../services/analysisSnapshot";

const snapshot = { analysisId: "one", festivalId: "festival", modelVersion: "phase1-v1", plan: {}, forecast: {}, datasets: {} } as FestivalAnalysisSnapshot;
afterEach(() => vi.unstubAllGlobals());
it("archives a committed snapshot once without sending unrelated report fields", async () => {
  const fetch = vi.fn().mockResolvedValueOnce(Response.json({ id: "receipt", receivedAt: "2026-09-10T00:00:00Z", timing: "pre_event_received" }))
    .mockResolvedValueOnce(Response.json({ archive: { archived: 1 }, evaluation: { comparable: 0 } }));
  vi.stubGlobal("fetch", fetch);
  const { result, rerender } = renderHook(() => useForecastArchive(snapshot));
  await waitFor(() => expect(result.current.phase).toBe("saved"));
  rerender();
  expect(fetch.mock.calls.filter(call => call[1]?.method === "POST")).toHaveLength(1);
  expect(JSON.parse(fetch.mock.calls[0][1].body)).not.toHaveProperty("analysisId");
});
it("keeps a failed archive separate from the analysis and handles stale responses", async () => {
  let resolveFirst!: (value: Response) => void;
  vi.stubGlobal("fetch", vi.fn().mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve; }))
    .mockResolvedValue(Response.json({}, { status: 503 })));
  const { result, rerender } = renderHook(({ value }) => useForecastArchive(value), { initialProps: { value: snapshot } });
  rerender({ value: { ...snapshot, analysisId: "two" } });
  await waitFor(() => expect(result.current.phase).toBe("failed"), { timeout: 5000 });
  await act(async () => resolveFirst(Response.json({ id: "old" })));
  expect(result.current.receipt).toBeUndefined();
});
