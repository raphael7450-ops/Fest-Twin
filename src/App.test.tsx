import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sampleTourismContext } from "./data/sampleTourApi";

const { getTourismContextMock } = vi.hoisted(() => ({
  getTourismContextMock: vi.fn(),
}));

vi.mock("./services/tourApiAdapter", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./services/tourApiAdapter")>()),
  getTourismContext: getTourismContextMock,
}));

import { App } from "./App";

describe("App", () => {
  beforeEach(() => {
    getTourismContextMock.mockReset();
    getTourismContextMock.mockResolvedValue(sampleTourismContext);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders the government-guided Fest-Twin MVP dashboard", async () => {
    render(<App />);

    expect(screen.getByText("페스트트윈(Fest-Twin)")).toBeInTheDocument();
    expect(screen.getByText("정부 지침 반영 현황")).toBeInTheDocument();
    expect(screen.getByText("제출 데모 검증 현황")).toBeInTheDocument();
    expect(screen.getByText("공개 데모")).toBeInTheDocument();
    expect(screen.getByText("TourAPI 프록시")).toBeInTheDocument();
    expect(screen.getByText("인증키는 서버 런타임 환경변수로만 주입")).toBeInTheDocument();
    expect(screen.getByText("축제 기획안 입력")).toBeInTheDocument();
    expect(screen.getByText("데이터 근거")).toBeInTheDocument();
    expect(await screen.findByText("샘플 데이터 대체 사용")).toBeInTheDocument();
    expect(screen.getByText("시간대별 수요 예측")).toBeInTheDocument();
    expect(screen.getByText("혼잡도 시뮬레이션")).toBeInTheDocument();
    expect(screen.getByText("기획 보완 리포트")).toBeInTheDocument();
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
