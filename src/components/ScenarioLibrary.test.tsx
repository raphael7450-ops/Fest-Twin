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
});
