import { render } from "@testing-library/react";
import { it, expect } from "vitest";
import { MetricEvidenceDrawer } from "./MetricEvidenceDrawer";

it("does not attach unrelated providers to user-input-only evidence", () => {
  const { container } = render(<MetricEvidenceDrawer isOpen onClose={() => {}} evidence={{
    metricId: "budget-efficiency", title: "예산", summary: "기획 입력",
    dataSources: ["사용자 입력"], sourceDetails: [], formulaSummary: "입력 금액",
    assumptions: [], limitations: [], contributors: [], confidence: "low", confidenceLabel: "낮음",
  }} />);
  expect(container.textContent).not.toMatch(/TourAPI|KTDB|네이버|기상청/);
});
