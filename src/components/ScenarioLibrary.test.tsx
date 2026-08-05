import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import type { FestivalPlan } from "../domain/types";
import { ScenarioLibrary } from "./ScenarioLibrary";

describe("ScenarioLibrary", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves and restores the current scenario", () => {
    const onLoadScenario = vi.fn();
    const plan: FestivalPlan = {
      ...sampleFestivalPlan,
      name: "예산 확장안",
      totalBudgetMillionKrw: 1200,
      expectedCapacity: 30000,
    };

    render(
      <ScenarioLibrary
        plan={plan}
        selectedHour={20}
        onLoadScenario={onLoadScenario}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "시나리오 저장" }));
    fireEvent.click(screen.getByRole("button", { name: /예산 확장안/ }));

    expect(onLoadScenario).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: expect.objectContaining({
          name: "예산 확장안",
          totalBudgetMillionKrw: 1200,
          expectedCapacity: 30000,
        }),
        selectedHour: 20,
      }),
    );
  });

  it("enables A/B comparison when 2 scenarios are selected", () => {
    const onLoadScenario = vi.fn();
    const planA: FestivalPlan = {
      ...sampleFestivalPlan,
      name: "시나리오 A",
      totalBudgetMillionKrw: 800,
    };
    const planB: FestivalPlan = {
      ...sampleFestivalPlan,
      name: "시나리오 B",
      totalBudgetMillionKrw: 1200,
    };

    const { rerender } = render(
      <ScenarioLibrary plan={planA} selectedHour={18} onLoadScenario={onLoadScenario} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "시나리오 저장" }));

    rerender(<ScenarioLibrary plan={planB} selectedHour={20} onLoadScenario={onLoadScenario} />);
    fireEvent.click(screen.getByRole("button", { name: "시나리오 저장" }));

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBeGreaterThanOrEqual(2);

    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);

    const compareBtn = screen.getByRole("button", { name: /시나리오 A\/B 비교/ });
    expect(compareBtn).not.toBeDisabled();

    fireEvent.click(compareBtn);

    expect(screen.getByText(/시나리오 A\/B 병렬 대조 비교/)).toBeInTheDocument();
    expect(screen.getByText(/차이값 \(Diff\)/)).toBeInTheDocument();
  });
});
