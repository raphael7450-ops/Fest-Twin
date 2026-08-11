import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import { sampleSpendingContext } from "../data/sampleSpending";
import { sampleTourismContext } from "../data/sampleTourApi";
import { sampleTrendContext } from "../data/sampleTrends";
import type { ForecastResult, PlanningReport, SelectedFestivalBasis } from "../domain/types";
import { createMetricEvidenceSet } from "../services/metricEvidence";
import { createSimulation } from "../services/simulation";
import { B2gPrintReport } from "./B2gPrintReport";

const report: PlanningReport = {
  summary: "축제 사전 진단 요약입니다.",
  governmentReviewNote: "예산 집행 전 검토용 보고서입니다.",
  scores: [
    {
      label: "수용 능력 검토",
      score: 85,
      level: "low",
      reason: "수용 인원이 충분합니다.",
    },
    {
      label: "주차 및 교통",
      score: 80,
      level: "medium",
      reason: "대중교통 연계가 필요합니다.",
    },
  ],
  findings: ["20:00 이후 방문객 집중 가능성이 높습니다."],
  recommendations: [],
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

const selectedBasis: SelectedFestivalBasis = {
  contentId: "123456",
  title: "테스트 문화 축제",
  address: "서울특별시 강남구",
  startDate: "2026-10-01",
  endDate: "2026-10-03",
  sourceName: "TourAPI 4.0",
};

afterEach(() => {
  cleanup();
});

describe("B2gPrintReport", () => {
  it("renders B2G document header and titles", () => {
    const simulation = createSimulation(sampleFestivalPlan, forecast, forecast.peakHour);
    const evidenceSet = createMetricEvidenceSet(
      sampleFestivalPlan,
      forecast,
      simulation,
      sampleTourismContext,
      sampleTrendContext,
    );

    render(
      <B2gPrintReport
        report={report}
        plan={sampleFestivalPlan}
        forecast={forecast}
        selectedFestivalBasis={selectedBasis}
        spending={sampleSpendingContext}
        evidenceSet={evidenceSet}
      />,
    );

    expect(screen.getByText("[Fest-Twin] 축제 사전 진단 및 수요 추정 보고서")).toBeInTheDocument();
    expect(screen.getByText("테스트 문화 축제")).toBeInTheDocument();
    expect(screen.getAllByText(/SCN-123456/).length).toBeGreaterThan(0);
    expect(screen.getByText("30,000 명")).toBeInTheDocument();
  });

  it("labels the success score separately from forecast confidence", () => {
    const simulation = createSimulation(sampleFestivalPlan, forecast, forecast.peakHour);
    const evidenceSet = createMetricEvidenceSet(
      sampleFestivalPlan,
      forecast,
      simulation,
      sampleTourismContext,
      sampleTrendContext,
    );

    render(
      <B2gPrintReport
        report={report}
        plan={sampleFestivalPlan}
        forecast={forecast}
        spending={sampleSpendingContext}
        evidenceSet={evidenceSet}
      />,
    );

    expect(screen.getByText("흥행 가능성 점수: 82점")).toBeInTheDocument();
    expect(screen.getByText("예측 신뢰도: medium")).toBeInTheDocument();
  });

  it("renders 4-Step breakdown and data integrity labels on page 2", () => {
    const simulation = createSimulation(sampleFestivalPlan, forecast, forecast.peakHour);
    const evidenceSet = createMetricEvidenceSet(
      sampleFestivalPlan,
      forecast,
      simulation,
      sampleTourismContext,
      sampleTrendContext,
    );

    render(
      <B2gPrintReport
        report={report}
        plan={sampleFestivalPlan}
        forecast={forecast}
        selectedFestivalBasis={selectedBasis}
        spending={sampleSpendingContext}
        evidenceSet={evidenceSet}
      />,
    );

    expect(screen.getByText("4. 4단계 수치 산출 근거 상세 (Step 1 ~ 4 Breakdown)")).toBeInTheDocument();
    expect(screen.getByText("Step 1. 수요 추정")).toBeInTheDocument();
    expect(screen.getByText("Step 2. 밀집도 & 안전인력")).toBeInTheDocument();
    expect(screen.getByText("Step 3. 상권 경제 효과")).toBeInTheDocument();
    expect(screen.getByText("Step 4. 수용성 & 리스크")).toBeInTheDocument();
    expect(screen.getByText("5. 적용 데이터 출처 및 무결성 라벨 (Data Provenance & Integrity)")).toBeInTheDocument();
  });
});
