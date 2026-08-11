import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { sampleDemandBackdataContext } from "../data/sampleDemandBackdata";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import { sampleSpendingContext } from "../data/sampleSpending";
import { sampleTourismContext } from "../data/sampleTourApi";
import { sampleTrafficContext } from "../data/sampleTraffic";
import { sampleTrendContext } from "../data/sampleTrends";
import type { FestivalPlan, SelectedFestivalBasis, TourismContext } from "../domain/types";
import { createAnalysisKey } from "../services/analysisSnapshot";
import type { FestivalCandidate } from "../services/tourApiAdapter";
import { getFallbackWeatherContext } from "../services/weatherAdapter";
import {
  useFestivalAnalysis,
  type FestivalAnalysisDependencies,
  type FestivalAnalysisInput,
} from "./useFestivalAnalysis";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

const planA = structuredClone(sampleFestivalPlan);
const planB: FestivalPlan = {
  ...structuredClone(sampleFestivalPlan),
  name: "Festival B",
  region: "Region B",
  venueAddress: "Venue B",
  startDate: "2027-02-01",
  endDate: "2027-02-03",
  expectedCapacity: sampleFestivalPlan.expectedCapacity + 5000,
};

function basis(contentId: string, plan: FestivalPlan): SelectedFestivalBasis {
  return {
    contentId,
    title: plan.name,
    address: plan.venueAddress,
    startDate: plan.startDate,
    endDate: plan.endDate,
    sourceName: "test candidate",
  };
}

const inputA: FestivalAnalysisInput = {
  plan: planA,
  selectedFestivalBasis: basis("festival-a", planA),
  selectedHour: 20,
};
const inputB: FestivalAnalysisInput = {
  plan: planB,
  selectedFestivalBasis: basis("festival-b", planB),
  selectedHour: 21,
};

const candidateA: FestivalCandidate = {
  id: "festival-a",
  title: planA.name,
  address: planA.venueAddress,
  startDate: planA.startDate,
  endDate: planA.endDate,
  mapX: "126.9780",
  mapY: "37.5665",
  searchScope: "exact-period",
};

function dependencies(
  overrides: Partial<FestivalAnalysisDependencies> = {},
): FestivalAnalysisDependencies {
  return {
    loadTourism: vi.fn().mockResolvedValue(structuredClone(sampleTourismContext)),
    loadTrends: vi.fn().mockResolvedValue(structuredClone(sampleTrendContext)),
    loadTraffic: vi.fn().mockResolvedValue(structuredClone(sampleTrafficContext)),
    loadSpending: vi.fn().mockResolvedValue(structuredClone(sampleSpendingContext)),
    loadDemandBackdata: vi.fn().mockResolvedValue(structuredClone(sampleDemandBackdataContext)),
    loadWeather: vi.fn().mockResolvedValue(getFallbackWeatherContext()),
    now: () => new Date("2026-08-11T00:00:00.000Z"),
    ...overrides,
  } as FestivalAnalysisDependencies;
}

