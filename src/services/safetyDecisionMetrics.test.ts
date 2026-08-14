import { describe, expect, it } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import type { ForecastResult, SimulationResult } from "../domain/types";
import { createSafetyDecisionProfiles } from "./safetyDecisionMetrics";

const forecast: ForecastResult = {
  expectedVisitors: 36000,
  visitorsByHour: [
    { hour: 18, visitors: 12000 },
    { hour: 20, visitors: 16400 },
  ],
  peakHour: 20,
  successScore: 84,
  confidence: "medium",
  reasons: [],
  dayTypeProfiles: {
    summary: {
      dayType: "summary",
      label: "전체 평균",
      expectedDailyVisitors: 36000,
      peakHour: 20,
      peakVisitors: 16400,
      visitorsByHour: [{ hour: 20, visitors: 16400 }],
      dayRatio: 1,
    },
    weekday: {
      dayType: "weekday",
      label: "평일 평균",
      expectedDailyVisitors: 28000,
      peakHour: 20,
      peakVisitors: 12000,
      visitorsByHour: [{ hour: 20, visitors: 12000 }],
      dayRatio: 0.8,
    },
    weekend: {
      dayType: "weekend",
      label: "주말 피크",
      expectedDailyVisitors: 48000,
      peakHour: 20,
      peakVisitors: 22000,
      visitorsByHour: [{ hour: 20, visitors: 22000 }],
      dayRatio: 1.4,
    },
  },
};

const simulation: SimulationResult = {
  hour: 20,
  congestionScore: 140,
  cells: [
    { x: 0, y: 0, relativeDensityScore: 100, level: "critical" },
    { x: 1, y: 0, relativeDensityScore: 72, level: "high" },
  ],
  bottlenecks: [
    {
      id: "bn-1",
      label: "1열 1행",
      x: 0,
      y: 0,
      level: "critical",
      reason: "상대 혼잡 점수가 높습니다.",
    },
    {
      id: "bn-2",
      label: "2열 1행",
      x: 1,
      y: 0,
      level: "high",
      reason: "상대 혼잡 점수가 높습니다.",
    },
  ],
};

describe("createSafetyDecisionProfiles", () => {
  it("returns a bounded staffing range in people", () => {
    const { staffing } = createSafetyDecisionProfiles(
      sampleFestivalPlan,
      forecast,
      simulation,
    ).summary;

    expect(staffing).toEqual({
      min: 22,
      recommended: 26,
      max: 30,
      unit: "people",
      confidence: "low",
      basis: "피크 방문객, 병목 후보, 상대 혼잡 점수를 사용한 사전 배치 범위",
    });
    expect(staffing.recommended).toBeGreaterThanOrEqual(staffing.min);
    expect(staffing.recommended).toBeLessThanOrEqual(staffing.max);
  });

  it("marks physical density and evacuation unavailable without venue geometry", () => {
    const summary = createSafetyDecisionProfiles(
      {
        ...sampleFestivalPlan,
        venueAreaSquareMeters: undefined,
        totalExitWidthMeters: undefined,
        evacuationDistanceMeters: undefined,
      },
      forecast,
      simulation,
    ).summary;

    expect(summary.peakDensity).toMatchObject({
      status: "unavailable",
      unit: "people_per_square_meter",
      confidence: "low",
    });
    expect(summary.peakDensity).toHaveProperty("reason", expect.stringContaining("행사장 면적"));
    expect(summary.evacuationTime).toMatchObject({
      status: "unavailable",
      unit: "seconds",
      confidence: "low",
    });
    expect(summary.evacuationTime).toHaveProperty("reason", expect.stringContaining("출구 폭"));
    expect(summary.evacuationTime).toHaveProperty("reason", expect.stringContaining("피난 거리"));
  });

  it("uses venue area, exit flow, and walking assumptions exactly when geometry is present", () => {
    const summary = createSafetyDecisionProfiles(
      {
        ...sampleFestivalPlan,
        venueAreaSquareMeters: 4000,
        totalExitWidthMeters: 5,
        evacuationDistanceMeters: 120,
      },
      forecast,
      simulation,
    ).summary;

    expect(summary.peakDensity).toMatchObject({
      status: "available",
      value: 4.1,
      unit: "people_per_square_meter",
      confidence: "low",
      basis: "피크 방문객 16,400명 / 행사장 면적 4,000m²",
    });
    expect(summary.evacuationTime.status).toBe("available");
    if (summary.evacuationTime.status === "available") {
      expect(summary.evacuationTime.value).toBeCloseTo(16400 / (5 * 1.3) + 120 / 1.0);
      expect(summary.evacuationTime.basis).toContain("출구 폭 1m당 초당 1.3명");
      expect(summary.evacuationTime.basis).toContain("보행 속도 초당 1.0m");
    }
  });

  it("names the specific missing evacuation input", () => {
    const evacuationTime = createSafetyDecisionProfiles(
      {
        ...sampleFestivalPlan,
        totalExitWidthMeters: 5,
        evacuationDistanceMeters: undefined,
      },
      forecast,
      simulation,
    ).summary.evacuationTime;

    expect(evacuationTime).toEqual({
      status: "unavailable",
      unit: "seconds",
      confidence: "low",
      reason: "피난 거리 정보가 없어 피난 시간을 산출할 수 없습니다.",
    });
  });

  it("reports relative congestion as a score capped at 100", () => {
    const relativeCongestion = createSafetyDecisionProfiles(
      sampleFestivalPlan,
      forecast,
      simulation,
    ).summary.relativeCongestion;

    expect(relativeCongestion).toMatchObject({
      status: "available",
      value: 100,
      unit: "score",
    });
  });

  it("rounds normalized zone allocations to the exact recommendation total", () => {
    const summary = createSafetyDecisionProfiles(
      sampleFestivalPlan,
      forecast,
      simulation,
    ).summary;

    expect(summary.zoneAllocations).toHaveLength(3);
    expect(summary.zoneAllocations.map((zone) => zone.zoneName)).toEqual([
      "무대 구역",
      "출입구 구역",
      "병목 구역",
    ]);
    expect(
      summary.zoneAllocations.reduce((total, zone) => total + zone.recommendedGuards, 0),
    ).toBe(summary.staffing.recommended);
  });

  it("uses explicit weekday and weekend peak visitor profiles", () => {
    const profiles = createSafetyDecisionProfiles(
      sampleFestivalPlan,
      forecast,
      simulation,
    );

    expect(profiles.weekday.staffing.recommended).toBeLessThan(
      profiles.summary.staffing.recommended,
    );
    expect(profiles.weekend.staffing.recommended).toBeGreaterThan(
      profiles.summary.staffing.recommended,
    );
  });
});
