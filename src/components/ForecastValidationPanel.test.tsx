import { render, screen, cleanup } from "@testing-library/react";
import { expect, it } from "vitest";
import { ForecastValidationPanel } from "./ForecastValidationPanel";

it("does not label captured predictions as validated or fabricate an accuracy percentage", () => {
  render(<ForecastValidationPanel state={{ phase: "saved", summary: {
    archive: { archived: 3, preEvent: 2, afterStart: 1, verified: 0, corrupt: 0, quota: 1000 },
    evaluation: { status: "INSUFFICIENT_EVIDENCE", comparable: 0, excluded: 0, unmatchedActuals: 1, actualIssues: [], groups: [] },
  } }} />);
  expect(screen.getByText("정확도 판정 보류")).toBeInTheDocument();
  expect(screen.getByText("서버 보관 완료 · 검증 전")).toBeInTheDocument();
  expect(screen.queryByText(/100%/)).not.toBeInTheDocument();
  expect(screen.getByText(/집계 방식 미확인 자료는 정확도 평가와 모델 보정에 사용하지 않습니다/)).toBeInTheDocument();
  expect(screen.getByText("순천시 축제 현황 원문")).toHaveAttribute("href", "https://www.data.go.kr/data/15150652/fileData.do");
});

it("explains error and warns that a single holdout festival is insufficient", () => {
  cleanup();
  render(<ForecastValidationPanel state={{ phase: "saved", summary: {
    archive: { archived: 1, preEvent: 1, afterStart: 0, verified: 0, corrupt: 0, quota: 1000 },
    evaluation: { status: "COMPARISONS_AVAILABLE", comparable: 1, excluded: 0, unmatchedActuals: 0, actualIssues: [],
      groups: [{ mode: "replay", modelVersion: "fixture", year: 2025, measure: "cumulative_entries", scope: "event_total", count: 1, independentFestivals: 1, evaluationRole: "holdout", mae: 20, bias: -20, wapePercent: 20 }] },
  } }} />);
  expect(screen.getByText(/독립 축제 1개.*표본 부족/)).toBeInTheDocument();
  expect(screen.getByText(/WAPE는.*오차율/)).toBeInTheDocument();
  expect(screen.getByText(/편향.*음수.*과소/)).toBeInTheDocument();
});
