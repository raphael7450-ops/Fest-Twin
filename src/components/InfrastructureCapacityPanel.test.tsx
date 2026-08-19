import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FestivalPlan, ForecastResult } from "../domain/types";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import { sampleTourismContext } from "../data/sampleTourApi";
import { sampleTrendContext } from "../data/sampleTrends";
import { createForecast } from "../services/forecast";
import { InfrastructureCapacityPanel } from "./InfrastructureCapacityPanel";

function makeForecast(plan: FestivalPlan = sampleFestivalPlan): ForecastResult {
  return createForecast(plan, sampleTourismContext, sampleTrendContext);
}

describe("InfrastructureCapacityPanel", () => {
  afterEach(() => cleanup());

  it("shows input-required when parking and restroom capacity are not provided", () => {
    const forecast = makeForecast();
    const plan: FestivalPlan = {
      ...sampleFestivalPlan,
      parkingCapacityVehicles: undefined,
      restroomFixtureCount: undefined,
    };

    render(<InfrastructureCapacityPanel plan={plan} forecast={forecast} />);

    expect(screen.getAllByText("기획 입력 필요").length).toBeGreaterThanOrEqual(2);
  });

  it("shows recommended capacity when no inputs are provided", () => {
    const forecast = makeForecast();
    const plan: FestivalPlan = {
      ...sampleFestivalPlan,
      parkingCapacityVehicles: undefined,
      restroomFixtureCount: undefined,
    };

    render(<InfrastructureCapacityPanel plan={plan} forecast={forecast} />);

    expect(screen.getAllByText(/권장/).length).toBeGreaterThanOrEqual(1);
  });

  it("shows peak occupancy rate when explicit capacity is provided", () => {
    const forecast = makeForecast();
    const plan: FestivalPlan = {
      ...sampleFestivalPlan,
      parkingCapacityVehicles: 800,
      restroomFixtureCount: 40,
    };

    render(<InfrastructureCapacityPanel plan={plan} forecast={forecast} />);

    expect(screen.queryByText("기획 입력 필요")).not.toBeInTheDocument();
  });

  it("shows peak departure pressure card", () => {
    const forecast = makeForecast();
    const plan: FestivalPlan = {
      ...sampleFestivalPlan,
      parkingCapacityVehicles: 800,
      restroomFixtureCount: 40,
    };

    render(<InfrastructureCapacityPanel plan={plan} forecast={forecast} />);

    expect(screen.getByText(/최대 이탈/)).toBeInTheDocument();
  });

  it("calls onOpenEvidence when evidence button is clicked", () => {
    const handleEvidence = vi.fn();
    const forecast = makeForecast();

    render(
      <InfrastructureCapacityPanel
        plan={sampleFestivalPlan}
        forecast={forecast}
        onOpenEvidence={handleEvidence}
      />,
    );

    const buttons = screen.getAllByRole("button");
    buttons[0].click();
    expect(handleEvidence).toHaveBeenCalled();
  });
});
