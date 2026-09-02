import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import type {
  SafetyDecisionMetrics,
  SafetyDecisionProfiles,
  SimulationResult,
} from "../domain/types";
import { Heatmap } from "./Heatmap";
import { SafetyGuardAllocationPanel } from "./SafetyGuardAllocationPanel";
import { SafetyLogisticsPanel } from "./SafetyLogisticsPanel";

const simulation: SimulationResult = {
  hour: 20,
  congestionScore: 86,
  cells: Array.from({ length: 12 * 8 }, (_, index) => ({
    x: index % 12,
    y: Math.floor(index / 12),
    relativeDensityScore: 80,
    level: "high",
  })),
  bottlenecks: [
    {
      id: "bottleneck-1",
      label: "20열 2행",
      x: 20,
      y: 2,
      level: "critical",
      reason: "20:00 기준 상대 혼잡 점수 80으로 병목 가능성이 높습니다.",
    },
  ],
};

afterEach(() => {
  cleanup();
});

describe("Heatmap", () => {
  it("separates bottleneck notes from the heatmap grid", () => {
    render(<Heatmap plan={sampleFestivalPlan} simulation={simulation} />);

    expect(screen.getByRole("grid", { name: "혼잡도 시뮬레이션 격자" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "병목 후보 설명" })).toHaveClass("heatmap-bottleneck-list");
  });

  it("labels relative cell scores without a physical density unit", () => {
    render(<Heatmap plan={sampleFestivalPlan} simulation={simulation} />);

    expect(screen.getAllByLabelText(/상대 혼잡 점수 80/)).toHaveLength(96);
    expect(screen.queryByLabelText(/명\/m²/)).not.toBeInTheDocument();
  });

  it("supports time slider interaction and evidence button", () => {
    const handleSelectHour = vi.fn();
    const handleOpenEvidence = vi.fn();

    render(
      <Heatmap
        plan={sampleFestivalPlan}
        simulation={simulation}
        onSelectHour={handleSelectHour}
        onOpenEvidence={handleOpenEvidence}
      />,
    );

    const slider = screen.getByRole("slider", { name: "시뮬레이션 시간대 변경" });
    expect(slider).toBeInTheDocument();
    fireEvent.change(slider, { target: { value: "18" } });
    expect(handleSelectHour).toHaveBeenCalledWith(18);

    const evidenceBtn = screen.getByRole("button", { name: /근거 보기/ });
    fireEvent.click(evidenceBtn);
    expect(handleOpenEvidence).toHaveBeenCalledWith("peak-density");
  });
});

const densityUnavailableReason = "행사장 면적 정보가 없어 물리 밀도를 산출할 수 없습니다.";
const evacuationUnavailableReason =
  "총 출구 폭과 피난 거리 정보가 없어 피난 시간을 산출할 수 없습니다.";

const unavailableMetrics: SafetyDecisionMetrics = {
  staffing: {
    min: 20,
    recommended: 23,
    max: 27,
    unit: "people",
    confidence: "low",
    basis: "피크 방문객, 병목 후보, 상대 혼잡 점수를 사용한 사전 배치 범위",
  },
  zoneAllocations: [
    { zoneName: "무대 구역", recommendedGuards: 9, priority: "high", reason: "무대 집중" },
    { zoneName: "출입구 구역", recommendedGuards: 7, priority: "medium", reason: "출입 통제" },
    { zoneName: "병목 구역", recommendedGuards: 7, priority: "medium", reason: "병목 관리" },
  ],
  relativeCongestion: {
    status: "available",
    value: 80,
    unit: "score",
    confidence: "low",
    basis: "시뮬레이션 상대 혼잡 점수",
  },
  peakDensity: {
    status: "unavailable",
    unit: "people_per_square_meter",
    confidence: "low",
    reason: densityUnavailableReason,
  },
  medicalStaff: {
    status: "available",
    value: 4,
    unit: "people",
    confidence: "low",
    basis: "피크 방문객 기반 사전 의료 인력 추정",
  },
  ambulances: {
    status: "available",
    value: 2,
    unit: "people",
    confidence: "low",
    basis: "의료 인력 기반 구급차 배치 추정",
  },
  evacuationTime: {
    status: "unavailable",
    unit: "seconds",
    confidence: "low",
    reason: evacuationUnavailableReason,
  },
};

const profiles: SafetyDecisionProfiles = {
  summary: unavailableMetrics,
  weekday: {
    ...unavailableMetrics,
    staffing: { ...unavailableMetrics.staffing, recommended: 18 },
  },
  weekend: {
    ...unavailableMetrics,
    staffing: { ...unavailableMetrics.staffing, recommended: 31 },
  },
};

describe("safety decision panels", () => {
  it("shows the same canonical recommendation in summary and default detail views", () => {
    render(
      <>
        <SafetyLogisticsPanel metrics={profiles.summary} onOpenEvidence={vi.fn()} />
        <SafetyGuardAllocationPanel profiles={profiles} />
      </>,
    );

    expect(screen.getAllByText("23명")).toHaveLength(2);
  });

  it("changes the detailed recommendation only after an explicit day tab selection", () => {
    render(<SafetyGuardAllocationPanel profiles={profiles} />);

    expect(screen.getByText("23명")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /평일 평균/ }));
    expect(screen.getByText("18명")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /주말 피크/ }));
    expect(screen.getByText("31명")).toBeInTheDocument();
  });

  it("renders unavailable physical values with their reasons", () => {
    render(
      <>
        <SafetyLogisticsPanel metrics={profiles.summary} onOpenEvidence={vi.fn()} />
        <SafetyGuardAllocationPanel profiles={profiles} />
      </>,
    );

    expect(screen.getAllByText("산출 불가")).toHaveLength(2);
    expect(screen.getByText(densityUnavailableReason)).toBeInTheDocument();
    expect(screen.getByText(evacuationUnavailableReason)).toBeInTheDocument();
  });
});
