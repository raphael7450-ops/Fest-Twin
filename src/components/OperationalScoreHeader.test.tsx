import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  ForecastResult,
  MetricEvidence,
  PlanningReport,
  SelectedFestivalBasis,
} from "../domain/types";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import * as impactMetrics from "../services/impactMetrics";
import { OperationalScoreHeader } from "./OperationalScoreHeader";

const forecast: ForecastResult = {
  expectedVisitors: 125000,
  visitorsByHour: [
    { hour: 18, visitors: 32000 },
    { hour: 20, visitors: 52000 },
  ],
  peakHour: 20,
  successScore: 88,
  confidence: "medium",
  reasons: [],
};

const report: PlanningReport = {
  summary: "운영 분석 요약",
  scores: [
    {
      label: "피크 혼잡",
      score: 72,
      level: "high",
      reason: "20시 집중 방문",
    },
  ],
  findings: ["피크 시간대 진입 동선 보강 필요"],
  recommendations: [
    {
      id: "rec-1",
      title: "안전 인력 재배치",
      detail: "혼잡 구간에 추가 배치",
      expectedEffect: "대기 시간 감소",
    },
  ],
  governmentReviewNote: "공공 검토 기준",
};

const selectedBasis: SelectedFestivalBasis = {
  contentId: "selected-001",
  title: "강남 미디어 윈터페스타",
  address: "서울 강남구 영동대로 511",
  startDate: "2026-12-19",
  endDate: "2026-12-31",
  sourceName: "TourAPI selected festival candidate",
};

const evidenceSet = {
  "demand-index": {
    metricId: "demand-index",
    title: "수요 예측 근거",
    summary: "수요 예측 근거 요약",
    dataSources: ["TourAPI"],
    sourceDetails: [],
    formulaSummary: "수요 지수 산식",
    assumptions: [],
    confidence: "high",
    confidenceLabel: "높음",
    limitations: [],
    contributors: [],
  },
} as unknown as Record<string, MetricEvidence>;

describe("OperationalScoreHeader", () => {
  it("renders the bounded success potential score, forecast, risk, actions, and selected festival context", () => {
    const metricFactory = vi.spyOn(impactMetrics, "createSuccessPotentialMetric");
    render(
      <OperationalScoreHeader
        plan={sampleFestivalPlan}
        forecast={forecast}
        report={report}
        evidenceSet={evidenceSet}
        selectedFestivalBasis={selectedBasis}
        successPotential={{ score: 88, grade: "상", description: "Committed metric" }}
      />,
    );

    expect(metricFactory).not.toHaveBeenCalled();
    expect(screen.getByText("흥행 가능성 점수")).toBeInTheDocument();
    expect(screen.getByText("88점")).toBeInTheDocument();
    expect(screen.getByText("예상 방문")).toBeInTheDocument();
    expect(screen.getByText("125,000명")).toBeInTheDocument();
    expect(screen.getByText("피크 혼잡")).toBeInTheDocument();
    expect(screen.getByText("52,000명")).toBeInTheDocument();
    expect(screen.getByText("조치 필요")).toBeInTheDocument();
    expect(screen.getByText("1건")).toBeInTheDocument();
    expect(screen.getByText("선택 축제 기준")).toBeInTheDocument();
    expect(screen.getByText("강남 미디어 윈터페스타")).toBeInTheDocument();
    expect(screen.getByText("2026-12-19 ~ 2026-12-31")).toBeInTheDocument();
  });

  it("does not render a success score above one hundred", () => {
    render(
      <OperationalScoreHeader
        plan={sampleFestivalPlan}
        forecast={{ ...forecast, successScore: 132 }}
        report={report}
        evidenceSet={evidenceSet}
        successPotential={{ score: 100, grade: "상", description: "Committed bounded metric" }}
      />,
    );

    expect(screen.getByText("100점")).toBeInTheDocument();
  });
});
