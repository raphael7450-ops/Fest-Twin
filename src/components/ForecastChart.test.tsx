import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ForecastChart } from "./ForecastChart";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import { sampleTourismContext } from "../data/sampleTourApi";
import { sampleTrendContext } from "../data/sampleTrends";
import { createForecast } from "../services/forecast";

describe("ForecastChart", () => {
  it("renders tabs for summary, weekday, and weekend and switches profiles", () => {
    const forecast = createForecast(
      sampleFestivalPlan,
      sampleTourismContext,
      sampleTrendContext,
    );

    render(<ForecastChart forecast={forecast} />);

    expect(screen.getByText(/시간대별 수요 예측/)).toBeInTheDocument();

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
  });
});
