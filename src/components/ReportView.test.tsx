import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ForecastResult, PlanningReport } from "../domain/types";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import { ReportView } from "./ReportView";

const report: PlanningReport = {
  summary: "한강 일상문화축제 사전 진단 요약입니다.",
  governmentReviewNote: "예산 집행 전 검토용 리포트입니다.",
  scores: [
    {
      label: "예산 낭비 위험",
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

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ReportView", () => {
  it("prints the planning report for public review", () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => undefined);

    render(
      <ReportView
        report={report}
        plan={sampleFestivalPlan}
        forecast={forecast}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "리포트 인쇄" }));

    expect(printSpy).toHaveBeenCalledOnce();
  });
});
