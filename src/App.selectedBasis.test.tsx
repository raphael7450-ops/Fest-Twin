import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sampleSpendingContext } from "./data/sampleSpending";
import { sampleTourismContext } from "./data/sampleTourApi";
import { sampleTrafficContext } from "./data/sampleTraffic";
import { sampleTrendContext } from "./data/sampleTrends";

const {
  getTourismContextMock,
  getTourApiAreaCodesMock,
  getFestivalCandidatesMock,
  getTrafficContextMock,
  getSpendingContextMock,
  getTrendContextMock,
  getDemandBackdataContextFromApiMock,
} = vi.hoisted(() => ({
  getTourismContextMock: vi.fn(),
  getTourApiAreaCodesMock: vi.fn(),
  getFestivalCandidatesMock: vi.fn(),
  getTrafficContextMock: vi.fn(),
  getSpendingContextMock: vi.fn(),
  getTrendContextMock: vi.fn(),
  getDemandBackdataContextFromApiMock: vi.fn(),
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

vi.mock("./services/demandBackdataAdapter", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./services/demandBackdataAdapter")>()),
  getDemandBackdataContextFromApi: getDemandBackdataContextFromApiMock,
}));

import { App } from "./App";

const openDashboardSection = (label: string) => {
  fireEvent.click(screen.getByRole("button", { name: `대시보드 섹션: ${label}` }));
};

describe("App selected festival basis", () => {
  beforeEach(() => {
    getTourismContextMock.mockReset();
    getTourApiAreaCodesMock.mockReset();
    getFestivalCandidatesMock.mockReset();
    getTrafficContextMock.mockReset();
    getSpendingContextMock.mockReset();
    getTrendContextMock.mockReset();
    getDemandBackdataContextFromApiMock.mockReset();
    getTourismContextMock.mockResolvedValue(sampleTourismContext);
    getTrafficContextMock.mockResolvedValue(sampleTrafficContext);
    getSpendingContextMock.mockResolvedValue(sampleSpendingContext);
    getTrendContextMock.mockResolvedValue(sampleTrendContext);
    getDemandBackdataContextFromApiMock.mockResolvedValue({
      status: "file-normalized",
      similarFestivalBaselines: [
        {
          id: "regional-benchmark-festa",
          name: "Regional Benchmark Festa",
          region: "Seoul",
          type: "culture",
          periodLabel: "2026",
          budgetMillionKrw: 4321,
          visitors: 100000,
          similarityScore: 95,
          sourceName: "Regional festival DB",
        },
      ],
      sourceDetails: [],
    });
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
      {
        id: "9990001",
        title: "Regional Benchmark Festa",
        address: "Seoul Yeongdeungpo-gu Yeouidong-ro 330",
        startDate: "2026-02-11",
        endDate: "2026-02-18",
        mapX: "126.9348123000",
        mapY: "37.5260341000",
        searchScope: "annual-region",
      },
    ]);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("shows selected TourAPI contentId after a festival candidate is selected", async () => {
    vi.useFakeTimers();
    const view = render(<App />);
    openDashboardSection("기획");

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

    openDashboardSection("근거");
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

  it("updates budget and expected capacity inputs when a selected TourAPI candidate matches DB backdata", async () => {
    vi.useFakeTimers();
    const view = render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "대시보드 섹션: 기획" }));

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    fireEvent.click(screen.getByRole("button", { name: /TourAPI/ }));
    const selectButtons = Array.from(
      view.container.querySelectorAll<HTMLButtonElement>(".candidate-card .secondary-button"),
    );
    fireEvent.click(selectButtons[1]);

    const numberInputs = screen.getAllByRole("spinbutton") as HTMLInputElement[];
    expect(numberInputs[0]).toHaveValue(4321);
    expect(numberInputs[1]).toHaveValue(20000);
  });

  it("refreshes trend, traffic, and spending contexts from the selected candidate plan", async () => {
    vi.useFakeTimers();
    const view = render(<App />);
    openDashboardSection("기획");

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    fireEvent.click(screen.getByRole("button", { name: /TourAPI/ }));
    const selectButtons = () =>
      Array.from(view.container.querySelectorAll<HTMLButtonElement>(".candidate-card .secondary-button"));

    fireEvent.click(selectButtons()[0]);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(getTourismContextMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: "Gangnam Media Winter Festa",
        venueAddress: "Seoul Gangnam-gu Yeongdong-daero 511",
        startDate: "2025-12-19",
        endDate: "2026-01-03",
      }),
      expect.objectContaining({
        selectedCandidate: expect.objectContaining({ id: "3439947" }),
      }),
    );
    expect(getTrendContextMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: "Gangnam Media Winter Festa",
        startDate: "2025-12-19",
        endDate: "2026-01-03",
      }),
      expect.any(Object),
    );
    expect(getTrafficContextMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: "Gangnam Media Winter Festa",
        venueAddress: "Seoul Gangnam-gu Yeongdong-daero 511",
        startDate: "2025-12-19",
      }),
      expect.objectContaining({ hour: 20 }),
    );
    expect(getSpendingContextMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: "Gangnam Media Winter Festa",
        region: "서울",
        startDate: "2025-12-19",
      }),
      expect.any(Object),
    );

    fireEvent.click(screen.getByRole("button", { name: /TourAPI/ }));
    fireEvent.click(selectButtons()[1]);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(getTourismContextMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: "Regional Benchmark Festa",
        venueAddress: "Seoul Yeongdeungpo-gu Yeouidong-ro 330",
        startDate: "2026-02-11",
        endDate: "2026-02-18",
      }),
      expect.objectContaining({
        selectedCandidate: expect.objectContaining({ id: "9990001" }),
      }),
    );
    expect(getTrendContextMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: "Regional Benchmark Festa",
        startDate: "2026-02-11",
        endDate: "2026-02-18",
      }),
      expect.any(Object),
    );
    expect(getTrafficContextMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: "Regional Benchmark Festa",
        venueAddress: "Seoul Yeongdeungpo-gu Yeouidong-ro 330",
        startDate: "2026-02-11",
      }),
      expect.objectContaining({ hour: 20 }),
    );
    expect(getSpendingContextMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: "Regional Benchmark Festa",
        region: "서울",
        startDate: "2026-02-11",
      }),
      expect.any(Object),
    );
  });
});
