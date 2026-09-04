import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sampleTourismContext } from "../src/data/sampleTourApi";
import { sampleTrafficContext } from "../src/data/sampleTraffic";
import { sampleSpendingContext } from "../src/data/sampleSpending";
import { sampleTrendContext } from "../src/data/sampleTrends";
import { sampleDemandBackdataContext } from "../src/data/sampleDemandBackdata";

const {
  getTourismContextMock,
  getTourApiAreaCodesMock,
  getFestivalCandidatesMock,
  getTrafficContextMock,
  getSpendingContextMock,
  getTrendContextMock,
  getDemandBackdataContextFromApiMock,
  resolveVenueCoordinatesByVWorldMock,
} = vi.hoisted(() => ({
  getTourismContextMock: vi.fn(),
  getTourApiAreaCodesMock: vi.fn(),
  getFestivalCandidatesMock: vi.fn(),
  getTrafficContextMock: vi.fn(),
  getSpendingContextMock: vi.fn(),
  getTrendContextMock: vi.fn(),
  getDemandBackdataContextFromApiMock: vi.fn(),
  resolveVenueCoordinatesByVWorldMock: vi.fn(),
}));

vi.mock("../src/services/tourApiAdapter", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/services/tourApiAdapter")>()),
  getTourismContext: getTourismContextMock,
  getTourApiAreaCodes: getTourApiAreaCodesMock,
  getFestivalCandidates: getFestivalCandidatesMock,
}));

vi.mock("../src/services/trafficAdapter", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/services/trafficAdapter")>()),
  getTrafficContext: getTrafficContextMock,
}));

vi.mock("../src/services/spendingAdapter", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/services/spendingAdapter")>()),
  getSpendingContext: getSpendingContextMock,
}));

vi.mock("../src/services/trendAdapter", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/services/trendAdapter")>()),
  getTrendContext: getTrendContextMock,
}));

vi.mock("../src/services/demandBackdataAdapter", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/services/demandBackdataAdapter")>()),
  getDemandBackdataContextFromApi: getDemandBackdataContextFromApiMock,
}));

vi.mock("../src/services/vworldAdapter", () => ({
  resolveVenueCoordinatesByVWorld: resolveVenueCoordinatesByVWorldMock,
}));

import { App } from "../src/App";

const openDashboardSection = (label: string) => {
  fireEvent.click(screen.getByRole("button", { name: `대시보드 섹션: ${label}` }));
};

const settleInitialAnalysis = async () => {
  await act(async () => Promise.resolve());
};

