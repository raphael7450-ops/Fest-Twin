import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createTestAnalysisSnapshot } from "../test/analysisSnapshotFixture";
import { AnalysisStatusBanner } from "./AnalysisStatusBanner";

afterEach(cleanup);

describe("AnalysisStatusBanner", () => {
  it("announces initial loading accessibly", () => {
    render(
      <AnalysisStatusBanner phase="loading" errorMessages={[]} />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "분석 자료를 준비하고 있습니다.",
    );
  });

  it("keeps the old snapshot identity visible while a new festival refreshes", () => {
    const snapshot = createTestAnalysisSnapshot();
    render(
      <AnalysisStatusBanner
        phase="refreshing"
        snapshot={snapshot}
        pendingFestivalTitle="새 축제"
        errorMessages={[]}
      />,
    );

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(snapshot.selectedFestivalBasis!.title);
    expect(status).not.toHaveTextContent(snapshot.plan.name);
    expect(status).toHaveTextContent("새 축제");
    expect(status).toHaveTextContent(snapshot.analysisId);
  });

  it("shows committed time, analysis identity, and truthful dataset statuses when ready", () => {
    const snapshot = createTestAnalysisSnapshot();
    render(
      <AnalysisStatusBanner phase="ready" snapshot={snapshot} errorMessages={[]} />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(snapshot.createdAt);
    expect(screen.getByTestId("analysis-id")).toHaveTextContent(snapshot.analysisId);
    expect(screen.getByText("실시간 2")).toBeInTheDocument();
    expect(screen.getByText("유효 저장자료 2")).toBeInTheDocument();
    expect(screen.getByText("검증 보완 1")).toBeInTheDocument();
    expect(screen.getByText("사용 불가 1")).toBeInTheDocument();
    expect(screen.queryByText("전체 데이터 실시간")).not.toBeInTheDocument();
  });

  it("preserves the old analysis identity and reports concise errors", () => {
    const snapshot = createTestAnalysisSnapshot();
    render(
      <AnalysisStatusBanner
        phase="error"
        snapshot={snapshot}
        errorMessages={["Tourism: timeout", "Weather: unavailable"]}
      />,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(snapshot.analysisId);
    expect(alert).toHaveTextContent("Tourism: timeout");
    expect(alert).toHaveTextContent("Weather: unavailable");
  });
});
