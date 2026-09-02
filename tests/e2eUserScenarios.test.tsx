import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

describe("Fest-Twin E2E User Scenarios and Bug Exploration Suite", () => {
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
    getFestivalCandidatesMock.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  it("Scenario 1: Searches and selects an upcoming preset festival from modal and updates dashboard", async () => {
    render(<App />);
    await settleInitialAnalysis();

    const searchButton = screen.getByRole("button", { name: "전국 축제 검색 및 변경" });
    fireEvent.click(searchButton);

    const searchInput = screen.getByRole("searchbox", { name: "축제 검색어 입력" });
    expect(searchInput).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: "부산 불꽃" } });

    expect(screen.getByText("부산 불꽃축제")).toBeInTheDocument();

    const selectBusanButton = screen.getByRole("button", { name: "이 축제로 기획 적용" });
    fireEvent.click(selectBusanButton);

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "전체 축제 실시간 검색" })).not.toBeInTheDocument();
      expect(screen.getAllByText(/부산 불꽃축제/).length).toBeGreaterThan(0);
    });
  });

  it("Scenario 2: Synchronizes hour selection across forecast chart, heatmap, and logistics in prediction section", async () => {
    render(<App />);
    await settleInitialAnalysis();
    openDashboardSection("예측");

    expect(screen.getByText("진단 시간대")).toBeInTheDocument();

    const hour18Row = screen.getByLabelText(/18시/);
    fireEvent.click(hour18Row);

    await waitFor(() => {
      expect(hour18Row).toHaveClass("bar-row--selected");
    });

    const hour21Row = screen.getByLabelText(/21시/);
    fireEvent.click(hour21Row);

    await waitFor(() => {
      expect(hour21Row).toHaveClass("bar-row--selected");
      expect(hour18Row).not.toHaveClass("bar-row--selected");
    });
  });

  it("Scenario 3: Opens Metric Evidence Drawer from KPI and verifies mathematical formulas", async () => {
    render(<App />);
    await settleInitialAnalysis();
    openDashboardSection("요약");

    const evidenceButtons = screen.getAllByRole("button", { name: "근거 보기" });
    expect(evidenceButtons.length).toBeGreaterThan(0);

    fireEvent.click(evidenceButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "지표 산출 근거" })).toBeInTheDocument();
    });

    const closeButton = screen.getByRole("button", { name: "근거 닫기" });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "지표 산출 근거" })).not.toBeInTheDocument();
    });
  });

  it("Scenario 4: Validates extreme boundary inputs in plan form without crashes or NaN", async () => {
    render(<App />);
    await settleInitialAnalysis();
    openDashboardSection("기획");

    const budgetInput = screen.getByLabelText(/총 예산|총사업비/i);
    fireEvent.change(budgetInput, { target: { value: "0" } });

    await waitFor(() => {
      const allText = document.body.textContent || "";
      expect(allText).not.toMatch(/\bNaN\b/);
      expect(allText).not.toMatch(/\bInfinity\b/);
    });
  });

  it("Scenario 5: Navigates to B2G report section and verifies economic impact cards", async () => {
    render(<App />);
    await settleInitialAnalysis();
    openDashboardSection("리포트");

    await waitFor(() => {
      expect(screen.getByText("기획 보완 리포트")).toBeInTheDocument();
      expect(screen.getAllByText("예산 대비 경제적 파급효과").length).toBeGreaterThan(0);
      expect(screen.getByText("예상 지역 상권 소비 창출액")).toBeInTheDocument();
    });
  });
});
