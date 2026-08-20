import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTestAnalysisSnapshot } from "../test/analysisSnapshotFixture";
import { ReportView } from "./ReportView";

function renderReportView(onOpenEvidence = vi.fn()) {
  const snapshot = createTestAnalysisSnapshot();
  return {
    snapshot,
    onOpenEvidence,
    ...render(
      <ReportView snapshot={snapshot} onOpenEvidence={onOpenEvidence} />,
    ),
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ReportView", () => {
  it("renders dwell-aware flow evidence from the forecast", () => {
    const baseSnapshot = createTestAnalysisSnapshot();
    const snapshot = {
      ...baseSnapshot,
      forecast: {
        ...baseSnapshot.forecast,
        dwellProfile: {
          kind: "night-exhibition" as const,
          label: "검증용 체류 프로필",
          averageMinutes: 195,
          sourceType: "similar-festival" as const,
          sourceName: "검증 체류 데이터",
          confidence: "medium" as const,
          retentionRates: [1, 0.8, 0.4, 0],
        },
        occupancyByHour: [{ hour: 20, visitors: 2500 }],
        departuresByHour: [{ hour: 22, visitors: 1800 }],
      },
    };

    render(<ReportView snapshot={snapshot} onOpenEvidence={vi.fn()} />);

    expect(screen.getByText("검증용 체류 프로필")).toBeInTheDocument();
    expect(screen.getByText("출처: 검증 체류 데이터")).toBeInTheDocument();
    expect(screen.getByText("평균 체류 195분")).toBeInTheDocument();
    expect(screen.getByText("2,500명")).toBeInTheDocument();
    expect(screen.getByText("20:00 피크")).toBeInTheDocument();
    expect(screen.getByText("피크 이탈")).toBeInTheDocument();
    expect(screen.getByText("1,800명")).toBeInTheDocument();
    expect(screen.getByText("22:00 피크")).toBeInTheDocument();
  });

  it("prints the planning report for public review", () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => undefined);
    renderReportView();

    fireEvent.click(screen.getByRole("button", { name: "보고서 인쇄" }));

    expect(printSpy).toHaveBeenCalledOnce();
  });

  it("renders public-review report sections from the committed snapshot", () => {
    const { snapshot } = renderReportView();

    expect(screen.getByRole("region", { name: "공공검토 보고서" })).toBeInTheDocument();
    expect(screen.getByText("예측 결과")).toBeInTheDocument();
    expect(screen.getByText("혼잡·안전 진단")).toBeInTheDocument();
    expect(screen.getByText("예산·경제 효과")).toBeInTheDocument();
    expect(screen.getByText("사용 데이터와 한계")).toBeInTheDocument();
    expect(screen.getByText("개선 권고")).toBeInTheDocument();
    expect(screen.getByTestId("report-expected-visitors")).toHaveTextContent(
      snapshot.forecast.expectedVisitors.toLocaleString("ko-KR"),
    );
    expect(screen.getAllByText(`${snapshot.forecast.peakHour}:00`).length).toBeGreaterThan(0);
    expect(screen.getByTestId("report-analysis-id")).toHaveTextContent(snapshot.analysisId);
  });

  it("opens metric evidence from the report data section", () => {
    const onOpenEvidence = vi.fn();
    renderReportView(onOpenEvidence);

    fireEvent.click(screen.getByRole("button", { name: "흥행 가능성 점수 근거 보기" }));

    expect(onOpenEvidence).toHaveBeenCalled();
  });

  it("renders TourAPI operating account evidence for submission review", () => {
    renderReportView();

    expect(screen.getByText("OpenAPI 운영계정 신청 증빙")).toBeInTheDocument();
    expect(screen.getByText("Fest-Twin")).toBeInTheDocument();
    expect(screen.getByText("https://cwserver.tail97dbc3.ts.net/")).toBeInTheDocument();
    expect(screen.getByText(/지역 선택.*축제 후보.*상세 좌표.*주변 관광지/)).toBeInTheDocument();
    expect(screen.getByText(/한국관광공사 TourAPI 4.0 출처/)).toBeInTheDocument();
  });
});
