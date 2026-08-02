/**
 * 파일 : src/services/forecast.ts
 * 내용 : 유사 축제 실적, 주변 관광 정보, 기후 예보 및 소셜 트렌드를 결합한 시간대별 수요 예측 알고리즘 엔진
 * 수정 : 2026-07-24. 문체부 지역축제 실적 백데이터 연동 및 기후 가감율 산출 공식 통합
 */

// 핵심 도메인 인터페이스 및 타입 정의 불러오기
import type {
  DemandBackdataContext, // 문체부 실적 백데이터 매칭 맥락
  FestivalPlan, // 입력 축제 기획안 모델
  ForecastResult, // 수요 예측 결과 DTO
  RiskLevel, // 예측 신뢰도 및 위험 등급 타입
  TourismContext, // TourAPI 관광 자원 맥락
  TrendContext, // 소셜 트렌드 맥락
} from "../domain/types";

// 수치를 최소값(min)과 최대값(max) 사이에 제한하는 유틸리티 클램프 함수
export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

// 수치 배열의 산술 평균을 구하는 유틸리티 함수
function average(values: number[]) {
  return values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

// 연동된 공공데이터 수량 및 데이터 연동 상태(live/sample)에 따라 예측 신뢰도를 산출하는 함수
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

function searchTrendMultiplier(trends: TrendContext, socialInterest: number) {
  const searchInterestScore = trends.searchInterestScore ?? socialInterest;
  const trendAcceleration = trends.trendAcceleration ?? 0;
  const interestCorrection = clamp(((searchInterestScore - 50) / 100) * 0.18, -0.08, 0.18);
  const accelerationCorrection = clamp((trendAcceleration / 100) * 0.12, -0.05, 0.12);

  return 1 + interestCorrection + accelerationCorrection;
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

function keywordMatchCount(text: string, keywords: string[]) {
  return keywords.filter((keyword) => text.includes(keyword)).length;
}

function festivalTimeProfileMultiplier(plan: FestivalPlan, hour: number) {
  const text = normalizeText(`${plan.name} ${plan.keywords.join(" ")}`);
  const daytimeScore = keywordMatchCount(text, [
    "딸기",
    "튤립",
    "꽃",
    "주꾸미",
    "구석기",
    "체험",
    "가족",
    "어린이",
    "농산",
    "특산",
    "전통",
    "역사",
  ]);
  const nighttimeScore = keywordMatchCount(text, [
    "미디어",
    "빛",
    "라이트",
    "야간",
    "겨울",
    "카운트다운",
    "불꽃",
  ]);

  if (daytimeScore > nighttimeScore) {
    if (hour <= 14) return 1.28;
    if (hour <= 16) return 1.22;
    if (hour <= 18) return 0.95;
    if (hour <= 20) return 0.72;
    return 0.55;
  }

  if (nighttimeScore > daytimeScore) {
    if (hour <= 14) return 0.65;
    if (hour <= 16) return 0.82;
    if (hour <= 18) return 1.2;
    if (hour <= 20) return 1.35;
    return 1.1;
  }

  return 1;
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
  const trendMultiplier = searchTrendMultiplier(trends, socialInterest);
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
    trendMultiplier *
    (0.8 + programScore / 400) *
    budgetScale *
    entranceFactor;
  const upperDemandBound = Math.max(
    plan.expectedCapacity * 1.45,
    demandBackdataBaseline > 0 ? demandBackdataBaseline * 1.12 : 0,
  );
  const expectedVisitors = Math.round(
    clamp(baseDemand, 5000, upperDemandBound),
  );
  const hourWeights = plan.operatingHours.map((hour) => {
    const programDraw = plan.programs
      .filter((program) => hour >= program.startHour && hour <= program.endHour)
      .reduce((sum, program) => sum + program.expectedDraw, 0);
    const eveningBoost = hour >= 18 && hour <= 20 ? 1.28 : 1;
    const festivalTimeProfile = festivalTimeProfileMultiplier(plan, hour);

    return Math.max(0.7, 0.8 + programDraw / 180) * eveningBoost * festivalTimeProfile;
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
        label: "Naver DataLab 검색량 보정",
        impact: Math.round((trendMultiplier - 1) * 100),
        description:
          "기간별 상대 검색량 평균과 최근 상승률을 제한 계수로 반영해 사전 관심도 급등 또는 냉각을 보정합니다.",
      },
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
