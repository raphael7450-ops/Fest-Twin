import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import type { FestivalPlan } from "../domain/types";
import { ScenarioLibrary } from "./ScenarioLibrary";

describe("ScenarioLibrary", () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("reports local-only saving and refuses a misleading share link when the server fails", async () => {
    const request = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    try {
      render(<ScenarioLibrary plan={sampleFestivalPlan} selectedHour={20} onLoadScenario={vi.fn()} />);
      fireEvent.click(screen.getByRole("button", { name: "시나리오 저장" }));
      await waitFor(() => expect(screen.getByText(/이 브라우저에만 저장/)).toBeInTheDocument());
      fireEvent.click(screen.getByRole("button", { name: /공유 링크/ }));
      expect(screen.getByText(/서버 저장 후 공유/)).toBeInTheDocument();
    } finally { request.mockRestore(); }
  });

  it("keeps server entries visible after clearing browser copies and saving again", async () => {
    const request = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ scenarios: [{ id: "remote", share_token: "token", title: "remote retained plan", parameters: { plan: sampleFestivalPlan } }] })));
    try {
      render(<ScenarioLibrary plan={sampleFestivalPlan} selectedHour={20} onLoadScenario={vi.fn()} />);
      await screen.findByRole("button", { name: /remote retained plan/ });
      fireEvent.click(screen.getByRole("button", { name: "브라우저 저장본 지우기" }));
      request.mockRejectedValue(new Error("offline"));
      fireEvent.click(screen.getByRole("button", { name: "시나리오 저장" }));
      await screen.findByText(/이 브라우저에만 저장/);
      expect(screen.getByRole("button", { name: /remote retained plan/ })).toBeInTheDocument();
    } finally { request.mockRestore(); }
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

    const saveBtns = screen.getAllByRole("button", { name: "시나리오 저장" });
    fireEvent.click(saveBtns[0]);

    rerender(<ScenarioLibrary plan={planB} selectedHour={20} onLoadScenario={onLoadScenario} />);
    const saveBtns2 = screen.getAllByRole("button", { name: "시나리오 저장" });
    fireEvent.click(saveBtns2[saveBtns2.length - 1]);

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBeGreaterThanOrEqual(2);

    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);

    const compareBtn = screen.getAllByRole("button", { name: /시나리오 A\/B 비교/ })[0];
    expect(compareBtn).not.toBeDisabled();

    fireEvent.click(compareBtn);

    expect(screen.getByText(/시나리오 A\/B 병렬 대조 비교/)).toBeInTheDocument();
    expect(screen.getByText(/차이값 \(Diff\)/)).toBeInTheDocument();
  });
});
