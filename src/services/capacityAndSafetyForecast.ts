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

/**
 * [모델 1] 인프라 수용성 & 대기시간 예측 모델
 */
export function calculateInfrastructureCapacityForecast(
  plan: FestivalPlan,
  forecast: ForecastResult,
  dayTypeProfile?: DayTypeProfile,
): InfrastructureCapacityForecast {
  const targetVisitors = dayTypeProfile ? dayTypeProfile.expectedDailyVisitors : forecast.expectedVisitors;
  const targetPeakHour = dayTypeProfile ? dayTypeProfile.peakHour : forecast.peakHour;
  const targetVisitorsByHour = dayTypeProfile ? dayTypeProfile.visitorsByHour : forecast.visitorsByHour;

  const visitors = Math.max(100, targetVisitors);
  const peakHour = targetPeakHour || 20;

  // 1. 주차 유입 및 만차 시점 산출 (차량 분산율 18%, 대당 2.5명 탑승 가정)
  const estimatedVehicles = Math.max(10, Math.round((visitors * 0.18) / 2.5));
  // 행사장 면적 및 기획안 규모에 비례한 주차 수용량 (최소 200대)
  const providedParkingCapacity = Math.max(
    200,
    plan.gridWidth * plan.gridHeight * 25,
  );
  const parkingPeakOccupancyRate = Math.min(
    200,
    Math.round((estimatedVehicles / providedParkingCapacity) * 100),
  );

  let parkingFillTime = "여유 (만차 우려 없음)";
  if (parkingPeakOccupancyRate >= 90) {
    const fillHour = Math.max(12, peakHour - 1);
    parkingFillTime = `${fillHour}:40 만차 예상 (입차 대기 증가)`;
  } else if (parkingPeakOccupancyRate >= 75) {
    parkingFillTime = `${peakHour}:00 혼잡 진입 예상`;
  }

  // 2. 임시 화장실 수용 한계 및 대기시간 (피크 인원 250명당 1칸 가이드라인)
  const peakHourlyObj = targetVisitorsByHour.find((v) => v.hour === peakHour);
  const peakVisitors = peakHourlyObj ? peakHourlyObj.visitors : Math.round(visitors * 0.4);
  const requiredRestroomCount = Math.max(5, Math.ceil(peakVisitors / 250));
  // 주최측 기본 준비 수량 (기본 수용률 약 84% 적용)
  const providedRestroomCount = Math.max(4, Math.round(requiredRestroomCount * 0.84));
  const restroomDeficitCount = Math.max(0, requiredRestroomCount - providedRestroomCount);
  const estimatedRestroomWaitMinutes = restroomDeficitCount > 0
    ? Math.min(45, Math.round(4 + restroomDeficitCount * 0.9))
    : 3;

  // 3. 1인당 0.4kg 폐기물 배출량 연산
  const totalWasteTons = Number(((visitors * 0.4) / 1000).toFixed(2));
  const generalWasteTons = Number((totalWasteTons * 0.6).toFixed(2));
  const recyclableWasteTons = Number((totalWasteTons * 0.4).toFixed(2));

  return {
    parkingFillTime,
    parkingPeakOccupancyRate,
    estimatedVehicles,
    providedParkingCapacity,
    requiredRestroomCount,
    providedRestroomCount,
    restroomDeficitCount,
    estimatedRestroomWaitMinutes,
    totalWasteTons,
    generalWasteTons,
    recyclableWasteTons,
  };
}
