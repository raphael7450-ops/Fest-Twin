import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sampleSpendingContext } from "./data/sampleSpending";
import { sampleTourismContext } from "./data/sampleTourApi";
import { sampleTrafficContext } from "./data/sampleTraffic";

const {
  getTourismContextMock,
  getTourApiAreaCodesMock,
  getFestivalCandidatesMock,
  getTrafficContextMock,
  getSpendingContextMock,
  getTrendContextMock,
} = vi.hoisted(() => ({
  getTourismContextMock: vi.fn(),
  getTourApiAreaCodesMock: vi.fn(),
  getFestivalCandidatesMock: vi.fn(),
  getTrafficContextMock: vi.fn(),
  getSpendingContextMock: vi.fn(),
  getTrendContextMock: vi.fn(),
}));

vi.mock("./services/tourApiAdapter", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./services/tourApiAdapter")>()),
  getTourismContext: getTourismContextMock,
  getTourApiAreaCodes: getTourApiAreaCodesMock,
  getFestivalCandidates: getFestivalCandidatesMock,
}));

vi.mock("./services/trafficAdapter", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./services/trafficAdapter")>()),
  getTrafficContext: getTrafficContextMock,
}));

vi.mock("./services/spendingAdapter", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./services/spendingAdapter")>()),
  getSpendingContext: getSpendingContextMock,
}));

vi.mock("./services/trendAdapter", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./services/trendAdapter")>()),
  getTrendContext: getTrendContextMock,
}));

import { App } from "./App";
import { sampleTrendContext } from "./data/sampleTrends";

