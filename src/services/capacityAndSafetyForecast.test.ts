import { describe, expect, it } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import type { ForecastResult } from "../domain/types";
import { calculateInfrastructureCapacityForecast } from "./capacityAndSafetyForecast";

const arrivalsByHour = [
  { hour: 18, visitors: 4000 },
  { hour: 20, visitors: 2000 },
  { hour: 22, visitors: 0 },
];

const dwellForecast: ForecastResult = {
  expectedVisitors: 6000,
  visitorsByHour: arrivalsByHour,
  arrivalsByHour,
  occupancyByHour: [
    { hour: 18, visitors: 4000 },
    { hour: 20, visitors: 6000 },
    { hour: 22, visitors: 1000 },
  ],
  departuresByHour: [
    { hour: 18, visitors: 0 },
    { hour: 20, visitors: 0 },
    { hour: 22, visitors: 5000 },
  ],
  cumulativeArrivalsByHour: [
    { hour: 18, visitors: 4000 },
    { hour: 20, visitors: 6000 },
    { hour: 22, visitors: 6000 },
  ],
  peakHour: 20,
  successScore: 88,
  confidence: "high",
  reasons: [],
};

const arrivalOnlyForecast: ForecastResult = {
  expectedVisitors: 6000,
  visitorsByHour: arrivalsByHour,
  peakHour: 18,
  successScore: 88,
  confidence: "high",
  reasons: [],
};

const dummyForecast: ForecastResult = {
  expectedVisitors: 52200,
  visitorsByHour: [
    { hour: 18, visitors: 15000 },
    { hour: 20, visitors: 22000 },
  ],
  peakHour: 20,
  successScore: 88,
  confidence: "high",
  reasons: [],
};

describe("capacityAndSafetyForecast - Model 1 Engine", () => {
  it("requires explicit parking and restroom inputs while retaining occupancy-based recommendations", () => {
    const capacity = calculateInfrastructureCapacityForecast(
      {
        ...sampleFestivalPlan,
        parkingCapacityVehicles: undefined,
        restroomFixtureCount: undefined,
      },
      dwellForecast,
    );

    expect(capacity).toMatchObject({
      parkingStatus: "input-required",
      restroomStatus: "input-required",
      estimatedVehicles: 432,
      recommendedParkingCapacity: 432,
      requiredRestroomCount: 24,
      recommendedRestroomCount: 24,
      peakDepartureHour: 22,
      peakDepartures: 5000,
    });
    expect(capacity.parkingPeakOccupancyRate).toBeUndefined();
    expect(capacity.restroomDeficitCount).toBeUndefined();
    expect(capacity.estimatedRestroomWaitMinutes).toBeUndefined();
    expect(capacity.totalWasteTons).toBe(2.4);
    expect(capacity.generalWasteTons).toBe(1.44);
    expect(capacity.recyclableWasteTons).toBe(0.96);
  });

  it("uses concurrent occupancy to calculate parking demand and the first fill hour", () => {
    const plan = {
      ...sampleFestivalPlan,
      parkingCapacityVehicles: 300,
      restroomFixtureCount: 20,
    };
    const dwellCapacity = calculateInfrastructureCapacityForecast(plan, dwellForecast);
    const arrivalOnlyCapacity = calculateInfrastructureCapacityForecast(plan, arrivalOnlyForecast);

    expect(dwellCapacity.estimatedVehicles).toBe(432);
    expect(dwellCapacity.estimatedVehicles).toBeGreaterThan(arrivalOnlyCapacity.estimatedVehicles);
    expect(dwellCapacity.parkingPeakOccupancyRate).toBe(144);
    expect(dwellCapacity.parkingFillTime).toContain("20:00");
    expect(dwellCapacity.requiredRestroomCount).toBe(24);
    expect(dwellCapacity.restroomDeficitCount).toBe(4);
    expect(dwellCapacity.estimatedRestroomWaitMinutes).toBe(8);
  });

  it("uses supplied facility counts and preserves the no-fill representation", () => {
    const capacity = calculateInfrastructureCapacityForecast(
      {
        ...sampleFestivalPlan,
        parkingCapacityVehicles: 800,
        restroomFixtureCount: 40,
      },
      dwellForecast,
    );

    expect(capacity).toMatchObject({
      parkingStatus: "available",
      restroomStatus: "available",
      providedParkingCapacity: 800,
      providedRestroomCount: 40,
      recommendedParkingCapacity: 432,
      recommendedRestroomCount: 24,
      peakDepartureHour: 22,
      peakDepartures: 5000,
    });
    expect(capacity.parkingPeakOccupancyRate).toBe(54);
    expect(capacity.parkingFillTime).toBe("여유 (만차 우려 없음)");
    expect(capacity.restroomDeficitCount).toBe(0);
    expect(capacity.estimatedRestroomWaitMinutes).toBe(3);
  });

  it("reports zero departures at the existing peak hour for legacy forecasts", () => {
    const capacity = calculateInfrastructureCapacityForecast(
      {
        ...sampleFestivalPlan,
        parkingCapacityVehicles: 800,
        restroomFixtureCount: 40,
      },
      arrivalOnlyForecast,
    );

    expect(capacity).toMatchObject({
      peakDepartureHour: 18,
      peakDepartures: 0,
    });
  });

  it("uses the earlier hour when peak departures tie", () => {
    const capacity = calculateInfrastructureCapacityForecast(
      {
        ...sampleFestivalPlan,
        parkingCapacityVehicles: 800,
        restroomFixtureCount: 40,
      },
      {
        ...dwellForecast,
        departuresByHour: [
          { hour: 18, visitors: 0 },
          { hour: 20, visitors: 2500 },
          { hour: 22, visitors: 2500 },
        ],
      },
    );

    expect(capacity).toMatchObject({
      peakDepartureHour: 20,
      peakDepartures: 2500,
    });
  });

  it("calculates lower weekday and higher weekend figures when DayTypeProfiles are provided", () => {
    const weekdayProfile = {
      dayType: "weekday" as const,
      label: "평일 평균",
      expectedDailyVisitors: 30000,
      peakHour: 20,
      peakVisitors: 12000,
      visitorsByHour: [{ hour: 20, visitors: 12000 }],
      dayRatio: 0.8,
    };

    const weekendProfile = {
      dayType: "weekend" as const,
      label: "주말 피크",
      expectedDailyVisitors: 60000,
      peakHour: 20,
      peakVisitors: 25000,
      visitorsByHour: [{ hour: 20, visitors: 25000 }],
      dayRatio: 1.4,
    };

    const weekdayCapacity = calculateInfrastructureCapacityForecast(
      sampleFestivalPlan,
      dummyForecast,
      weekdayProfile,
    );
    const weekendCapacity = calculateInfrastructureCapacityForecast(
      sampleFestivalPlan,
      dummyForecast,
      weekendProfile,
    );

    expect(weekendCapacity.estimatedVehicles).toBeGreaterThan(weekdayCapacity.estimatedVehicles);
    expect(weekendCapacity.totalWasteTons).toBeGreaterThan(weekdayCapacity.totalWasteTons);

  });
});
