import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sampleTourismContext } from "./data/sampleTourApi";
import { sampleTrafficContext } from "./data/sampleTraffic";
import { sampleSpendingContext } from "./data/sampleSpending";

const {
  getTourismContextMock,
  getTourApiAreaCodesMock,
  getFestivalCandidatesMock,
  getTrafficContextMock,
  getSpendingContextMock,
} = vi.hoisted(() => ({
  getTourismContextMock: vi.fn(),
  getTourApiAreaCodesMock: vi.fn(),
  getFestivalCandidatesMock: vi.fn(),
  getTrafficContextMock: vi.fn(),
  getSpendingContextMock: vi.fn(),
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

import { App } from "./App";

describe("App", () => {
  beforeEach(() => {
    getTourismContextMock.mockReset();
    getTourApiAreaCodesMock.mockReset();
    getFestivalCandidatesMock.mockReset();
    getTrafficContextMock.mockReset();
    getSpendingContextMock.mockReset();
    getTourismContextMock.mockResolvedValue(sampleTourismContext);
    getTrafficContextMock.mockResolvedValue(sampleTrafficContext);
    getSpendingContextMock.mockResolvedValue(sampleSpendingContext);
    getTourApiAreaCodesMock.mockResolvedValue([
      { code: "1", name: "서울" },
      { code: "1-legacy", name: "서울시" },
      { code: "1-full", name: "서울특별시" },
      { code: "6", name: "부산" },
    ]);
    getFestivalCandidatesMock.mockResolvedValue([
      {
        id: "3439947",
        title: "강남 미디어 윈터페스타",
        address: "서울특별시 강남구 영동대로 511",
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
  });

  it("renders the government-guided Fest-Twin MVP dashboard", async () => {
    render(<App />);

    expect(screen.getByText("페스트트윈(Fest-Twin)")).toBeInTheDocument();
    expect(screen.getByText("공공 검토 대시보드")).toBeInTheDocument();
    expect(screen.getByText("실데이터 우선")).toBeInTheDocument();
    expect(screen.getAllByText("흥행 예측 지수").length).toBeGreaterThan(0);
    expect(screen.getAllByText("최고 밀집 위험도").length).toBeGreaterThan(0);
    expect(screen.getByText("예산 효율성 점수")).toBeInTheDocument();
    expect(screen.getByText("지역 상권 유출 연계도")).toBeInTheDocument();
    expect(screen.getByLabelText("핵심 진단 지표")).toBeInTheDocument();
    expect(screen.getByDisplayValue("강남 미디어 윈터페스타")).toBeInTheDocument();
    expect(screen.queryByText("정부 지침 반영 현황")).not.toBeInTheDocument();
    expect(screen.queryByText("제출 데모 검증 현황")).not.toBeInTheDocument();
    expect(screen.getByText("축제 기획안 입력")).toBeInTheDocument();
    expect(screen.getByText("지역 우선 조회")).toBeInTheDocument();
    expect(screen.getByText("TourAPI 지역 기반 후보 조회")).toBeInTheDocument();
    expect(screen.getByLabelText("개최 지역")).toBeInTheDocument();
    expect(screen.getByLabelText("시작일")).toBeInTheDocument();
    expect(screen.getByLabelText("종료일")).toBeInTheDocument();
    expect(screen.getByText("TourAPI 후보 보기")).toBeInTheDocument();
    expect(screen.getByText("데이터 근거")).toBeInTheDocument();
    expect((await screen.findAllByText("샘플 보완")).length).toBeGreaterThan(0);
    expect(screen.getByText("시간대별 수요 예측")).toBeInTheDocument();
    expect(screen.getByText("실제 행사장 지도")).toBeInTheDocument();
    expect(screen.getByText("서울특별시 강남구 영동대로 511 (삼성동)")).toBeInTheDocument();
    expect(screen.getByText("혼잡도 시뮬레이션")).toBeInTheDocument();
    expect(screen.getByText("안전 및 물류 수용성")).toBeInTheDocument();
    expect(screen.getAllByText("안전관리 요원 추천 배치").length).toBeGreaterThan(0);
    expect(screen.getAllByText("의료/구급 인력 추천 배치").length).toBeGreaterThan(0);
    expect(screen.getByText("주차 수용 차오름 비율")).toBeInTheDocument();
    expect(screen.getAllByText("예산 대비 경제적 파급효과").length).toBeGreaterThan(0);
    expect(screen.getAllByText("총 투입 예산").length).toBeGreaterThan(0);
    expect(screen.getByText("예상 지역 상권 소비 창출액")).toBeInTheDocument();
    expect(screen.getByText(/지역 관광 소비 강도 기반/)).toBeInTheDocument();
    expect(screen.getAllByText(/58,400원/).length).toBeGreaterThan(0);
    expect(screen.getByText("공공검토 보고서")).toBeInTheDocument();
  });

  it("opens TourAPI festival candidates in a right-side selection panel", async () => {
    vi.useFakeTimers();

    try {
      render(<App />);

      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      fireEvent.click(screen.getByRole("button", { name: "TourAPI 후보 보기" }));

      expect(screen.getByRole("dialog", { name: "TourAPI 축제 후보" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "이 축제 선택" })).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "이 축제 선택" }));

      expect(screen.queryByRole("dialog", { name: "TourAPI 축제 후보" })).not.toBeInTheDocument();
      expect(screen.getByDisplayValue("강남 미디어 윈터페스타")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("opens a metric evidence drawer from the dashboard", () => {
    render(<App />);

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

    expect(await screen.findByText("접근 교통 위험도")).toBeInTheDocument();

    const safetyPanel = screen.getByText("안전 및 물류 수용성").closest("section")!;
    const evidenceButtons = within(safetyPanel).getAllByRole("button", { name: "근거 보기" });
    await userEvent.click(evidenceButtons[2]);

    expect(await screen.findByRole("heading", { name: "접근 교통 위험도" })).toBeInTheDocument();
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

    await screen.findByText(/축제 기획안 입력/);

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
    await waitFor(() => expect(getTourismContextMock).toHaveBeenCalled());

    fireEvent.click(screen.getAllByRole("button", { name: "근거 보기" })[0]);

    const drawer = await screen.findByRole("dialog", { name: "지표 산출 근거" });
    expect(within(drawer).queryByText(/drawer-[a-z-]+-secret/)).not.toBeInTheDocument();
    expect(within(drawer).getAllByText("[비공개]").length).toBeGreaterThanOrEqual(12);
  });

  it("debounces TourAPI-relevant changes, cancels stale loads, and ignores budget changes", async () => {
    vi.useFakeTimers();
    getTourismContextMock.mockResolvedValue({
      ...sampleTourismContext,
      provenance: {
        ...sampleTourismContext.provenance,
        sourceName: "한국관광공사 TourAPI",
        sourceStatus: "live",
      },
    });

    try {
      const view = render(<App />);

      expect(getTourismContextMock).not.toHaveBeenCalled();
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      expect(screen.getAllByText("실데이터").length).toBeGreaterThan(0);
      expect(getTourismContextMock).toHaveBeenCalledTimes(1);
      const initialSignal = getTourismContextMock.mock.calls[0][1].signal as AbortSignal;

      fireEvent.change(view.getByLabelText("총 예산(백만원)"), {
        target: { value: "1200" },
      });
      await act(async () => {
        vi.advanceTimersByTime(500);
      });
      expect(getTourismContextMock).toHaveBeenCalledTimes(1);

      fireEvent.change(view.getByLabelText("개최 지역"), {
        target: { value: "서울시" },
      });
      fireEvent.change(view.getByLabelText("개최 지역"), {
        target: { value: "서울특별시" },
      });

      expect(initialSignal.aborted).toBe(true);
      await act(async () => {
        vi.advanceTimersByTime(299);
      });
      expect(getTourismContextMock).toHaveBeenCalledTimes(1);
      await act(async () => {
        vi.advanceTimersByTime(1);
      });

      expect(getTourismContextMock).toHaveBeenCalledTimes(2);
      expect(getTourismContextMock.mock.calls[1][0].region).toBe("서울특별시");
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not show prior live TourAPI evidence while a changed region is loading", async () => {
    vi.useFakeTimers();
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

    try {
      const view = render(<App />);
      await act(async () => {
        vi.advanceTimersByTime(300);
      });
      expect(screen.getAllByText("실데이터").length).toBeGreaterThan(0);

      fireEvent.change(view.getByLabelText("개최 지역"), {
        target: { value: "부산광역시" },
      });

      expect(screen.queryByText("실데이터")).not.toBeInTheDocument();
      expect(screen.getAllByText("샘플 보완").length).toBeGreaterThan(0);

      await act(async () => {
        vi.advanceTimersByTime(300);
      });
      resolveChangedRegion?.(liveTourismContext);
    } finally {
      vi.useRealTimers();
    }
  });
});
