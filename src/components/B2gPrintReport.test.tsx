import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  createTestAnalysisSnapshot,
  testSelectedFestivalBasis,
} from "../test/analysisSnapshotFixture";
import { B2gPrintReport } from "./B2gPrintReport";

afterEach(cleanup);

describe("B2gPrintReport", () => {
  it("renders B2G document header and snapshot identity", () => {
    const snapshot = createTestAnalysisSnapshot();
    render(<B2gPrintReport snapshot={snapshot} />);

    const root = screen.getByLabelText("B2G 행정 결재 및 감사 제출용 보고서");
    expect(screen.getByText("[Fest-Twin] 축제 사전 진단 및 수요 추정 보고서")).toBeInTheDocument();
    expect(screen.getAllByText(testSelectedFestivalBasis.title).length).toBeGreaterThan(0);
    expect(within(root).getAllByText(snapshot.analysisId).length).toBeGreaterThan(0);
    expect(root).toHaveAttribute("data-print-analysis-id", snapshot.analysisId);
    expect(
      screen.getByText(`${snapshot.forecast.expectedVisitors.toLocaleString("ko-KR")} 명`),
    ).toBeInTheDocument();
  });

  it("labels the canonical success score separately from forecast confidence", () => {
    const snapshot = createTestAnalysisSnapshot();
    render(<B2gPrintReport snapshot={snapshot} />);

    expect(
      screen.getByText(`흥행 가능성 점수: ${snapshot.metrics.summary.successPotential.score}점`),
    ).toBeInTheDocument();
    expect(screen.getByText(`예측 신뢰도: ${snapshot.forecast.confidence}`)).toBeInTheDocument();
  });

  it("renders 4-Step breakdown and every dataset status on page 2", () => {
    const snapshot = createTestAnalysisSnapshot();
    render(<B2gPrintReport snapshot={snapshot} />);

    expect(screen.getByText("4. 4단계 수치 산출 근거 상세 (Step 1 ~ 4 Breakdown)")).toBeInTheDocument();
    expect(screen.getByText("Step 1. 수요 추정")).toBeInTheDocument();
    expect(screen.getByText("Step 2. 밀집도 & 안전인력")).toBeInTheDocument();
    expect(screen.getByText("Step 3. 상권 경제 효과")).toBeInTheDocument();
    expect(screen.getByText("Step 4. 수용성 & 리스크")).toBeInTheDocument();
    expect(screen.getByText("5. 적용 데이터 출처 및 무결성 라벨 (Data Provenance & Integrity)")).toBeInTheDocument();
    Object.entries(snapshot.datasets).forEach(([name, dataset]) => {
      expect(screen.getByText(name)).toBeInTheDocument();
      expect(screen.getAllByText(dataset.status).length).toBeGreaterThan(0);
    });
  });
});
