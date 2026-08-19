import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { afterEach } from "vitest";
import { ForecastChart } from "./ForecastChart";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import { sampleTourismContext } from "../data/sampleTourApi";
import { sampleTrendContext } from "../data/sampleTrends";
import { createForecast } from "../services/forecast";

describe("ForecastChart", () => {
  afterEach(() => cleanup());

  it("renders tabs for summary, weekday, and weekend and switches profiles", () => {
    const forecast = createForecast(
      sampleFestivalPlan,
      sampleTourismContext,
      sampleTrendContext,
    );

    const { unmount } = render(<ForecastChart forecast={forecast} />);

    expect(screen.getByRole("heading", { name: /시간대별 수요 예측/ })).toBeInTheDocument();

    const summaryTab = screen.getByRole("tab", { name: /전체 요약/ });
    const weekdayTab = screen.getByRole("tab", { name: /평일 평균/ });
    const weekendTab = screen.getByRole("tab", { name: /주말 피크/ });

    expect(summaryTab).toBeInTheDocument();
    expect(weekdayTab).toBeInTheDocument();
    expect(weekendTab).toBeInTheDocument();

    expect(summaryTab).toHaveAttribute("aria-selected", "true");

    // Click weekday tab
    fireEvent.click(weekdayTab);
    expect(weekdayTab).toHaveAttribute("aria-selected", "true");
    expect(summaryTab).toHaveAttribute("aria-selected", "false");

    // Click weekend tab
    fireEvent.click(weekendTab);
    expect(weekendTab).toHaveAttribute("aria-selected", "true");
    expect(weekdayTab).toHaveAttribute("aria-selected", "false");

    unmount();
  });

  it("defaults to concurrent occupancy mode and shows tab", () => {
    const forecast = createForecast(
      sampleFestivalPlan,
      sampleTourismContext,
      sampleTrendContext,
    );

    const { unmount } = render(<ForecastChart forecast={forecast} />);

    const flowTabs = screen.getByRole("tablist", { name: "방문객 흐름 구분" });
    const occupancyTab = within(flowTabs).getByRole("tab", { name: "동시 체류" });
    expect(occupancyTab).toHaveAttribute("aria-selected", "true");

    unmount();
  });

  it("switches to arrivals mode when the 신규 유입 tab is clicked", () => {
    const forecast = createForecast(
      sampleFestivalPlan,
      sampleTourismContext,
      sampleTrendContext,
    );

    const { unmount } = render(<ForecastChart forecast={forecast} />);

    const flowTabs = screen.getByRole("tablist", { name: "방문객 흐름 구분" });
    const arrivalTab = within(flowTabs).getByRole("tab", { name: "신규 유입" });
    fireEvent.click(arrivalTab);
    expect(arrivalTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("시간대 신규 유입")).toBeInTheDocument();

    unmount();
  });

  it("shows dwell profile average minutes summary", () => {
    const forecast = createForecast(
      { ...sampleFestivalPlan, name: "서울세계불꽃축제", keywords: ["불꽃", "야간관광"] },
      sampleTourismContext,
      sampleTrendContext,
    );

    const { unmount } = render(<ForecastChart forecast={forecast} />);

    expect(screen.getByText("평균 체류 270분")).toBeInTheDocument();

    unmount();
  });

  it("falls back to legacy visitorsByHour when occupancyByHour is absent", () => {
    const legacyForecast = createForecast(
      sampleFestivalPlan,
      sampleTourismContext,
      sampleTrendContext,
    );
    const forecastWithoutOccupancy = {
      ...legacyForecast,
      occupancyByHour: undefined,
      arrivalsByHour: undefined,
      departuresByHour: undefined,
      dwellProfile: undefined,
    };

    const { unmount } = render(<ForecastChart forecast={forecastWithoutOccupancy} />);

    expect(screen.getByRole("heading", { name: /시간대별 수요 예측/ })).toBeInTheDocument();

    unmount();
  });
});
