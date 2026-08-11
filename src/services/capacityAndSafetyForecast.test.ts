import { describe, expect, it } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import type { ForecastResult } from "../domain/types";
import { calculateInfrastructureCapacityForecast } from "./capacityAndSafetyForecast";

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
  it("[Model 1] calculates infrastructure capacity, parking fill time, restroom deficit, and waste tons", () => {
    const capacity = calculateInfrastructureCapacityForecast(sampleFestivalPlan, dummyForecast);

    expect(capacity.estimatedVehicles).toBeGreaterThan(0);
    expect(capacity.providedParkingCapacity).toBeGreaterThan(0);
    expect(capacity.parkingPeakOccupancyRate).toBeGreaterThan(0);
    expect(capacity.parkingFillTime.length).toBeGreaterThan(0);
    expect(capacity.requiredRestroomCount).toBeGreaterThan(0);
    expect(capacity.restroomDeficitCount).toBeGreaterThanOrEqual(0);
    expect(capacity.estimatedRestroomWaitMinutes).toBeGreaterThan(0);
    expect(capacity.totalWasteTons).toBe(20.88);
    expect(capacity.generalWasteTons).toBe(12.53);
    expect(capacity.recyclableWasteTons).toBe(8.35);
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
