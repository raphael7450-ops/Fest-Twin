/**
 * 파일 : src/services/capacityAndSafetyForecast.ts
 * 내용 : [모델 1] 인프라 수용성/대기시간 예측 & [모델 2] 인파 사고 리스크/구역별 필수 안전요원 예측 엔진
 * 수정 : 2026-08-04. 지자체 행정 심사 규격 (주차 만차 시점, 화장실 부족, 구역별 안전요원 배치, 비상 탈출 골든타임) 연산
 */

import type {
  DayTypeProfile,
  FestivalPlan,
  ForecastResult,
  InfrastructureCapacityForecast,
  SafetyGuardAllocationForecast,
  SimulationResult,
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

/**
 * [모델 2] 인파 사고 리스크 & 구역별 필수 안전요원 모델
 */
export function calculateSafetyGuardAllocationForecast(
  plan: FestivalPlan,
  forecast: ForecastResult,
  simulation: SimulationResult,
  dayTypeProfile?: DayTypeProfile,
): SafetyGuardAllocationForecast {
  const targetVisitors = dayTypeProfile ? dayTypeProfile.expectedDailyVisitors : forecast.expectedVisitors;
  const visitors = Math.max(100, targetVisitors);
  const dayRatioMultiplier = dayTypeProfile ? dayTypeProfile.dayRatio : 1.0;

  const dangerousCellsCount = simulation.cells
    ? simulation.cells.filter((c) => c.density >= 4.0).length
    : (simulation.bottlenecks?.length || 0);
  const dangerousCells = Math.max(0, Math.round(dangerousCellsCount * dayRatioMultiplier));
  const congestionScore = Math.max(1, Math.round((simulation.congestionScore || 30) * dayRatioMultiplier));

  // 1. 구역별 추천 안전요원 배치 인원 산출
  const coreStageGuards = Math.max(10, Math.round(visitors / 2200));
  const gateGuards = Math.max(6, Math.round(visitors / 4200));
  const bottleneckGuards = Math.max(6, Math.round(dangerousCells * 3 + congestionScore * 0.2));

  const totalRecommendedGuards = coreStageGuards + gateGuards + bottleneckGuards;

  const zoneAllocations = [
    {
      zoneName: "메인 무대 / 공연 집중 구역",
      recommendedGuards: coreStageGuards,
      priority: coreStageGuards >= 20 ? ("high" as const) : ("medium" as const),
      reason: "피크 시간대 관람객 집적에 따른 무대 전면 무질서 방지",
    },
    {
      zoneName: "주요 게이트 및 출입로",
      recommendedGuards: gateGuards,
      priority: gateGuards >= 15 ? ("high" as const) : ("medium" as const),
      reason: "입퇴장 시 병목 완화 및 교차 통행 일방통행 유도",
    },
    {
      zoneName: "혼잡 보행로 및 병목 위험 구간",
      recommendedGuards: bottleneckGuards,
      priority: dangerousCells > 2 ? ("high" as const) : ("low" as const),
      reason: "고위험 시뮬레이션 셀 중심 인파 유류 통제",
    },
  ];

  // 2. 시간당 응급환자 발생 건수 및 의료 지원 산출
  const expectedMedicalIncidentsPerHour = Number(
    Math.max(0.3, (visitors * (congestionScore / 50)) / 12000).toFixed(1),
  );
  const recommendedMedicalStaff = Math.max(2, Math.ceil(expectedMedicalIncidentsPerHour * 1.25));
  const recommendedAmbulances = Math.max(1, Math.ceil(recommendedMedicalStaff / 2.5));

  // 3. 비상 탈출 골든타임 소요시간 (초)
  const evacuationGoldenTimeSeconds = Math.round(180 + congestionScore * 2.2 + dangerousCells * 15);
  let evacuationStatus: "양호" | "주의" | "경고" = "양호";
  if (evacuationGoldenTimeSeconds >= 360) {
    evacuationStatus = "경고";
  } else if (evacuationGoldenTimeSeconds >= 240) {
    evacuationStatus = "주의";
  }

  return {
    totalRecommendedGuards,
    zoneAllocations,
    expectedMedicalIncidentsPerHour,
    recommendedMedicalStaff,
    recommendedAmbulances,
    evacuationGoldenTimeSeconds,
    evacuationStatus,
  };
}
