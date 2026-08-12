import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnalysisStatusBanner } from "../src/components/AnalysisStatusBanner";
import { B2gPrintReport } from "../src/components/B2gPrintReport";
import { OperationalScoreHeader } from "../src/components/OperationalScoreHeader";
import { ReportView } from "../src/components/ReportView";
import * as simulationModule from "../src/services/simulation";
import { createTestAnalysisSnapshot } from "../src/test/analysisSnapshotFixture";
import { buildCsvReportContent } from "../src/utils/csvExport";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("analysis output consistency", () => {
  it("renders screen, report, and print identity and expected visitors from one snapshot", () => {
    const snapshot = createTestAnalysisSnapshot();
    render(
      <>
        <AnalysisStatusBanner phase="ready" snapshot={snapshot} errorMessages={[]} />
        <OperationalScoreHeader
          plan={snapshot.plan}
          forecast={snapshot.forecast}
          report={snapshot.report}
          evidenceSet={snapshot.evidence}
          selectedFestivalBasis={snapshot.selectedFestivalBasis}
        />
        <ReportView snapshot={snapshot} onOpenEvidence={vi.fn()} />
        <B2gPrintReport snapshot={snapshot} />
      </>,
    );

    const expectedVisitors = snapshot.forecast.expectedVisitors.toLocaleString("ko-KR");
    expect(screen.getByTestId("analysis-id")).toHaveTextContent(snapshot.analysisId);
    expect(screen.getByTestId("dashboard-expected-visitors")).toHaveTextContent(expectedVisitors);
    expect(screen.getByTestId("report-expected-visitors")).toHaveTextContent(expectedVisitors);
    expect(screen.getByTestId("report-analysis-id")).toHaveTextContent(snapshot.analysisId);

    const printRoot = screen.getByLabelText("B2G 행정 결재 및 감사 제출용 보고서");
    expect(printRoot).toHaveAttribute("data-print-analysis-id", snapshot.analysisId);
    expect(within(printRoot).getAllByText(snapshot.analysisId).length).toBeGreaterThan(0);
    expect(within(printRoot).getAllByText(new RegExp(expectedVisitors)).length).toBeGreaterThan(0);
  });

  it("exports snapshot identity, statuses, and canonical metrics without recomputing simulation", () => {
    const snapshot = createTestAnalysisSnapshot();
    const simulationSpy = vi.spyOn(simulationModule, "createSimulation");

    render(
      <>
        <ReportView snapshot={snapshot} onOpenEvidence={vi.fn()} />
        <B2gPrintReport snapshot={snapshot} />
      </>,
    );
    const csv = buildCsvReportContent({ snapshot });

    expect(simulationSpy).not.toHaveBeenCalled();
    expect(csv).toContain(snapshot.analysisId);
    expect(csv).toContain(snapshot.modelVersion);
    expect(csv).toContain(snapshot.createdAt);
    expect(csv).toContain(snapshot.festivalId);
    expect(csv).toContain(`${snapshot.forecast.expectedVisitors.toLocaleString("ko-KR")}명`);
    expect(csv).toContain(String(snapshot.metrics.summary.successPotential.score));
    expect(csv).toContain(String(snapshot.metrics.summary.capacityPressure.displayPercent));
    Object.entries(snapshot.datasets).forEach(([name, dataset]) => {
      expect(csv).toContain(name);
      expect(csv).toContain(dataset.status);
    });
  });
});
