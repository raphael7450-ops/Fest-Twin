import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FestivalPlan } from "../domain/types";
import { PlanForm } from "./PlanForm";

const plan: FestivalPlan = {
  name: "Regional Database Festival",
  region: "Gangwon-do",
  venueAddress: "Gangwon-do Chuncheon-si Festival Plaza",
  startDate: "2026-09-12",
  endDate: "2026-09-14",
  operatingHours: [10, 12, 14, 16, 18],
  totalBudgetMillionKrw: 700,
  promotionBudgetMillionKrw: 100,
  safetyBudgetMillionKrw: 90,
  targetGroups: ["families", "locals"],
  keywords: ["regional", "festival"],
  expectedCapacity: 12000,
  gridWidth: 30,
  gridHeight: 20,
  programs: [],
  facilities: [],
};

describe("PlanForm", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows the selected festival region even when it is not in the loaded TourAPI area list", () => {
    render(
      <PlanForm
        plan={plan}
        onPlanChange={vi.fn()}
        areaCodes={[{ code: "1", name: "Seoul" }]}
        isAreaLoading={false}
        isCandidateLoading={false}
        candidateCount={0}
        onOpenCandidates={vi.fn()}
      />,
    );

    const regionSelect = screen.getByDisplayValue("Gangwon-do") as HTMLSelectElement;
    expect(regionSelect.value).toBe("Gangwon-do");
  });

  it("emits changed plan values when the current region option is selected", () => {
    const handlePlanChange = vi.fn();
    render(
      <PlanForm
        plan={plan}
        onPlanChange={handlePlanChange}
        areaCodes={[{ code: "1", name: "Seoul" }]}
        isAreaLoading={false}
        isCandidateLoading={false}
        candidateCount={0}
        onOpenCandidates={vi.fn()}
      />,
    );

    fireEvent.change(screen.getAllByDisplayValue("2026-09-12")[0], {
      target: { value: "2026-09-13" },
    });

    expect(handlePlanChange).toHaveBeenCalledWith(
      expect.objectContaining({
        region: "Gangwon-do",
        startDate: "2026-09-13",
      }),
    );
  });

  it("clears a stale area when the venue address changes", () => {
    const handlePlanChange = vi.fn();
    const planWithArea: FestivalPlan = {
      ...plan,
      venueAreaSquareMeters: 229539,
      venueAreaProvenance: {
        origin: "public-data",
        sourceDataset: "전국도시공원정보표준데이터",
        sourceRecordId: "PARK-001",
        sourceParkName: "여의도공원",
        referenceAreaSquareMeters: 229539,
      },
    };
    render(
      <PlanForm
        plan={planWithArea}
        onPlanChange={handlePlanChange}
        areaCodes={[{ code: "1", name: "Seoul" }]}
        isAreaLoading={false}
        isCandidateLoading={false}
        candidateCount={0}
        onOpenCandidates={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByDisplayValue(plan.venueAddress), {
      target: { value: "새 행사장 주소" },
    });

    expect(handlePlanChange).toHaveBeenCalledWith(
      expect.objectContaining({
        venueAddress: "새 행사장 주소",
        venueAreaSquareMeters: undefined,
        venueAreaProvenance: undefined,
      }),
    );
  });
});
