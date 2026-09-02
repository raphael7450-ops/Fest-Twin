import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sampleFestivalPlan } from "../src/data/sampleFestivalPlan";
import { ScenarioComparisonModal } from "../src/components/ScenarioComparisonModal";
import type { SavedScenario } from "../src/services/scenarioStorage";

const scenarioA: SavedScenario = {
  id: "scenario-a",
  name: "기본 기획안 (Plan A)",
  plan: {
    ...sampleFestivalPlan,
    name: "기본 기획안 (Plan A)",
    totalBudgetMillionKrw: 800,
    expectedCapacity: 20000,
    venueAreaSquareMeters: 5000,
    totalExitWidthMeters: 6,
    evacuationDistanceMeters: 100,
  },
  selectedHour: 18,
  createdAt: "2026-09-02T10:00:00Z",
};

const scenarioB: SavedScenario = {
  id: "scenario-b",
  name: "안전 보강안 (Plan B)",
  plan: {
    ...sampleFestivalPlan,
    name: "안전 보강안 (Plan B)",
    totalBudgetMillionKrw: 1200,
    expectedCapacity: 35000,
    venueAreaSquareMeters: 8000,
    totalExitWidthMeters: 12,
    evacuationDistanceMeters: 80,
  },
  selectedHour: 20,
  createdAt: "2026-09-02T11:00:00Z",
};

describe("ScenarioComparisonModal", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders scenario differential matrix and compares key indicators", () => {
    const onClose = vi.fn();
    const onApply = vi.fn();

    render(
      <ScenarioComparisonModal
        scenarioA={scenarioA}
        scenarioB={scenarioB}
        isOpen={true}
        onClose={onClose}
        onApplyScenario={onApply}
      />,
    );

    expect(screen.getByText("시나리오 A/B 병렬 대조 비교 및 개선 효과 검증")).toBeInTheDocument();
    expect(screen.getByText("기본 기획안 (Plan A)")).toBeInTheDocument();
    expect(screen.getByText("안전 보강안 (Plan B)")).toBeInTheDocument();
    expect(screen.getByText("주요 안전·수요·재정 지표 비교 (Differential Matrix)")).toBeInTheDocument();
    expect(screen.getByText("차이값 (Diff)")).toBeInTheDocument();
    expect(screen.getByText("비상 피난 소요시간")).toBeInTheDocument();
    expect(screen.getByText("최고 인원 밀집도")).toBeInTheDocument();
    expect(screen.getByText("권고 안전관리 인력")).toBeInTheDocument();
  });

  it("triggers apply callback when Apply Plan B button is clicked", () => {
    const onClose = vi.fn();
    const onApply = vi.fn();

    render(
      <ScenarioComparisonModal
        scenarioA={scenarioA}
        scenarioB={scenarioB}
        isOpen={true}
        onClose={onClose}
        onApplyScenario={onApply}
      />,
    );

    const applyButton = screen.getByRole("button", { name: "보강안 (Plan B) 대시보드에 적용하기" });
    fireEvent.click(applyButton);

    expect(onApply).toHaveBeenCalledWith(scenarioB);
    expect(onClose).toHaveBeenCalled();
  });
});
