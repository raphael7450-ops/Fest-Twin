import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import type { SimulationResult } from "../domain/types";
import { Heatmap } from "./Heatmap";

const simulation: SimulationResult = {
  hour: 20,
  congestionScore: 86,
  cells: Array.from({ length: 12 * 8 }, (_, index) => ({
    x: index % 12,
    y: Math.floor(index / 12),
    density: 80,
    level: "high",
  })),
  bottlenecks: [
    {
      id: "bottleneck-1",
      label: "20열 2행",
      x: 20,
      y: 2,
      level: "critical",
      reason: "20:00 기준 밀집도 160로 병목 가능성이 높습니다.",
    },
  ],
};

describe("Heatmap", () => {
  it("separates bottleneck notes from the heatmap grid", () => {
    render(<Heatmap plan={sampleFestivalPlan} simulation={simulation} />);

    expect(screen.getByRole("grid", { name: "혼잡도 시뮬레이션 격자" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "병목 후보 설명" })).toHaveClass("heatmap-bottleneck-list");
  });
});
