import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sampleTourismContext } from "./data/sampleTourApi";
import { sampleTrafficContext } from "./data/sampleTraffic";
import { sampleSpendingContext } from "./data/sampleSpending";
import { sampleTrendContext } from "./data/sampleTrends";
import { sampleDemandBackdataContext } from "./data/sampleDemandBackdata";

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

vi.mock("./services/vworldAdapter", () => ({
  resolveVenueCoordinatesByVWorld: resolveVenueCoordinatesByVWorldMock,
}));

import { App } from "./App";

const openDashboardSection = (label: string) => {
  fireEvent.click(screen.getByRole("button", { name: `대시보드 섹션: ${label}` }));
};

const settleInitialAnalysis = async () => {
  await act(async () => Promise.resolve());
};

describe("App", () => {
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
      { code: "1-legacy", name: "서울시" },
      { code: "1-full", name: "서울특별시" },
      { code: "6", name: "부산" },
      { code: "3", name: "대전" },
    ]);
    getFestivalCandidatesMock.mockResolvedValue([
      {
        id: "seoul-fireworks-2026",
        title: "2026 서울세계불꽃축제",
        address: "서울특별시 영등포구 여의도 한강공원",
        startDate: "2026-09-04",
        endDate: "2026-09-05",
        mapX: "126.9347",
        mapY: "37.5283",
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

  it("renders the government-guided Fest-Twin MVP dashboard", async () => {
    render(<App />);
    await settleInitialAnalysis();

    expect(screen.getByText("페스트트윈(Fest-Twin)")).toBeInTheDocument();
    expect(screen.getByText("공공 검토 대시보드")).toBeInTheDocument();
    expect(screen.getByText("실데이터 우선")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "대시보드 섹션: 기획" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("먼저 지역과 기간을 선택해 축제를 불러오세요.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "대시보드 섹션: 기획" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "대시보드 섹션: 예측" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "대시보드 섹션: 현장" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "대시보드 섹션: 근거" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "대시보드 섹션: 리포트" })).toBeInTheDocument();
    expect(screen.getAllByText("흥행 가능성 점수").length).toBeGreaterThan(0);
    expect(screen.getAllByText("최고 밀집 위험도").length).toBeGreaterThan(0);
    expect(screen.getByText("예산 효율성 점수")).toBeInTheDocument();
    expect(screen.getByText("지역 상권 유출 연계도")).toBeInTheDocument();
    openDashboardSection("요약");
    expect(screen.getByRole("button", { name: "대시보드 섹션: 요약" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("핵심 진단 지표")).toBeInTheDocument();
    expect(screen.queryByText("정부 지침 반영 현황")).not.toBeInTheDocument();
    expect(screen.queryByText("제출 데모 검증 현황")).not.toBeInTheDocument();
    expect(screen.getByText(/시간대별 수요/)).toBeInTheDocument();
    expect(screen.getByText("실제 행사장 지도")).toBeInTheDocument();
    expect(screen.getAllByText("서울특별시 종로구 세종대로 172 광화문광장 및 청계광장 일원").length).toBeGreaterThan(0);
    expect(screen.getByText("안전 및 물류 수용성")).toBeInTheDocument();
    expect(screen.getAllByText("안전관리 요원 추천 배치").length).toBeGreaterThan(0);
    expect(screen.getAllByText("의료/구급 인력 추천 배치").length).toBeGreaterThan(0);
    expect(screen.getByText("주차 수용 차오름 비율")).toBeInTheDocument();

    openDashboardSection("기획");
    expect(screen.getByRole("button", { name: "대시보드 섹션: 기획" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByDisplayValue("2026 서울 윈터페스타 & 빛초롱축제")).toBeInTheDocument();
    expect(screen.getByText("축제 기획안 입력")).toBeInTheDocument();
    expect(screen.getByText("지역 우선 조회")).toBeInTheDocument();
    expect(screen.getByText("TourAPI 지역 기반 후보 조회")).toBeInTheDocument();
    expect(screen.getByLabelText("개최 지역")).toBeInTheDocument();
    expect(screen.getByLabelText("시작일")).toBeInTheDocument();
    expect(screen.getByLabelText("종료일")).toBeInTheDocument();
    expect(screen.getByText("TourAPI 후보 보기")).toBeInTheDocument();
    expect(screen.getByText("실제 행사장 지도")).toBeInTheDocument();
    expect(screen.getAllByText("서울특별시 종로구 세종대로 172 광화문광장 및 청계광장 일원").length).toBeGreaterThan(0);
    expect(screen.queryByText("진단 시간대")).not.toBeInTheDocument();

    openDashboardSection("예측");
    expect(screen.getByText("진단 시간대")).toBeInTheDocument();
    expect(screen.getByText(/시간대별 수요/)).toBeInTheDocument();
    expect(screen.getByText(/혼잡도.*시뮬레이션/)).toBeInTheDocument();

    openDashboardSection("현장");
    expect(screen.queryByText("진단 시간대")).not.toBeInTheDocument();
    expect(screen.getByText("안전 및 물류 수용성")).toBeInTheDocument();
    expect(screen.getByText("주요 리스크")).toBeInTheDocument();

    openDashboardSection("근거");
    expect(screen.getByText("데이터 신뢰도")).toBeInTheDocument();
    expect(await screen.findByText("샘플 데이터 대체 사용")).toBeInTheDocument();

    openDashboardSection("리포트");
    expect(screen.getByText("기획 보완 리포트")).toBeInTheDocument();
    expect(screen.getAllByText("예산 대비 경제적 파급효과").length).toBeGreaterThan(0);
    expect(screen.getAllByText("총 투입 예산").length).toBeGreaterThan(0);
    expect(screen.getByText("예상 지역 상권 소비 창출액")).toBeInTheDocument();
    expect(screen.getByText(/지역 관광 소비 강도 기반/)).toBeInTheDocument();
    expect(screen.getAllByText(/58,400원/).length).toBeGreaterThan(0);
  });

  it("opens TourAPI festival candidates in a right-side selection panel", async () => {
    vi.useFakeTimers();

    try {
      render(<App />);
      await settleInitialAnalysis();
      openDashboardSection("기획");

      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      fireEvent.click(screen.getByRole("button", { name: "TourAPI 후보 보기" }));

      expect(screen.getByRole("dialog", { name: "TourAPI 축제 후보" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "이 축제 선택" })).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "이 축제 선택" }));

      expect(screen.queryByRole("dialog", { name: "TourAPI 축제 후보" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "대시보드 섹션: 기획" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getAllByText(/2026 서울세계불꽃축제/).length).toBeGreaterThan(0);
      expect(screen.getByText("행사장 면적을 확인한 뒤 요약으로 이동하세요.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "요약으로 이동" })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows refreshed Daejeon candidates after the planning region and dates change", async () => {
    vi.useFakeTimers();
    getFestivalCandidatesMock.mockImplementation(async (plan) =>
      plan.region === "대전" &&
      plan.startDate === "2026-09-04" &&
      plan.endDate === "2026-09-30"
        ? [
            {
              id: "mcst-daejeon-night-heritage-2026",
              title: "대전 중구 국가유산 야행",
              address: "대전 중구 원도심 일원",
              startDate: "2026-09-04",
              endDate: "2026-09-06",
              searchScope: "regional-supplement",
            },
          ]
        : [],
    );

    try {
      render(<App />);
      await settleInitialAnalysis();
      openDashboardSection("기획");

      fireEvent.change(screen.getByLabelText("개최 지역"), { target: { value: "대전" } });
      fireEvent.change(screen.getByLabelText("시작일"), { target: { value: "2026-09-04" } });
      fireEvent.change(screen.getByLabelText("종료일"), { target: { value: "2026-09-30" } });

      await act(async () => {
        vi.advanceTimersByTime(300);
        await Promise.resolve();
      });

      expect(screen.getByText("TourAPI 후보 1건")).toBeInTheDocument();
      expect(screen.getByText("선택된 후보 없음")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "TourAPI 후보 보기" }));

      expect(screen.getByRole("dialog", { name: "TourAPI 축제 후보" })).toBeInTheDocument();
      expect(screen.getByText("대전 중구 국가유산 야행")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("uses VWorld coordinates for a selected regional DB candidate without TourAPI coordinates", async () => {
    getFestivalCandidatesMock.mockResolvedValue([
      {
        id: "mcst-daejeon-market-2026",
        title: "제4회 중앙시장 주말축제 야시장 동구夜놀자",
        address: "대전 동구 중앙시장 화월통 일원",
        startDate: "2026-08-07",
        endDate: "2026-10-31",
        searchScope: "regional-supplement",
      },
    ]);
    resolveVenueCoordinatesByVWorldMock.mockResolvedValue({
      title: "대전 중앙시장",
      address: "대전광역시 동구 대전로779번길 8",
      mapX: "127.43286719691503",
      mapY: "36.32957497803072",
    });

    render(<App />);
    await settleInitialAnalysis();
    openDashboardSection("기획");

    fireEvent.change(screen.getByLabelText("개최 지역"), { target: { value: "대전" } });

    await waitFor(() => {
      expect(screen.getByText("TourAPI 후보 1건")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "TourAPI 후보 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "이 축제 선택" }));

    await waitFor(() => {
      expect(resolveVenueCoordinatesByVWorldMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "제4회 중앙시장 주말축제 야시장 동구夜놀자",
          address: "대전 동구 중앙시장 화월통 일원",
          region: "대전",
        }),
      );
      expect(screen.getByText(/좌표 기준: 127.43286719691503, 36.32957497803072/)).toBeInTheDocument();
    });
  });

  it("shows an applying status while a selected candidate is being enriched", async () => {
    let resolveCoordinates: (value: {
      title: string;
      address: string;
      mapX: string;
      mapY: string;
    }) => void = () => {};
    const coordinatePromise = new Promise<{
      title: string;
      address: string;
      mapX: string;
      mapY: string;
    }>((resolve) => {
      resolveCoordinates = resolve;
    });
    getFestivalCandidatesMock.mockResolvedValue([
      {
        id: "mcst-daejeon-market-2026",
        title: "제4회 중앙시장 주말축제 야시장 동구夜놀자",
        address: "대전 동구 중앙시장 화월통 일원",
        startDate: "2026-08-07",
        endDate: "2026-10-31",
        searchScope: "regional-supplement",
      },
    ]);
    resolveVenueCoordinatesByVWorldMock.mockReturnValue(coordinatePromise);

    render(<App />);
    await settleInitialAnalysis();
    openDashboardSection("기획");

    fireEvent.change(screen.getByLabelText("개최 지역"), { target: { value: "대전" } });

    await waitFor(() => {
      expect(screen.getByText("TourAPI 후보 1건")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "TourAPI 후보 보기" }));
    fireEvent.click(screen.getByRole("button", { name: "이 축제 선택" }));

    expect(document.querySelector(".analysis-refresh-status")).toHaveTextContent(
      "선택한 축제 데이터를 반영 중입니다.",
    );
    expect(screen.getByRole("button", { name: "적용 중" })).toBeDisabled();

    resolveCoordinates({
      title: "대전 중앙시장",
      address: "대전광역시 동구 대전로779번길 8",
      mapX: "127.43286719691503",
      mapY: "36.32957497803072",
    });

    await waitFor(() => {
      expect(screen.queryByText("선택한 축제 데이터를 반영 중입니다.")).not.toBeInTheDocument();
    });
  });

  it("keeps the region selector usable while live area codes are still loading", async () => {
    getTourApiAreaCodesMock.mockReturnValue(new Promise(() => {}));

    render(<App />);
    await settleInitialAnalysis();
    openDashboardSection("기획");

    const regionSelect = screen.getByLabelText("개최 지역");
    expect(regionSelect.tagName).toBe("SELECT");
    expect(within(regionSelect).getByRole("option", { name: "부산" })).toBeInTheDocument();
  });

  it("does not request candidates or show a failure state while dates are incomplete", async () => {
    vi.useFakeTimers();

    try {
      render(<App />);
      await settleInitialAnalysis();
      openDashboardSection("기획");

      await act(async () => {
        vi.advanceTimersByTime(300);
        await Promise.resolve();
      });
      expect(getFestivalCandidatesMock).toHaveBeenCalled();
      getFestivalCandidatesMock.mockClear();
      getTourismContextMock.mockClear();
      getTrafficContextMock.mockClear();
      getSpendingContextMock.mockClear();
      getTrendContextMock.mockClear();

      fireEvent.change(screen.getByLabelText("종료일"), {
        target: { value: "0020-01-03" },
      });

      await act(async () => {
        vi.advanceTimersByTime(300);
        await Promise.resolve();
      });

      expect(getFestivalCandidatesMock).not.toHaveBeenCalled();
      expect(getTourismContextMock).not.toHaveBeenCalled();
      expect(getTrafficContextMock).not.toHaveBeenCalled();
      expect(getSpendingContextMock).not.toHaveBeenCalled();
      expect(getTrendContextMock).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: "TourAPI 후보 보기" }));

      expect(screen.getByRole("dialog", { name: "TourAPI 축제 후보" })).toBeInTheDocument();
      expect(screen.queryByText("후보 조회에 실패했습니다.")).not.toBeInTheDocument();
      expect(screen.getByText("해당 조건의 후보가 없습니다.")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps candidate lookup non-blocking when TourAPI candidate loading fails", async () => {
    vi.useFakeTimers();
    getFestivalCandidatesMock.mockRejectedValue(new Error("rate limited"));

    try {
      render(<App />);
      await settleInitialAnalysis();
      openDashboardSection("기획");

      await act(async () => {
        vi.advanceTimersByTime(300);
        await Promise.resolve();
      });

      expect(getFestivalCandidatesMock).toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: "TourAPI 후보 보기" }));

      expect(screen.getByRole("dialog", { name: "TourAPI 축제 후보" })).toBeInTheDocument();
      expect(screen.queryByText("후보 조회에 실패했습니다.")).not.toBeInTheDocument();
      expect(screen.getByText("해당 조건의 후보가 없습니다.")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("opens a metric evidence drawer from the dashboard", async () => {
    render(<App />);
    await settleInitialAnalysis();

    fireEvent.click(screen.getAllByRole("button", { name: "근거 보기" })[0]);

    expect(screen.getByRole("dialog", { name: "지표 산출 근거" })).toBeInTheDocument();
    expect(screen.getByText("사용 데이터")).toBeInTheDocument();
    expect(screen.getByText("산출 방식")).toBeInTheDocument();
    expect(screen.getByText("해석 시 주의사항")).toBeInTheDocument();
    expect(screen.getAllByText("문화체육관광부_지역축제 정보").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "근거 닫기" }));

    expect(screen.queryByRole("dialog", { name: "지표 산출 근거" })).not.toBeInTheDocument();
  });

  it("shows KTDB access traffic risk in the safety logistics panel and evidence drawer", async () => {
    render(<App />);
    await settleInitialAnalysis();
    openDashboardSection("현장");

    expect(await screen.findByText("접근 교통 위험도")).toBeInTheDocument();

    const safetyPanel = screen.getByText("안전 및 물류 수용성").closest("section")!;
    const evidenceButtons = within(safetyPanel).getAllByRole("button", { name: "근거 보기" });
    await userEvent.click(evidenceButtons[2]);

    expect(await screen.findByText("사용 데이터 상세")).toBeInTheDocument();
    expect(screen.getAllByText(/KTDB\/View-T/).length).toBeGreaterThan(0);
    expect(screen.getByText(/LINKID/)).toBeInTheDocument();
  });

  it("shows exact source detail records in the evidence drawer", async () => {
    getTourismContextMock.mockResolvedValue({
      ...sampleTourismContext,
      sourceDetails: [
        ...(sampleTourismContext.sourceDetails ?? []),
        {
          sourceId: "six-used-records",
          sourceName: "계산 사용 레코드",
          sourceType: "sample",
          statusLabel: "샘플 계산 입력",
          records: Array.from({ length: 6 }, (_, index) => ({
            label: `근거 레코드 ${index + 1}`,
            fields: [{ label: "값", value: String(index + 1) }],
          })),
        },
      ],
    });
    render(<App />);
    await settleInitialAnalysis();

    await waitFor(() => expect(getTourismContextMock).toHaveBeenCalled());

    await userEvent.click(screen.getAllByRole("button", { name: /근거 보기/ })[0]);

    const drawer = await screen.findByRole("dialog", { name: "지표 산출 근거" });

    expect(within(drawer).getByText("사용 데이터 상세")).toBeInTheDocument();
    expect(within(drawer).getByText("샘플 주변 관광지", { selector: "strong" })).toBeInTheDocument();
    expect(within(drawer).getAllByText("매력도 점수", { selector: "dt" }).length).toBeGreaterThan(0);
    expect(within(drawer).getByText(/사용자 입력 기준/)).toBeInTheDocument();
    expect(within(drawer).getByText(/시스템 산출값/)).toBeInTheDocument();
    expect(await within(drawer).findByText("근거 레코드 6")).toBeInTheDocument();
  });

  it("redacts contaminated source detail values in the evidence drawer", async () => {
    getTourismContextMock.mockResolvedValue({
      ...sampleTourismContext,
      sourceDetails: [
        {
          sourceId: "contaminated-source",
          sourceName: "serviceKey drawer-source-name-secret",
          sourceType: "tourapi",
          statusLabel: "clientSecret drawer-status-secret",
          retrievedAt: "Authorization drawer-retrieved-secret",
          endpoint: "https://data.example.test/events?Cookie=drawer-endpoint-secret",
          query: [
            { label: "Authorization drawer-query-label-secret", value: "drawer-query-secret" },
            { label: "Relative URL", value: "/events?clientSecret=drawer-relative-secret" },
          ],
          records: [
            {
              label: "serviceKey drawer-record-label-secret",
              fields: [
                { label: "Cookie drawer-field-label-secret", value: "drawer-record-secret" },
              ],
            },
          ],
          calculationInputs: [
            {
              label: "Authorization drawer-calculation-label-secret",
              value: "drawer-calculation-secret",
            },
          ],
          note: "Cookie drawer-note-secret",
        },
      ],
    });

    render(<App />);
    await settleInitialAnalysis();
    await waitFor(() => expect(getTourismContextMock).toHaveBeenCalled());

    fireEvent.click(screen.getAllByRole("button", { name: "근거 보기" })[0]);

    const drawer = await screen.findByRole("dialog", { name: "지표 산출 근거" });
    expect(within(drawer).queryByText(/drawer-[a-z-]+-secret/)).not.toBeInTheDocument();
    expect(within(drawer).getAllByText("[비공개]").length).toBeGreaterThanOrEqual(12);
  });

  it("restores selected TourAPI festival basis from a shared scenario link", async () => {
    window.history.pushState({}, "", "/?share_token=token_selected_festival");
    const selectedFestivalBasis = {
      contentId: "seoul-fireworks-2026",
      title: "2026 서울세계불꽃축제",
      address: "서울특별시 영등포구 여의도 한강공원",
      startDate: "2026-09-04",
      endDate: "2026-09-05",
      mapX: "126.9347",
      mapY: "37.5283",
      sourceName: "TourAPI selected festival candidate",
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/scenarios/share/token_selected_festival")) {
        return {
          ok: true,
          json: async () => ({
            parameters: {
              plan: {
                name: "2026 서울세계불꽃축제",
                region: "서울",
                venueAddress: "서울특별시 영등포구 여의도 한강공원",
                startDate: "2026-09-04",
                endDate: "2026-09-05",
              },
              selectedHour: 20,
              selectedFestivalBasis,
            },
          }),
        } as Response;
      }

      return {
        ok: false,
        json: async () => ({}),
      } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    await settleInitialAnalysis();
    openDashboardSection("근거");

    expect((await screen.findAllByText("선택 TourAPI 축제 기준")).length).toBeGreaterThan(0);
  });

  it("refreshes all analysis inputs atomically and aborts superseded requests", async () => {
    getTourismContextMock.mockResolvedValue({
      ...sampleTourismContext,
      provenance: {
        ...sampleTourismContext.provenance,
        sourceName: "한국관광공사 TourAPI",
        sourceStatus: "live",
      },
    });

    const view = render(<App />);
    await settleInitialAnalysis();
    openDashboardSection("기획");

    expect(getTourismContextMock).toHaveBeenCalledTimes(1);
    const initialSignal = getTourismContextMock.mock.calls[0][1].signal as AbortSignal;

    fireEvent.change(view.getByLabelText("총 예산(백만원)"), {
      target: { value: "1200" },
    });
    await act(async () => Promise.resolve());

    expect(initialSignal.aborted).toBe(true);
    expect(getTourismContextMock).toHaveBeenCalledTimes(2);
    const budgetSignal = getTourismContextMock.mock.calls[1][1].signal as AbortSignal;

    fireEvent.change(view.getByLabelText("개최 지역"), {
      target: { value: "서울시" },
    });
    fireEvent.change(view.getByLabelText("개최 지역"), {
      target: { value: "서울특별시" },
    });
    await act(async () => Promise.resolve());

    expect(budgetSignal.aborted).toBe(true);
    expect(getTourismContextMock).toHaveBeenCalledTimes(4);
    expect(getTourismContextMock.mock.calls[3][0].region).toBe("서울특별시");
  });

  it("retains prior live TourAPI evidence while a changed region is loading", async () => {
    let resolveChangedRegion: ((value: typeof sampleTourismContext) => void) | undefined;
    const liveTourismContext = {
      ...sampleTourismContext,
      provenance: {
        ...sampleTourismContext.provenance,
        sourceName: "한국관광공사 TourAPI",
        sourceStatus: "live" as const,
      },
    };

    getTourismContextMock
      .mockResolvedValueOnce(liveTourismContext)
      .mockImplementationOnce(
        () =>
          new Promise<typeof sampleTourismContext>((resolve) => {
            resolveChangedRegion = resolve;
          }),
      );

    const view = render(<App />);
    await settleInitialAnalysis();
    openDashboardSection("근거");
    expect(screen.getAllByText("실제 TourAPI 조회 성공").length).toBeGreaterThan(0);
    openDashboardSection("기획");

    fireEvent.change(view.getByLabelText("개최 지역"), {
      target: { value: "부산광역시" },
    });
    await act(async () => Promise.resolve());

    openDashboardSection("근거");
    expect(screen.getAllByText("실제 TourAPI 조회 성공").length).toBeGreaterThan(0);
    expect(view.container.querySelector(".analysis-refresh-status")).toBeInTheDocument();

    await act(async () => {
      resolveChangedRegion?.(liveTourismContext);
      await Promise.resolve();
    });
  });
});
