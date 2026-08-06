import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FESTIVAL_PRESETS } from "../data/festivalPresets";
import { sampleSpendingContext } from "../data/sampleSpending";
import { sampleTourismContext } from "../data/sampleTourApi";
import { sampleTrendContext } from "../data/sampleTrends";
import { createForecast } from "../services/forecast";
import { createMetricEvidenceSet } from "../services/metricEvidence";
import { createPlanningReport } from "../services/report";
import { createSimulation } from "../services/simulation";
import { PresentationControlView } from "./PresentationControlView";

describe("PresentationControlView", () => {
  it("renders presentation header, large KPI cards, and breakdown overview", () => {
    const preset =
      FESTIVAL_PRESETS.find((p) => p.id === "preset_daejeon_0시축제") ?? FESTIVAL_PRESETS[0]; // Daejeon 0 O'clock
    const forecast = createForecast(preset.plan, sampleTourismContext, sampleTrendContext);
    const simulation = createSimulation(preset.plan, forecast, 20);
    const report = createPlanningReport(preset.plan, forecast, simulation);
    const evidenceSet = createMetricEvidenceSet(
      preset.plan,
      forecast,
      simulation,
      sampleTourismContext,
      sampleTrendContext,
    );
    const onExit = vi.fn();

    render(
      <PresentationControlView
        plan={preset.plan}
        forecast={forecast}
        report={report}
        selectedFestivalBasis={preset.basis}
        spending={sampleSpendingContext}
        metricEvidence={evidenceSet}
        onExit={onExit}
      />,
    );

    expect(screen.getByText("FT CONTROL")).toBeInTheDocument();
    expect(screen.getByText(/대전 0시 축제/)).toBeInTheDocument();
    expect(screen.getByText("총 예상 방문객 수")).toBeInTheDocument();
    expect(screen.getByText("피크 최고 밀집도")).toBeInTheDocument();
    expect(screen.getByText("상권 경제 파급효과")).toBeInTheDocument();
    expect(screen.getByText("종합 안전 위험 등급")).toBeInTheDocument();
    expect(screen.getByText("관제 모드 종료 (ESC)")).toBeInTheDocument();
  });
});
