/**
 * 파일 : src/services/capacityAndSafetyForecast.ts
 * 내용 : [모델 1] 인프라 수용성/대기시간 예측 엔진
 * 수정 : 2026-08-11. 안전 의사결정 계산을 전용 서비스로 통합
 */

import type {
  DayTypeProfile,
  FestivalPlan,
  ForecastResult,
  InfrastructureCapacityForecast,
} from "../domain/types";
import { occupancySeries } from "./visitorOccupancy";

const NO_PARKING_FILL_TIME = "여유 (만차 우려 없음)";

function providedCapacity(value: number | undefined) {
  return Number.isFinite(value) && (value ?? 0) > 0 ? value : undefined;
}

function peakOccupancy(series: Array<{ hour: number; visitors: number }>) {
  return Math.max(
    ...series.map((point) => (Number.isFinite(point.visitors) ? point.visitors : 0)),
    0,
  );
}

function peakDeparture(
  departures: Array<{ hour: number; visitors: number }> | undefined,
  fallbackHour: number,
) {
  if (!departures || departures.length === 0) {
    return { hour: fallbackHour, visitors: 0 };
  }

  return departures.reduce(
    (peak, point) => {
      const visitors = Math.max(Number.isFinite(point.visitors) ? point.visitors : 0, 0);

      return visitors > peak.visitors || (visitors === peak.visitors && point.hour < peak.hour)
        ? { hour: point.hour, visitors }
        : peak;
    },
    { hour: fallbackHour, visitors: 0 },
  );
}

/**
 * [모델 1] 인프라 수용성 & 대기시간 예측 모델
 */
export function calculateInfrastructureCapacityForecast(
  plan: FestivalPlan,
  forecast: ForecastResult,
  dayTypeProfile?: DayTypeProfile,
): InfrastructureCapacityForecast {
  const dailyVisitors = Math.max(
    Number.isFinite(dayTypeProfile?.expectedDailyVisitors)
      ? dayTypeProfile?.expectedDailyVisitors ?? 0
      : Number.isFinite(forecast.expectedVisitors)
        ? forecast.expectedVisitors
        : 0,
    0,
  );
  const profile = dayTypeProfile ?? forecast;
  const occupancyByHour = occupancySeries(profile);
  const peakVisitors = peakOccupancy(occupancyByHour);
  const fallbackDepartureHour = profile.peakHour;

  // 1. Peak concurrent occupancy determines vehicle demand and restroom need.
  const estimatedVehicles = Math.round((peakVisitors * 0.18) / 2.5);
  const requiredRestroomCount = Math.ceil(peakVisitors / 250);
  const providedParkingCapacity = providedCapacity(plan.parkingCapacityVehicles);
  const providedRestroomCount = providedCapacity(plan.restroomFixtureCount);
  const recommendedParkingCapacity = estimatedVehicles;
  const recommendedRestroomCount = requiredRestroomCount;
  const parkingStatus = providedParkingCapacity === undefined ? "input-required" : "available";
  const restroomStatus = providedRestroomCount === undefined ? "input-required" : "available";
  const parkingPeakOccupancyRate = providedParkingCapacity === undefined
    ? undefined
    : (estimatedVehicles / providedParkingCapacity) * 100;
  const firstFillHour = providedParkingCapacity === undefined
    ? undefined
    : occupancyByHour.find(
      (point) => Math.round((Math.max(point.visitors, 0) * 0.18) / 2.5) > providedParkingCapacity,
    )?.hour;
  const parkingFillTime = providedParkingCapacity === undefined
    ? "입력 필요"
    : firstFillHour === undefined
      ? NO_PARKING_FILL_TIME
      : `${firstFillHour}:00 만차 예상 (입차 대기 증가)`;
  const restroomDeficitCount = providedRestroomCount === undefined
    ? undefined
    : Math.max(0, requiredRestroomCount - providedRestroomCount);
  const estimatedRestroomWaitMinutes = restroomDeficitCount === undefined
    ? undefined
    : restroomDeficitCount > 0
      ? Math.min(45, Math.round(4 + restroomDeficitCount * 0.9))
      : 3;
  const departure = peakDeparture(profile.departuresByHour, fallbackDepartureHour);

  // 2. Waste remains a daily-unique visitor calculation.
  const totalWasteTons = Number(((dailyVisitors * 0.4) / 1000).toFixed(2));
  const generalWasteTons = Number((totalWasteTons * 0.6).toFixed(2));
  const recyclableWasteTons = Number((totalWasteTons * 0.4).toFixed(2));

  return {
    parkingStatus,
    parkingFillTime,
    parkingPeakOccupancyRate,
    estimatedVehicles,
    providedParkingCapacity,
    recommendedParkingCapacity,
    restroomStatus,
    requiredRestroomCount,
    providedRestroomCount,
    recommendedRestroomCount,
    restroomDeficitCount,
    estimatedRestroomWaitMinutes,
    peakDepartureHour: departure.hour,
    peakDepartures: departure.visitors,
    totalWasteTons,
    generalWasteTons,
    recyclableWasteTons,
  };
}
