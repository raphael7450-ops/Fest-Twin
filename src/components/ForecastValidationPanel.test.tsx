import { render, screen } from "@testing-library/react";
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
});
