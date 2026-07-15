import type {
  FestivalPlan,
  ForecastResult,
  RiskLevel,
  TourismContext,
  TrendContext,
} from "../domain/types";

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function average(values: number[]) {
  return values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function confidenceFromCounts(tourismCount: number, trendCount: number): RiskLevel {
  if (tourismCount >= 3 && trendCount >= 4) return "high";
  if (tourismCount >= 2 && trendCount >= 2) return "medium";
  return "low";
}

export function createForecast(
  plan: FestivalPlan,
  tourism: TourismContext,
  trends: TrendContext,
): ForecastResult {
  const regionalAttractiveness = average(
    tourism.nearbySpots.map((spot) => spot.appealScore),
  );
  const similarDemand = average(
    tourism.similarFestivals.map(
      (festival) => festival.visitors * festival.themeOverlap,
    ),
  );
  const socialInterest = average(
    trends.signals.map((signal) => signal.interestScore),
  );
  const programScore = average(
    plan.programs.map((program) => program.expectedDraw),
  );
  const budgetScale = clamp(plan.totalBudgetMillionKrw / 700, 0.75, 1.35);
  const entranceFactor = plan.facilities.filter((item) => item.type === "entrance")
    .length >= 2
    ? 1.08
    : 0.92;
  const baseDemand =
    (similarDemand * 0.52 + plan.expectedCapacity * 0.28 + regionalAttractiveness * 180) *
    (0.75 + socialInterest / 300) *
    (0.8 + programScore / 400) *
    budgetScale *
    entranceFactor;
  const expectedVisitors = Math.round(
    clamp(baseDemand, 5000, plan.expectedCapacity * 1.45),
  );
  const hourWeights = plan.operatingHours.map((hour) => {
    const programDraw = plan.programs
      .filter((program) => hour >= program.startHour && hour <= program.endHour)
      .reduce((sum, program) => sum + program.expectedDraw, 0);
    const eveningBoost = hour >= 18 && hour <= 20 ? 1.28 : 1;

    return Math.max(0.7, 0.8 + programDraw / 180) * eveningBoost;
  });
  const totalWeight = hourWeights.reduce((sum, weight) => sum + weight, 0);
  const visitorsByHour = plan.operatingHours.map((hour, index) => ({
    hour,
    visitors: Math.round((expectedVisitors * hourWeights[index]) / totalWeight),
  }));
  const peak = visitorsByHour.reduce((max, item) =>
    item.visitors > max.visitors ? item : max,
  );
  const successScore = Math.round(
    clamp(
      regionalAttractiveness * 0.28 +
        socialInterest * 0.3 +
        programScore * 0.28 +
        Math.min(similarDemand / 900, 100) * 0.14,
      0,
      100,
    ),
  );

  return {
    expectedVisitors,
    visitorsByHour,
    peakHour: peak.hour,
    successScore,
    confidence: confidenceFromCounts(tourism.nearbySpots.length, trends.signals.length),
    reasons: [
      {
        label: "TourAPI 주변 관광 매력도",
        impact: Math.round(regionalAttractiveness),
        description: "주변 관광지 흡인력을 수요 예측 근거로 반영했습니다.",
      },
      {
        label: "유사 축제 기준 수요",
        impact: Math.round(similarDemand),
        description: "유사 축제 방문객 규모를 기준값으로 사용했습니다.",
      },
      {
        label: "소셜 트렌드 관심도",
        impact: Math.round(socialInterest),
        description: "비식별 키워드 관심도를 수요 보정에 반영했습니다.",
      },
      {
        label: "프로그램 매력도",
        impact: Math.round(programScore),
        description: "프로그램 집객력을 시간대별 방문객 분포에 반영했습니다.",
      },
    ],
  };
}
