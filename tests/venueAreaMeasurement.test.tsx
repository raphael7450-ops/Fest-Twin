import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VenueMapPanel } from "../src/components/VenueMapPanel";
import { sampleFestivalPlan } from "../src/data/sampleFestivalPlan";

describe("VenueMapPanel Area Measurement", () => {
  it("renders venue map panel and toggles polygon measurement mode", () => {
    const handlePlanChange = vi.fn();
    render(<VenueMapPanel plan={sampleFestivalPlan} onPlanChange={handlePlanChange} />);

    expect(screen.getByText("실제 행사장 지도")).toBeInTheDocument();
    const startButton = screen.getByRole("button", { name: "행사 구역 실측 시작" });
    expect(startButton).toBeInTheDocument();

    fireEvent.click(startButton);

    expect(screen.getByText("실측 취소")).toBeInTheDocument();
    expect(
      screen.getByText(/지도 위를 마우스로 클릭하여 행사 통제 구역.*다각형 경계를 그리세요/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("실측 취소"));
    expect(screen.getByText("행사 구역 실측 시작")).toBeInTheDocument();
  });

  it("displays current registered venue area and provenance", () => {
    const planWithArea = {
      ...sampleFestivalPlan,
      venueAreaSquareMeters: 45000,
      venueAreaProvenance: {
        origin: "user-adjusted" as const,
        sourceDataset: "VWorld 지도 실측 폴리곤",
        referenceAreaSquareMeters: 45000,
        appliedAt: "2026-09-03T00:00:00.000Z",
      },
    };

    render(<VenueMapPanel plan={planWithArea} />);

    expect(screen.getByText(/현재 등록 면적: 45,000 m²/)).toBeInTheDocument();
    expect(screen.getByText(/VWorld 지도 실측 폴리곤/)).toBeInTheDocument();
  });
});
