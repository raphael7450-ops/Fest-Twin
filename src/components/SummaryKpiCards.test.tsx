import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import * as impactMetrics from "../services/impactMetrics";
import type { SummaryKpiMetrics } from "../services/impactMetrics";
import { SummaryKpiCards } from "./SummaryKpiCards";

const metrics: SummaryKpiMetrics = {
  successPotential: {
    score: 78,
    grade: "중",
    description: "Committed success potential",
  },
  capacityPressure: {
    ratio: 1.45,
    displayPercent: 145,
    status: "over",
  },
  peakDensity: {
    status: "unavailable",
    unit: "people_per_square_meter",
    confidence: "low",
    reason: "행사장 면적 정보 없음",
  },
  budgetEfficiency: {
    costPerVisitorKrw: 5_000,
    description: "Committed budget efficiency",
  },
  spillover: {
    nearbyInflowRate: 65,
    description: "Committed spillover",
  },
};

describe("SummaryKpiCards", () => {
  it("renders committed summary metrics without recalculating them", () => {
    const metricFactory = vi.spyOn(impactMetrics, "createSummaryKpiMetrics");

    render(<SummaryKpiCards metrics={metrics} onOpenEvidence={vi.fn()} />);

    expect(metricFactory).not.toHaveBeenCalled();
    expect(screen.getByText("흥행 가능성 점수")).toBeInTheDocument();
    expect(screen.getByText("78점")).toBeInTheDocument();
    expect(screen.getByText("수용 정원률 145%")).toBeInTheDocument();
    expect(screen.getByText("초과")).toBeInTheDocument();
  });
});
