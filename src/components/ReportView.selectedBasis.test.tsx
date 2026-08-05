import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import { sampleTourismContext } from "../data/sampleTourApi";
import { sampleTrendContext } from "../data/sampleTrends";
import type {
  ForecastResult,
  PlanningReport,
  SelectedFestivalBasis,
} from "../domain/types";
import { createMetricEvidenceSet } from "../services/metricEvidence";
import { createSimulation } from "../services/simulation";
import { ReportView } from "./ReportView";

const forecast: ForecastResult = {
  expectedVisitors: 30000,
  visitorsByHour: [
    { hour: 18, visitors: 9000 },
    { hour: 20, visitors: 12000 },
  ],
  peakHour: 20,
  successScore: 82,
  confidence: "medium",
  reasons: [],
};

const report: PlanningReport = {
  summary: "Planning report summary",
  governmentReviewNote: "Public review note",
  scores: [],
  findings: [],
  recommendations: [],
};

const selectedFestivalBasis: SelectedFestivalBasis = {
  contentId: "3439947",
  title: "Gangnam Media Winter Festa",
  address: "Seoul Gangnam-gu Yeongdong-daero 511",
  startDate: "2025-12-19",
  endDate: "2026-01-03",
  mapX: "127.0610512042",
  mapY: "37.5103955843",
  sourceName: "TourAPI selected festival candidate",
};

describe("ReportView selected festival basis", () => {
  it("renders selected TourAPI festival basis in the public-review report", () => {
    const simulation = createSimulation(sampleFestivalPlan, forecast, forecast.peakHour);
    const evidenceSet = createMetricEvidenceSet(
      sampleFestivalPlan,
      forecast,
      simulation,
      sampleTourismContext,
      sampleTrendContext,
    );

    render(
      <ReportView
        report={report}
        plan={sampleFestivalPlan}
        forecast={forecast}
        selectedFestivalBasis={selectedFestivalBasis}
        evidenceSet={evidenceSet}
        onOpenEvidence={vi.fn()}
      />,
    );

    expect(screen.getByText("선택 TourAPI 축제 기준")).toBeInTheDocument();
    expect(screen.getByText("Gangnam Media Winter Festa")).toBeInTheDocument();
    expect(screen.getByText("주최 / 주관")).toBeInTheDocument();
    expect(screen.getByText("Seoul Gangnam-gu Yeongdong-daero 511")).toBeInTheDocument();
  });
});
