import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sampleTourismContext } from "./data/sampleTourApi";

const { getTourismContextMock } = vi.hoisted(() => ({
  getTourismContextMock: vi.fn(),
}));

vi.mock("./services/tourApiAdapter", () => ({
  getTourismContext: getTourismContextMock,
}));

import { App } from "./App";

describe("App", () => {
  beforeEach(() => {
    getTourismContextMock.mockReset();
    getTourismContextMock.mockResolvedValue(sampleTourismContext);
  });

  it("renders the government-guided Fest-Twin MVP dashboard", async () => {
    render(<App />);

    expect(screen.getByText("페스트트윈(Fest-Twin)")).toBeInTheDocument();
    expect(screen.getByText("정부 지침 반영 현황")).toBeInTheDocument();
    expect(screen.getByText("축제 기획안 입력")).toBeInTheDocument();
    expect(screen.getByText("데이터 근거")).toBeInTheDocument();
    expect(await screen.findByText("샘플 데이터 대체 사용")).toBeInTheDocument();
    expect(screen.getByText("시간대별 수요 예측")).toBeInTheDocument();
    expect(screen.getByText("혼잡도 시뮬레이션")).toBeInTheDocument();
    expect(screen.getByText("기획 보완 리포트")).toBeInTheDocument();
  });

  it("updates the data basis status after the TourAPI adapter resolves live data", async () => {
    getTourismContextMock.mockResolvedValue({
      ...sampleTourismContext,
      provenance: {
        ...sampleTourismContext.provenance,
        sourceName: "한국관광공사 TourAPI",
        sourceStatus: "live",
      },
    });

    render(<App />);

    expect(await screen.findByText("실제 TourAPI 조회 성공")).toBeInTheDocument();
    expect(getTourismContextMock).toHaveBeenCalledTimes(1);
  });
});
