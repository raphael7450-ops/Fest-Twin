import { describe, expect, it } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import type { ForecastResult, SimulationResult } from "../domain/types";
import {
  calculateInfrastructureCapacityForecast,
  calculateSafetyGuardAllocationForecast,
} from "./capacityAndSafetyForecast";

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

const dummySimulation: SimulationResult = {
  hour: 20,
  congestionScore: 68,
  bottlenecks: [],
  cells: [{ x: 1, y: 1, density: 4.5, level: "critical" }],
};

describe("capacityAndSafetyForecast - Model 1 & Model 2 Engine", () => {
  it("[Model 1] calculates infrastructure capacity, parking fill time, restroom deficit, and waste tons", () => {
    const capacity = calculateInfrastructureCapacityForecast(sampleFestivalPlan, dummyForecast);

    expect(capacity.estimatedVehicles).toBeGreaterThan(0);
    expect(capacity.providedParkingCapacity).toBeGreaterThan(0);
    expect(capacity.parkingPeakOccupancyRate).toBeGreaterThan(0);
    expect(capacity.parkingFillTime).toContain("만차 예상");
    expect(capacity.requiredRestroomCount).toBeGreaterThan(0);
    expect(capacity.restroomDeficitCount).toBeGreaterThanOrEqual(0);
    expect(capacity.estimatedRestroomWaitMinutes).toBeGreaterThan(0);
    expect(capacity.totalWasteTons).toBe(20.88);
    expect(capacity.generalWasteTons).toBe(12.53);
    expect(capacity.recyclableWasteTons).toBe(8.35);
  });

  it("[Model 2] calculates zone safety guard allocations, medical incidents, and evacuation golden time", () => {
    const safety = calculateSafetyGuardAllocationForecast(
      sampleFestivalPlan,
      dummyForecast,
      dummySimulation,
    );

    expect(safety.totalRecommendedGuards).toBeGreaterThan(30);
    expect(safety.zoneAllocations).toHaveLength(3);
    expect(safety.expectedMedicalIncidentsPerHour).toBeGreaterThan(0);
    expect(safety.recommendedMedicalStaff).toBeGreaterThanOrEqual(2);
    expect(safety.recommendedAmbulances).toBeGreaterThanOrEqual(1);
    expect(safety.evacuationGoldenTimeSeconds).toBeGreaterThan(180);
    expect(["양호", "주의", "경고"]).toContain(safety.evacuationStatus);
  });
});
