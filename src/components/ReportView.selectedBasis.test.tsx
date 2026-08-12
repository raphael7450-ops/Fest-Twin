import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SelectedFestivalBasis } from "../domain/types";
import { createTestAnalysisSnapshot } from "../test/analysisSnapshotFixture";
import { ReportView } from "./ReportView";

const selectedFestivalBasis: SelectedFestivalBasis = {
  contentId: "3439947",
  title: "Gangnam Media Winter Festa",
  address: "Seoul Gangnam-gu Yeongdong-daero 511",
  startDate: "2025-12-19",
  endDate: "2026-01-03",
  mapX: "127.0610512042",
  mapY: "37.5103955843",
  sourceName: "TourAPI selected festival candidate",
};

describe("ReportView selected festival basis", () => {
  it("renders selected TourAPI festival basis in the public-review report", () => {
    const snapshot = createTestAnalysisSnapshot({ selectedFestivalBasis });

    render(<ReportView snapshot={snapshot} onOpenEvidence={vi.fn()} />);

    expect(screen.getByText("선택 TourAPI 축제 기준")).toBeInTheDocument();
    expect(screen.getAllByText(selectedFestivalBasis.title).length).toBeGreaterThan(0);
    expect(screen.getByText("주최 / 주관")).toBeInTheDocument();
    expect(screen.getAllByText(selectedFestivalBasis.address).length).toBeGreaterThan(0);
  });
});
