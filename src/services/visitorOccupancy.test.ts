import { describe, expect, it } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import {
  buildVisitorFlow,
  occupancySeries,
  selectDwellProfile,
  summarizeVisitorFlow,
} from "./visitorOccupancy";
import type { ForecastResult } from "../domain/types";

describe("visitor occupancy dwell profiles", () => {
  it("classifies fireworks plans as long-dwell performance profiles", () => {
    const profile = selectDwellProfile({
      ...sampleFestivalPlan,
      name: "서울 불꽃축제",
      keywords: ["불꽃", "야간관광"],
    });

    expect(profile).toMatchObject({
      kind: "fireworks-performance",
      label: "불꽃·대형 공연형",
      averageMinutes: 270,
      sourceType: "type-default",
      sourceName: "축제 유형별 기본 체류 프로필",
      confidence: "low",
      retentionRates: [1, 0.98, 0.94, 0.86, 0.68, 0.38, 0.12, 0],
    });
  });

  it("uses a valid user dwell override and rejects out-of-range values", () => {
    const fireworksPlan = {
      ...sampleFestivalPlan,
      name: "서울 불꽃축제",
      keywords: ["불꽃", "야간관광"],
    };

    expect(selectDwellProfile({ ...fireworksPlan, averageDwellMinutes: 360 }))
      .toMatchObject({
        averageMinutes: 360,
        sourceType: "user-adjusted",
        sourceName: "유형 기본값 참고 후 사용자 조정",
        confidence: "low",
      });
    expect(selectDwellProfile({ ...fireworksPlan, averageDwellMinutes: 900 }).averageMinutes)
      .toBe(270);
  });

  it("uses only similar festival name and type as additional classification evidence", () => {
    const profile = selectDwellProfile(
      {
        ...sampleFestivalPlan,
        name: "도시 축제",
        keywords: [],
        programs: [
          { id: "program", name: "일반 프로그램", startHour: 10, endHour: 12, expectedDraw: 50 },
        ],
      },
      {
        status: "sample-fallback",
        similarFestivalBaselines: [
          {
            id: "similar",
            name: "불꽃 행사",
            region: "서울",
            type: "대형 공연",
            periodLabel: "여름",
            similarityScore: 90,
            sourceName: "sample",
          },
        ],
        sourceDetails: [],
      },
    );

    expect(profile.kind).toBe("fireworks-performance");
    expect(profile.sourceType).toBe("type-default");
    expect(profile.confidence).toBe("low");
  });

  it("conserves arrivals across occupancy and departures", () => {
    const flow = buildVisitorFlow(
      [{ hour: 18, visitors: 100 }, { hour: 19, visitors: 100 }, { hour: 20, visitors: 100 }],
      selectDwellProfile({ ...sampleFestivalPlan, keywords: ["먹거리"] }),
    );

    expect(flow.at(-1)?.cumulativeArrivals).toBe(300);
    expect(flow.every((point) => point.occupancy >= 0 && point.departures >= 0)).toBe(true);
  });

  it("produces a larger occupancy peak for a longer dwell profile", () => {
    const arrivals = [10, 11, 12, 13].map((hour) => ({ hour, visitors: 1_000 }));
    const neutralPrograms = [
      { id: "program", name: "일반 프로그램", startHour: 10, endHour: 12, expectedDraw: 50 },
    ];
    const shortProfile = selectDwellProfile({
      ...sampleFestivalPlan,
      name: "거리 퍼레이드",
      keywords: ["퍼레이드"],
      programs: neutralPrograms,
    });
    const longProfile = selectDwellProfile({
      ...sampleFestivalPlan,
      name: "불꽃 공연",
      keywords: ["불꽃"],
      programs: neutralPrograms,
    });

    const shortPeak = Math.max(...buildVisitorFlow(arrivals, shortProfile).map((point) => point.occupancy));
    const longPeak = Math.max(...buildVisitorFlow(arrivals, longProfile).map((point) => point.occupancy));

    expect(longPeak).toBeGreaterThan(shortPeak);
  });

  it("releases all daytime-general visitors after the final retention sample", () => {
    const profile = selectDwellProfile({
      ...sampleFestivalPlan,
      name: "일반 축제",
      keywords: ["문화"],
      programs: [
        { id: "program", name: "일반 프로그램", startHour: 10, endHour: 12, expectedDraw: 50 },
      ],
    });
    const profileWithImplicitTerminalZero = {
      ...profile,
      retentionRates: profile.retentionRates.slice(0, -1),
    };
    const flow = buildVisitorFlow([{ hour: 10, visitors: 100 }], profileWithImplicitTerminalZero);

    expect(profile.kind).toBe("daytime-general");
    expect(flow.at(-1)?.occupancy).toBe(0);
    expect(flow.reduce((total, point) => total + point.departures, 0)).toBe(100);
  });

  it("retains fireworks visitors until the anchor and releases them after it", () => {
    const arrivals = [18, 19, 20, 21].map((hour) => ({ hour, visitors: 1_000 }));
    const profile = selectDwellProfile({
      ...sampleFestivalPlan,
      name: "불꽃 공연",
      keywords: ["불꽃"],
    });
    const flow = buildVisitorFlow(arrivals, profile, 21);
    const at20 = flow.find((point) => point.hour === 20)!;
    const at21 = flow.find((point) => point.hour === 21)!;
    const at22 = flow.find((point) => point.hour === 22)!;

    expect(at21.occupancy).toBeGreaterThan(at20.arrivals);
    expect(at22.departures).toBeGreaterThan(at20.departures);
  });

  it("prefers occupancy in the compatibility accessor and falls back to visitors", () => {
    const visitors = [{ hour: 18, visitors: 100 }];
    const occupancy = [{ hour: 18, visitors: 150 }];

    expect(occupancySeries({ visitorsByHour: visitors, occupancyByHour: occupancy })).toBe(occupancy);
    expect(occupancySeries({ visitorsByHour: visitors })).toBe(visitors);
  });

  it("summarizes visitor flow peaks across arrivals, occupancy, and departures", () => {
    const forecast: ForecastResult = {
      expectedVisitors: 1000,
      peakHour: 20,
      confidence: "medium",
      successScore: 0,
      reasons: [],
      visitorsByHour: [{ hour: 18, visitors: 100 }, { hour: 20, visitors: 300 }],
      arrivalsByHour: [{ hour: 18, visitors: 200 }, { hour: 20, visitors: 100 }],
      occupancyByHour: [{ hour: 18, visitors: 200 }, { hour: 20, visitors: 500 }],
      departuresByHour: [{ hour: 18, visitors: 50 }, { hour: 22, visitors: 400 }],
    };

    const summary = summarizeVisitorFlow(forecast);
    expect(summary).toEqual({
      peakArrivals: 200,
      peakArrivalHour: 18,
      peakOccupancy: 500,
      peakOccupancyHour: 20,
      peakDepartures: 400,
      peakDepartureHour: 22,
    });
  });
});
