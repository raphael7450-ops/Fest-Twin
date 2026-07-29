import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import { sampleTourismContext } from "../data/sampleTourApi";
import { sampleTrendContext } from "../data/sampleTrends";
import type { ForecastResult, PlanningReport } from "../domain/types";
import { createMetricEvidenceSet } from "../services/metricEvidence";
import { createSimulation } from "../services/simulation";
import { ReportView } from "./ReportView";

const report: PlanningReport = {
  summary: "축제 사전 진단 요약입니다.",
  governmentReviewNote: "예산 집행 전 검토용 리포트입니다.",
  scores: [
    {
      label: "예산 대비 위험",
      score: 42,
      level: "medium",
      reason: "예상 방문객 대비 예산 규모를 비교했습니다.",
    },
  ],
  findings: ["20:00 이후 방문객 집중 가능성이 높습니다."],
  recommendations: [
    {
      id: "program-split",
      title: "피크 프로그램 분산",
      detail: "메인 공연 시간대 집중을 낮춥니다.",
      expectedEffect: "피크 시간 밀집 완화",
    },
  ],
};

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

function renderReportView() {
  const simulation = createSimulation(sampleFestivalPlan, forecast, forecast.peakHour);
  const evidenceSet = createMetricEvidenceSet(
    sampleFestivalPlan,
    forecast,
    simulation,
    sampleTourismContext,
    sampleTrendContext,
  );

  return render(
    <ReportView
      report={report}
      plan={sampleFestivalPlan}
      forecast={forecast}
      evidenceSet={evidenceSet}
      onOpenEvidence={vi.fn()}
    />,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ReportView", () => {
  it("structures the report into public-review sections", () => {
    renderReportView();

    [
      "예측 결과",
      "혼잡·안전 진단",
      "예산·경제 효과",
      "사용 데이터와 한계",
      "개선 권고",
    ].forEach((sectionName) => {
      expect(screen.getByRole("heading", { name: sectionName })).toBeInTheDocument();
    });
  });

  it("prints the planning report for public review", () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => undefined);

    renderReportView();

    fireEvent.click(screen.getByRole("button", { name: "리포트 인쇄" }));

    expect(printSpy).toHaveBeenCalledOnce();
  });

  it("renders compact evidence summaries for submission review", () => {
    renderReportView();

    expect(screen.getByText("산출 근거 요약")).toBeInTheDocument();
    expect(screen.getByText("흥행 예측 지수")).toBeInTheDocument();
    expect(screen.getByText("최고 밀집 위험도")).toBeInTheDocument();
    expect(screen.getAllByText("예산 대비 경제적 파급효과").length).toBeGreaterThan(0);
  });

  it("renders TourAPI operating account evidence for submission review", () => {
    renderReportView();

    expect(screen.getByText("OpenAPI 운영계정 신청 증빙")).toBeInTheDocument();
    expect(screen.getByText("Fest-Twin")).toBeInTheDocument();
    expect(screen.getByText("https://cwserver.tail97dbc3.ts.net/")).toBeInTheDocument();
    expect(screen.getByText(/지역 선택.*축제 후보.*상세 좌표.*주변 관광지/)).toBeInTheDocument();
    expect(screen.getByText(/개발계정은 오퍼레이션별 일 1,000건/)).toBeInTheDocument();
    expect(screen.getByText(/한국관광공사 TourAPI 4.0 출처/)).toBeInTheDocument();
  });
});