describe("useFestivalAnalysis", () => {
  it("starts with loading and no synthetic previous festival", () => {
    const pendingTourism = deferred<TourismContext>();
    const deps = dependencies({ loadTourism: vi.fn(() => pendingTourism.promise) });

    const { result, unmount } = renderHook(() => useFestivalAnalysis(inputA, deps));

    expect(result.current.phase).toBe("loading");
    expect(result.current.snapshot).toBeUndefined();
    expect(result.current.pendingFestivalTitle).toBeUndefined();
    unmount();
  });

  it("passes one cloned plan and one abort signal to every adapter", async () => {
    const deps = dependencies();
    const { result } = renderHook(() => useFestivalAnalysis(inputA, deps));

    await waitFor(() => expect(result.current.phase).toBe("ready"));

    const planArguments = [
      vi.mocked(deps.loadTourism).mock.calls[0][0],
      vi.mocked(deps.loadTrends).mock.calls[0][0],
      vi.mocked(deps.loadTraffic).mock.calls[0][0],
      vi.mocked(deps.loadSpending).mock.calls[0][0],
      vi.mocked(deps.loadDemandBackdata).mock.calls[0][0],
      vi.mocked(deps.loadWeather).mock.calls[0][0],
    ];
    expect(planArguments.every((plan) => plan === planArguments[0])).toBe(true);
    expect(planArguments[0]).not.toBe(inputA.plan);

    const optionSignals = [
      vi.mocked(deps.loadTourism).mock.calls[0][1]?.signal,
      vi.mocked(deps.loadTrends).mock.calls[0][1]?.signal,
      vi.mocked(deps.loadTraffic).mock.calls[0][1]?.signal,
      vi.mocked(deps.loadSpending).mock.calls[0][1]?.signal,
      vi.mocked(deps.loadDemandBackdata).mock.calls[0][1]?.signal,
      vi.mocked(deps.loadWeather).mock.calls[0][1],
    ];
    expect(optionSignals.every((signal) => signal === optionSignals[0])).toBe(true);
  });

  it("starts only one request when the dependency container changes for the same key", async () => {
    const deps = dependencies();
    const { result, rerender } = renderHook(
      ({ currentDependencies }) => useFestivalAnalysis(inputA, currentDependencies),
      { initialProps: { currentDependencies: deps } },
    );
    await waitFor(() => expect(result.current.phase).toBe("ready"));

    rerender({ currentDependencies: { ...deps } });
    await act(async () => Promise.resolve());

    expect(deps.loadTourism).toHaveBeenCalledTimes(1);
    expect(deps.loadWeather).toHaveBeenCalledTimes(1);
  });

  it("keeps the committed festival while refreshing and exposes only the draft title", async () => {
    const nextTourism = deferred<TourismContext>();
    const loadTourism = vi
      .fn()
      .mockResolvedValueOnce(structuredClone(sampleTourismContext))
      .mockImplementationOnce(() => nextTourism.promise);
    const deps = dependencies({ loadTourism });
    const { result, rerender } = renderHook(
      ({ input }) => useFestivalAnalysis(input, deps),
      { initialProps: { input: inputA } },
    );

    await waitFor(() => expect(result.current.phase).toBe("ready"));
    expect(result.current.snapshot?.festivalId).toBe("festival-a");

    rerender({ input: inputB });
    await waitFor(() => expect(result.current.phase).toBe("refreshing"));
    expect(result.current.snapshot?.festivalId).toBe("festival-a");
    expect(result.current.snapshot?.plan.name).toBe(planA.name);
    expect(result.current.pendingFestivalTitle).toBe(planB.name);

    act(() => nextTourism.resolve(structuredClone(sampleTourismContext)));
    await waitFor(() => expect(result.current.phase).toBe("ready"));
    expect(result.current.snapshot?.festivalId).toBe("festival-b");
    expect(result.current.pendingFestivalTitle).toBeUndefined();
  });

  it("prevents an older deferred response from overwriting a newer completed selection", async () => {
    const oldTourism = deferred<TourismContext>();
    const loadTourism = vi
      .fn()
      .mockImplementationOnce(() => oldTourism.promise)
      .mockResolvedValueOnce(structuredClone(sampleTourismContext));
    const deps = dependencies({ loadTourism });
    const { result, rerender } = renderHook(
      ({ input }) => useFestivalAnalysis(input, deps),
      { initialProps: { input: inputA } },
    );

    rerender({ input: inputB });
    await waitFor(() => expect(result.current.snapshot?.festivalId).toBe("festival-b"));
    const committedId = result.current.snapshot?.analysisId;

    act(() => oldTourism.resolve(structuredClone(sampleTourismContext)));
    await act(async () => Promise.resolve());

    expect(result.current.snapshot?.festivalId).toBe("festival-b");
    expect(result.current.snapshot?.analysisId).toBe(committedId);
    expect(result.current.phase).toBe("ready");
  });

  it("restarts for a candidate search-scope change and rejects the stale response", async () => {
    const oldTourism = deferred<TourismContext>();
    const currentTourism = structuredClone(sampleTourismContext);
    currentTourism.nearbySpots[0].name = "current candidate result";
    const staleTourism = structuredClone(sampleTourismContext);
    staleTourism.nearbySpots[0].name = "stale candidate result";
    const loadTourism = vi
      .fn()
      .mockImplementationOnce(() => oldTourism.promise)
      .mockResolvedValueOnce(currentTourism);
    const deps = dependencies({ loadTourism });
    const initialInput: FestivalAnalysisInput = {
      ...inputA,
      selectedCandidate: candidateA,
    };
    const currentInput: FestivalAnalysisInput = {
      ...inputA,
      selectedCandidate: { ...candidateA, searchScope: "annual-region" },
    };
    const { result, rerender } = renderHook(
      ({ input }) => useFestivalAnalysis(input, deps),
      { initialProps: { input: initialInput } },
    );

    rerender({ input: currentInput });
    await waitFor(() => expect(result.current.phase).toBe("ready"));
    expect(loadTourism).toHaveBeenCalledTimes(2);
    expect(result.current.snapshot?.analysisKey).toBe(createAnalysisKey(currentInput));
    expect(result.current.snapshot?.datasets.tourism.value?.nearbySpots[0].name).toBe(
      "current candidate result",
    );
    const committedId = result.current.snapshot?.analysisId;

    act(() => oldTourism.resolve(staleTourism));
    await act(async () => Promise.resolve());

    expect(result.current.snapshot?.analysisId).toBe(committedId);
    expect(result.current.snapshot?.datasets.tourism.value?.nearbySpots[0].name).toBe(
      "current candidate result",
    );
  });

  it("does not reload for a semantically equal candidate object", async () => {
    const deps = dependencies();
    const initialInput: FestivalAnalysisInput = {
      ...inputA,
      selectedCandidate: candidateA,
    };
    const { result, rerender } = renderHook(
      ({ input }) => useFestivalAnalysis(input, deps),
      { initialProps: { input: initialInput } },
    );
    await waitFor(() => expect(result.current.phase).toBe("ready"));

    rerender({
      input: {
        ...inputA,
        selectedCandidate: {
          searchScope: "exact-period",
          mapY: " 37.5665 ",
          mapX: " 126.9780 ",
          endDate: ` ${planA.endDate} `,
          startDate: ` ${planA.startDate} `,
          address: ` ${planA.venueAddress} `,
          title: ` ${planA.name} `,
          id: " festival-a ",
          imageUrl: "https://example.test/non-analysis-image.jpg",
          organizer: "Non-analysis metadata",
        },
      },
    });
    await act(async () => Promise.resolve());

    expect(deps.loadTourism).toHaveBeenCalledTimes(1);
  });

  it("aborts the old request on key change and the current request on unmount", async () => {
    const signals: AbortSignal[] = [];
    const loadTourism = vi.fn((_plan, options) => {
      signals.push(options.signal!);
      return Promise.resolve(structuredClone(sampleTourismContext));
    });
    const deps = dependencies({ loadTourism });
    const { rerender, unmount } = renderHook(
      ({ input }) => useFestivalAnalysis(input, deps),
      { initialProps: { input: inputA } },
    );

    await waitFor(() => expect(signals).toHaveLength(1));
    rerender({ input: inputB });
    await waitFor(() => expect(signals).toHaveLength(2));
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);

    unmount();
    expect(signals[1].aborted).toBe(true);
  });

  it("marks a rejected dataset unavailable and uses only the new plan's labelled fallback", async () => {
    const deps = dependencies();
    const { result, rerender } = renderHook(
      ({ input }) => useFestivalAnalysis(input, deps),
      { initialProps: { input: inputA } },
    );
    await waitFor(() => expect(result.current.phase).toBe("ready"));
    const oldTourism = result.current.snapshot?.datasets.tourism.value;

    vi.mocked(deps.loadTourism).mockRejectedValueOnce(new Error("tourism offline"));
    rerender({ input: inputB });

    await waitFor(() => expect(result.current.snapshot?.festivalId).toBe("festival-b"));
    expect(result.current.snapshot?.datasets.tourism.status).toBe("unavailable");
    expect(result.current.snapshot?.datasets.tourism.message).toContain("tourism offline");
    expect(result.current.snapshot?.datasets.tourism.value).not.toBe(oldTourism);
    expect(result.current.snapshot?.datasets.tourism.value?.provenance.basisText).toContain(
      planB.region,
    );
    expect(result.current.errorMessages.some((message) => message.includes("tourism offline"))).toBe(
      true,
    );
  });
});
