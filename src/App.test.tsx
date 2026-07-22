import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sampleTourismContext } from "./data/sampleTourApi";

const { getTourismContextMock, getTourApiAreaCodesMock, getFestivalCandidatesMock } = vi.hoisted(() => ({
  getTourismContextMock: vi.fn(),
  getTourApiAreaCodesMock: vi.fn(),
  getFestivalCandidatesMock: vi.fn(),
}));

vi.mock("./services/tourApiAdapter", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./services/tourApiAdapter")>()),
  getTourismContext: getTourismContextMock,
  getTourApiAreaCodes: getTourApiAreaCodesMock,
  getFestivalCandidates: getFestivalCandidatesMock,
}));

import { App } from "./App";

describe("App", () => {
  beforeEach(() => {
    getTourismContextMock.mockReset();
    getTourApiAreaCodesMock.mockReset();
    getFestivalCandidatesMock.mockReset();
    getTourismContextMock.mockResolvedValue(sampleTourismContext);
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
    expect(screen.getByText("흥행 예측 지수")).toBeInTheDocument();
    expect(screen.getByText("최고 밀집 위험도")).toBeInTheDocument();
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
    expect(await screen.findByText("샘플 데이터 대체 사용")).toBeInTheDocument();
    expect(screen.getByText("시간대별 수요 예측")).toBeInTheDocument();
    expect(screen.getByText("실제 행사장 지도")).toBeInTheDocument();
    expect(screen.getByText("서울특별시 강남구 영동대로 511 (삼성동)")).toBeInTheDocument();
    expect(screen.getByText("혼잡도 시뮬레이션")).toBeInTheDocument();
    expect(screen.getByText("안전 및 물류 수용성")).toBeInTheDocument();
    expect(screen.getByText("안전관리 요원 추천 배치")).toBeInTheDocument();
    expect(screen.getByText("의료/구급 인력 추천 배치")).toBeInTheDocument();
    expect(screen.getByText("주차 수용 차오름 비율")).toBeInTheDocument();
    expect(screen.getByText("예산 대비 경제적 파급효과")).toBeInTheDocument();
    expect(screen.getByText("총 투입 예산")).toBeInTheDocument();
    expect(screen.getByText("예상 지역 상권 소비 창출액")).toBeInTheDocument();
    expect(screen.getByText("기획 보완 리포트")).toBeInTheDocument();
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

      expect(screen.getAllByText("실제 TourAPI 조회 성공").length).toBeGreaterThan(0);
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
      expect(screen.getAllByText("실제 TourAPI 조회 성공").length).toBeGreaterThan(0);

      fireEvent.change(view.getByLabelText("개최 지역"), {
        target: { value: "부산광역시" },
      });

      expect(screen.queryByText("실제 TourAPI 조회 성공")).not.toBeInTheDocument();
      expect(screen.getByText("샘플 데이터 대체 사용")).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(300);
      });
      resolveChangedRegion?.(liveTourismContext);
    } finally {
      vi.useRealTimers();
    }
  });
});