describe("Spatial Congestion and Density Simulation Switch Tests", () => {
  beforeEach(() => {
    getTourismContextMock.mockReset();
    getTourApiAreaCodesMock.mockReset();
    getFestivalCandidatesMock.mockReset();
    getTrafficContextMock.mockReset();
    getSpendingContextMock.mockReset();
    getTrendContextMock.mockReset();
    getDemandBackdataContextFromApiMock.mockReset();
    resolveVenueCoordinatesByVWorldMock.mockReset();

    getTourismContextMock.mockResolvedValue(sampleTourismContext);
    getTrafficContextMock.mockResolvedValue(sampleTrafficContext);
    getSpendingContextMock.mockResolvedValue(sampleSpendingContext);
    getTrendContextMock.mockResolvedValue(sampleTrendContext);
    getDemandBackdataContextFromApiMock.mockResolvedValue(sampleDemandBackdataContext);
    resolveVenueCoordinatesByVWorldMock.mockResolvedValue(null);
    getTourApiAreaCodesMock.mockResolvedValue([
      { code: "1", name: "서울" },
      { code: "6", name: "부산" },
      { code: "3", name: "대전" },
      { code: "34", name: "충남" },
    ]);
    getFestivalCandidatesMock.mockResolvedValue([
      {
        id: "candidate-boryeong",
        title: "보령 머드축제",
        address: "충남 보령시 대천해수욕장 머드광장",
        startDate: "2026-07-17",
        endDate: "2026-07-26",
        mapX: "126.5165",
        mapY: "36.3045",
        searchScope: "exact-period",
      },
    ]);
  });

  afterEach(() => {
    cleanup();
  });

  it("updates spatial congestion simulation metrics when switching to Busan Fireworks preset", async () => {
    render(<App />);
    await settleInitialAnalysis();

    // Default festival is Seoul Winter Festa (35,000 m2)
    openDashboardSection("요약");
    const heading = screen.getByRole("heading", { name: "공간 혼잡도 및 밀도 시뮬레이션" });
    const heatmapSection = heading.closest("section")!;
    expect(within(heatmapSection).getByText("35,000m²")).toBeInTheDocument();

    // Open Search Modal and select Busan Fireworks (100,000 m2)
    const searchButton = screen.getByRole("button", { name: "전국 축제 검색 및 변경" });
    fireEvent.click(searchButton);

    const searchInput = screen.getByRole("searchbox", { name: "축제 검색어 입력" });
    fireEvent.change(searchInput, { target: { value: "부산 불꽃" } });

    const selectBusanButton = screen.getByRole("button", { name: "이 축제로 기획 적용" });
    fireEvent.click(selectBusanButton);

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "전체 축제 실시간 검색" })).not.toBeInTheDocument();
      // Heatmap area should now be 100,000m2
      expect(within(heatmapSection).getByText("100,000m²")).toBeInTheDocument();
      expect(within(heatmapSection).queryByText("35,000m²")).not.toBeInTheDocument();
    });

    // Check bottleneck labels update from Gwanghwamun to Gwangalli
    const bottleneckText = within(heatmapSection).queryAllByText(/광안/);
    expect(bottleneckText.length).toBeGreaterThan(0);
  });

  it("updates spatial congestion simulation when selecting a TourAPI candidate", async () => {
    render(<App />);
    await settleInitialAnalysis();

    openDashboardSection("기획");
    const openCandidatesBtn = screen.getByRole("button", { name: /TourAPI/ });
    fireEvent.click(openCandidatesBtn);

    await waitFor(() => {
      expect(screen.getByText("보령 머드축제")).toBeInTheDocument();
    });

    const selectCandidateBtn = screen.getByRole("button", { name: "이 축제 선택" });
    fireEvent.click(selectCandidateBtn);

    openDashboardSection("요약");
    const heading = screen.getByRole("heading", { name: "공간 혼잡도 및 밀도 시뮬레이션" });
    const heatmapSection = heading.closest("section")!;
    await waitFor(() => {
      // Gwanghwamun facilities should no longer be present
      expect(within(heatmapSection).queryByText(/광화문/)).not.toBeInTheDocument();
    });
  });

  it("updates spatial congestion simulation when selecting a DB record from search modal", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/regional-festivals")) {
        return {
          ok: true,
          json: async () => ({
            records: [
              {
                id: "db-seoul-lotus",
                name: "서울연등축제",
                region: "서울",
                localGovernment: "종로구",
                venue: "조계사 및 우정국로",
                startDate: "2026-10-12",
                endDate: "2026-10-14",
                budgetMillionKrw: 800,
                visitors: 120000,
                sourceName: "문화체육관광부_지역축제 정보",
              },
            ],
          }),
        } as Response;
      }
      return { ok: false } as Response;
    });

    render(<App />);
    await settleInitialAnalysis();

    openDashboardSection("요약");
    const heading = screen.getByRole("heading", { name: "공간 혼잡도 및 밀도 시뮬레이션" });
    const heatmapSection = heading.closest("section")!;
    expect(within(heatmapSection).getByText("35,000m²")).toBeInTheDocument();

    const searchButton = screen.getByRole("button", { name: "전국 축제 검색 및 변경" });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText("서울연등축제")).toBeInTheDocument();
    });

    const mosiCard = screen.getByText("서울연등축제").closest("article")!;
    const selectMosiBtn = within(mosiCard).getByRole("button", { name: "이 축제로 기획 적용" });
    fireEvent.click(selectMosiBtn);

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "전체 축제 실시간 검색" })).not.toBeInTheDocument();
      // Should show estimated 50,000m² (based on 120,000 visitors)
      expect(within(heatmapSection).getByText("50,000m²")).toBeInTheDocument();
      expect(within(heatmapSection).queryByText("35,000m²")).not.toBeInTheDocument();
    });
  });
});

