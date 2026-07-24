/**
 * 파일 : src/services/forecast.ts
 * 내용 : 유사 축제 실적, 주변 관광 정보, 기후 예보 및 소셜 트렌드를 결합한 시간대별 수요 예측 알고리즘 엔진
 * 수정 : 2026-07-24. 문체부 지역축제 실적 백데이터 연동 및 기후 가감율 산출 공식 통합
 */

import type {
  DemandBackdataContext,
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

function confidenceFromEvidence(
  tourism: TourismContext,
  trends: TrendContext,
): RiskLevel {
  const tourismCount = tourism.nearbySpots.length;
  const trendCount = trends.signals.length;
  const reliableProvenance =
    tourism.provenance.sourceStatus === "live" &&
    trends.provenance.sourceType !== "trend-sample" &&
    trends.provenance.sourceStatus !== "sample-fallback" &&
    trends.provenance.sourceStatus !== "partial-fallback";

  if (tourismCount >= 3 && trendCount >= 4 && reliableProvenance) return "high";
  if (tourismCount >= 2 && trendCount >= 2) return "medium";
  return "low";
}

function weightedDemandBackdataAverage(demandBackdata?: DemandBackdataContext) {
  const festivals =
    demandBackdata?.similarFestivalBaselines.filter((festival) => festival.visitors) ?? [];
  const totalWeight = festivals.reduce((sum, festival) => sum + festival.similarityScore, 0);

  if (festivals.length === 0 || totalWeight === 0) return 0;

  return festivals.reduce(
    (sum, festival) => sum + (festival.visitors ?? 0) * festival.similarityScore,
    0,
  ) / totalWeight;
}

function similarDemandFromTourism(tourism: TourismContext) {
  return average(
    tourism.similarFestivals.map(
      (festival) => festival.visitors * festival.themeOverlap,
    ),
  );
}

export function createForecast(
  plan: FestivalPlan,
  tourism: TourismContext,
  trends: TrendContext,
  demandBackdata?: DemandBackdataContext,
): ForecastResult {
  const regionalAttractiveness = average(
    tourism.nearbySpots.map((spot) => spot.appealScore),
  );
  const demandBackdataBaseline = weightedDemandBackdataAverage(demandBackdata);
  const similarDemand =
    demandBackdataBaseline > 0 ? demandBackdataBaseline : similarDemandFromTourism(tourism);
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
    confidence: confidenceFromEvidence(tourism, trends),
    reasons: [
      {
        label: "TourAPI 주변 관광 매력도",
        impact: Math.round(regionalAttractiveness),
        description: "주변 관광지 흡인력을 수요 예측 근거로 반영했습니다.",
      },
      {
        label:
          demandBackdataBaseline > 0
            ? "지역축제 방문객 기준선"
            : "유사 축제 추정 수요 프록시",
        impact: Math.round(similarDemand),
        description:
          demandBackdataBaseline > 0
            ? "문화체육관광부 지역축제 정보의 방문객 수, 예산, 유형 유사도를 수요 기준선으로 반영했습니다."
            : tourism.provenance.sourceStatus === "live"
            ? "TourAPI 행사 메타데이터로 산정한 실제 방문객 집계가 아닌 추정 프록시입니다."
            : "샘플 축제 메타데이터로 산정한 실제 방문객 집계가 아닌 추정 프록시입니다.",
      },
      {
        label:
          trends.provenance.sourceType === "trend-sample"
            ? "샘플 트렌드 관심도 프록시"
            : "트렌드 관심도 프록시",
        impact: Math.round(socialInterest),
        description:
          trends.provenance.sourceType === "trend-sample"
            ? "사전 정의된 비개인 샘플 관심도이며 실시간 소셜 트렌드가 아닙니다."
            : "비개인 키워드 관심도 프록시를 수요 보정에 반영했습니다.",
      },
      {
        label: "프로그램 매력도",
        impact: Math.round(programScore),
        description: "프로그램 집객력을 시간대별 방문객 분포에 반영했습니다.",
      },
    ],
  };
}
