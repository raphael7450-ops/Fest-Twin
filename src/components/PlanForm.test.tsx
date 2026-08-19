import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DwellProfile, FestivalPlan } from "../domain/types";
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

const sampleDwellProfile: DwellProfile = {
  kind: "daytime-general",
  label: "주간 종합형",
  averageMinutes: 150,
  sourceType: "type-default",
  sourceName: "축제 유형별 기본 체류 프로필",
  confidence: "low",
  retentionRates: [1, 0.82, 0.55, 0.25, 0.07, 0],
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
        dwellProfile={sampleDwellProfile}
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
        dwellProfile={sampleDwellProfile}
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
        dwellProfile={sampleDwellProfile}
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

  it("shows the automatic dwell profile label", () => {
    render(
      <PlanForm
        plan={plan}
        onPlanChange={vi.fn()}
        areaCodes={[]}
        isAreaLoading={false}
        isCandidateLoading={false}
        candidateCount={0}
        onOpenCandidates={vi.fn()}
        dwellProfile={sampleDwellProfile}
      />,
    );

    expect(screen.getByText("주간 종합형")).toBeInTheDocument();
  });

  it("emits averageDwellMinutes when the user enters a dwell override", () => {
    const handlePlanChange = vi.fn();
    render(
      <PlanForm
        plan={plan}
        onPlanChange={handlePlanChange}
        areaCodes={[]}
        isAreaLoading={false}
        isCandidateLoading={false}
        candidateCount={0}
        onOpenCandidates={vi.fn()}
        dwellProfile={sampleDwellProfile}
      />,
    );

    const dwellInput = screen.getByLabelText("평균 체류시간 (분)");
    fireEvent.change(dwellInput, { target: { value: "360" } });

    expect(handlePlanChange).toHaveBeenCalledWith(
      expect.objectContaining({ averageDwellMinutes: 360 }),
    );
  });

  it("emits parkingCapacityVehicles and restroomFixtureCount when filled in", () => {
    const handlePlanChange = vi.fn();
    render(
      <PlanForm
        plan={plan}
        onPlanChange={handlePlanChange}
        areaCodes={[]}
        isAreaLoading={false}
        isCandidateLoading={false}
        candidateCount={0}
        onOpenCandidates={vi.fn()}
        dwellProfile={sampleDwellProfile}
      />,
    );

    fireEvent.change(screen.getByLabelText("주차 수용 차량 수"), { target: { value: "1500" } });
    expect(handlePlanChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ parkingCapacityVehicles: 1500 }),
    );

    fireEvent.change(screen.getByLabelText("화장실 변기 수"), { target: { value: "80" } });
    expect(handlePlanChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ restroomFixtureCount: 80 }),
    );
  });

  it("emits undefined fields when the user clicks the restore button", () => {
    const handlePlanChange = vi.fn();
    const planWithOverrides: FestivalPlan = {
      ...plan,
      averageDwellMinutes: 360,
      parkingCapacityVehicles: 1500,
      restroomFixtureCount: 80,
    };
    render(
      <PlanForm
        plan={planWithOverrides}
        onPlanChange={handlePlanChange}
        areaCodes={[]}
        isAreaLoading={false}
        isCandidateLoading={false}
        candidateCount={0}
        onOpenCandidates={vi.fn()}
        dwellProfile={sampleDwellProfile}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "자동값 복원" }));

    expect(handlePlanChange).toHaveBeenCalledWith(
      expect.objectContaining({
        averageDwellMinutes: undefined,
        parkingCapacityVehicles: undefined,
        restroomFixtureCount: undefined,
      }),
    );
  });
});
