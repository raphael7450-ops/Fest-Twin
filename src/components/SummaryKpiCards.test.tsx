import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import { sampleTourismContext } from "../data/sampleTourApi";
import type { ForecastResult, SimulationResult } from "../domain/types";
import { SummaryKpiCards } from "./SummaryKpiCards";

const forecast: ForecastResult = {
  expectedVisitors: 174_000,
  visitorsByHour: [{ hour: 20, visitors: 80_000 }],
  peakHour: 20,
  successScore: 78,
  confidence: "medium",
  reasons: [],
};

const simulation: SimulationResult = {
  hour: 20,
  congestionScore: 80,
  bottlenecks: [],
  cells: [],
};

describe("SummaryKpiCards", () => {
  it("labels success potential separately from capacity pressure", () => {
    render(
      <SummaryKpiCards
        plan={{ ...sampleFestivalPlan, expectedCapacity: 120_000 }}
        forecast={forecast}
        simulation={simulation}
        tourism={sampleTourismContext}
        onOpenEvidence={vi.fn()}
      />,
    );

    expect(screen.getByText("흥행 가능성 점수")).toBeInTheDocument();
    expect(screen.getByText("78점")).toBeInTheDocument();
    expect(screen.getByText("수용 정원률 145%")).toBeInTheDocument();
    expect(screen.getByText("초과")).toBeInTheDocument();
  });
});