describe("App selected festival basis", () => {
  beforeEach(() => {
    getTourismContextMock.mockReset();
    getTourApiAreaCodesMock.mockReset();
    getFestivalCandidatesMock.mockReset();
    getTrafficContextMock.mockReset();
    getSpendingContextMock.mockReset();
    getTrendContextMock.mockReset();
    getTourismContextMock.mockResolvedValue(sampleTourismContext);
    getTrafficContextMock.mockResolvedValue(sampleTrafficContext);
    getSpendingContextMock.mockResolvedValue(sampleSpendingContext);
    getTrendContextMock.mockResolvedValue(sampleTrendContext);
    getTourApiAreaCodesMock.mockResolvedValue([{ code: "1", name: "서울" }]);
    getFestivalCandidatesMock.mockResolvedValue([
      {
        id: "3439947",
        title: "Gangnam Media Winter Festa",
        address: "Seoul Gangnam-gu Yeongdong-daero 511",
        startDate: "2025-12-19",
        endDate: "2026-01-03",
        mapX: "127.0610512042",
        mapY: "37.5103955843",
        searchScope: "exact-period",
      },
    ]);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    window.history.pushState({}, "", "/");
  });

  it("shows selected TourAPI contentId after a festival candidate is selected", async () => {
    vi.useFakeTimers();
    const view = render(<App />);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    fireEvent.click(screen.getByRole("button", { name: /TourAPI/ }));
    const selectButton = view.container.querySelector<HTMLButtonElement>(
      ".candidate-card .secondary-button",
    );
    expect(selectButton).not.toBeNull();
    fireEvent.click(selectButton!);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getAllByText("3439947").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Gangnam Media Winter Festa").length).toBeGreaterThan(0);
    expect(getTourismContextMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: "Gangnam Media Winter Festa" }),
      expect.objectContaining({
        selectedCandidate: expect.objectContaining({
          id: "3439947",
          title: "Gangnam Media Winter Festa",
        }),
      }),
    );
  });

  it("refreshes tourism, trend, traffic, and spending contexts from the selected candidate", async () => {
    vi.useFakeTimers();
    getFestivalCandidatesMock.mockResolvedValue([
      {
        id: "3439947",
        title: "Gangnam Media Winter Festa",
        address: "Seoul Gangnam-gu Yeongdong-daero 511",
        startDate: "2025-12-19",
        endDate: "2026-01-03",
        mapX: "127.0610512042",
        mapY: "37.5103955843",
        searchScope: "exact-period",
      },
      {
        id: "4000001",
        title: "Seoul Lantern Festa",
        address: "Seoul Jongno-gu Sejong-daero 175",
        startDate: "2025-12-19",
        endDate: "2026-01-03",
        mapX: "126.976952",
        mapY: "37.572649",
        searchScope: "exact-period",
      },
    ]);

    const view = render(<App />);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(getTourismContextMock).toHaveBeenCalledTimes(1);
    expect(getTrendContextMock).toHaveBeenCalledTimes(1);
    expect(getTrafficContextMock).toHaveBeenCalledTimes(1);
    expect(getSpendingContextMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /TourAPI/ }));
    const selectButtons = view.container.querySelectorAll<HTMLButtonElement>(
      ".candidate-card .secondary-button",
    );
    expect(selectButtons.length).toBe(2);
    fireEvent.click(selectButtons[1]);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    const expectedPlan = expect.objectContaining({
      name: "Seoul Lantern Festa",
      venueAddress: "Seoul Jongno-gu Sejong-daero 175",
      startDate: "2025-12-19",
      endDate: "2026-01-03",
    });

    expect(getTourismContextMock).toHaveBeenLastCalledWith(
      expectedPlan,
      expect.objectContaining({
        selectedCandidate: expect.objectContaining({ id: "4000001" }),
      }),
    );
    expect(getTrendContextMock).toHaveBeenLastCalledWith(
      expectedPlan,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(getTrafficContextMock).toHaveBeenLastCalledWith(
      expectedPlan,
      expect.objectContaining({ hour: 20, signal: expect.any(AbortSignal) }),
    );
    expect(getSpendingContextMock).toHaveBeenLastCalledWith(
      expectedPlan,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("prefills budget and expected capacity from similar festival backdata after candidate selection", async () => {
    vi.useFakeTimers();
    getFestivalCandidatesMock.mockResolvedValue([
      {
        id: "4000001",
        title: "서울라이트 광화문",
        address: "서울특별시 종로구 세종대로 175",
        startDate: "2025-12-19",
        endDate: "2026-01-03",
        searchScope: "exact-period",
      },
    ]);

    const view = render(<App />);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    fireEvent.click(screen.getByRole("button", { name: /TourAPI/ }));
    const selectButton = view.container.querySelector<HTMLButtonElement>(
      ".candidate-card .secondary-button",
    );
    expect(selectButton).not.toBeNull();
    fireEvent.click(selectButton!);

    expect(screen.getByLabelText("총 예산(백만원)")).toHaveValue(1100);
    expect(screen.getByLabelText("예상 수용 인원")).toHaveValue(12200);
  });

  it("restores selected TourAPI basis from a shared scenario link", async () => {
    window.history.pushState({}, "", "/?share_token=token_selected");
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/scenarios/share/token_selected")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              parameters: {
                plan: {
                  name: "Gangnam Media Winter Festa",
                  region: "Seoul",
                  venueAddress: "Seoul Gangnam-gu Yeongdong-daero 511",
                  startDate: "2025-12-19",
                  endDate: "2026-01-03",
                  totalBudgetMillionKrw: 920,
                  expectedCapacity: 30000,
                },
                selectedHour: 19,
                selectedFestivalBasis: {
                  contentId: "3439947",
                  title: "Gangnam Media Winter Festa",
                  address: "Seoul Gangnam-gu Yeongdong-daero 511",
                  startDate: "2025-12-19",
                  endDate: "2026-01-03",
                  mapX: "127.0610512042",
                  mapY: "37.5103955843",
                  sourceName: "TourAPI selected festival candidate",
                },
              },
            }),
          } as Response);
        }
        return Promise.resolve({ ok: false, json: async () => ({}) } as Response);
      }),
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText("3439947").length).toBeGreaterThan(0);
    });

    await waitFor(() => {
      expect(getTourismContextMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Gangnam Media Winter Festa",
          venueAddress: "Seoul Gangnam-gu Yeongdong-daero 511",
        }),
        expect.objectContaining({
          selectedCandidate: expect.objectContaining({
            id: "3439947",
            title: "Gangnam Media Winter Festa",
          }),
        }),
      );
    });
  });
});
