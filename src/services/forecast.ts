import type {
  DemandBackdataContext,
  FestivalPlan,
  ForecastResult,
  RiskLevel,
  TourismContext,
  TrendContext,
} from "../domain/types";

export function clamp(value: number, min: number, max: number) {
  const safeMin = Number.isFinite(min) ? min : 0;
  const safeMax = Number.isFinite(max) ? max : safeMin;
  const orderedMin = Math.min(safeMin, safeMax);
  const orderedMax = Math.max(safeMin, safeMax);
  const safeValue = Number.isFinite(value) ? value : orderedMin;
  return Math.min(Math.max(safeValue, orderedMin), orderedMax);
}

function average(values: number[]) {
  const finiteValues = values.filter((value) => Number.isFinite(value));
  return finiteValues.length === 0
    ? 0
    : finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length;
}

function positiveNumber(value: number, fallback: number) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function normalizedOperatingHours(hours: number[]) {
  const normalized = Array.from(
    new Set(
      hours
        .filter((hour) => Number.isFinite(hour))
        .map((hour) => Math.round(clamp(hour, 0, 24))),
    ),
  ).sort((a, b) => a - b);

  return normalized.length > 0 ? normalized : [18];
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

function hasAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(normalizeText(keyword)));
}

function createFestivalTimePattern(plan: FestivalPlan, demandBackdata?: DemandBackdataContext) {
  const bestBackdata = demandBackdata?.similarFestivalBaselines[0];
  const evidenceText = normalizeText(
    `${bestBackdata?.type ?? ""} ${bestBackdata?.periodLabel ?? ""} ${bestBackdata?.name ?? ""} ${plan.name} ${plan.keywords.join(" ")}`,
  );

  if (
    hasAny(evidenceText, [
      "카운트다운",
      "countdown",
      "새해",
      "연말",
      "타종",
      "제야",
      "해맞이",
      "midnight",
      "newyear",
    ])
  ) {
    return {
      label: bestBackdata?.type ?? "야간 카운트다운형",
      sourceLabel: bestBackdata
        ? `${bestBackdata.sourceName} ${bestBackdata.type}`
        : "축제명 키워드",
      weightForHour: (hour: number) => {
        if (hour === 24 || hour === 0) return 2.2;
        if (hour === 23) return 1.55;
        if (hour === 22) return 1.28;
        if (hour >= 18 && hour <= 21) return 1.08;
        return 0.78;
      },
    };
  }

  if (
    hasAny(evidenceText, [
      "먹거리",
      "음식",
      "푸드",
      "미식",
      "커피",
      "맥주",
      "와인",
      "수산물",
      "축산물",
      "농산물",
      "한우",
      "김치",
    ])
  ) {
    return {
      label: bestBackdata?.type ?? "먹거리·특산물형",
      sourceLabel: bestBackdata
        ? `${bestBackdata.sourceName} ${bestBackdata.type}`
        : "축제명 키워드",
      weightForHour: (hour: number) => {
        if (hour >= 11 && hour <= 13) return 1.32;
        if (hour >= 18 && hour <= 20) return 1.28;
        if (hour >= 14 && hour <= 16) return 0.92;
        return 0.98;
      },
    };
  }

  if (hasAny(evidenceText, ["야간", "밤", "빛", "라이트", "미디어", "조명", "드론", "불꽃"])) {
    return {
      label: bestBackdata?.type ?? "야간 미디어형",
      sourceLabel: bestBackdata
        ? `${bestBackdata.sourceName} ${bestBackdata.type}`
        : "축제명 키워드",
      weightForHour: (hour: number) => {
        if (hour === 20) return 1.4;
        if (hour >= 18 && hour <= 22) return 1.22;
        if (hour >= 14 && hour <= 16) return 0.88;
        return 1;
      },
    };
  }

  if (
    hasAny(evidenceText, [
      "꽃",
      "튤립",
      "벚꽃",
      "장미",
      "국화",
      "유채",
      "정원",
      "가족",
      "어린이",
      "체험",
      "낮",
      "주간",
    ])
  ) {
    return {
      label: bestBackdata?.type ?? "주간 가족·체험형",
      sourceLabel: bestBackdata
        ? `${bestBackdata.sourceName} ${bestBackdata.type}`
        : "축제명 키워드",
      weightForHour: (hour: number) => {
        if (hour >= 10 && hour <= 13) return 1.18;
        if (hour >= 14 && hour <= 17) return 1.3;
        if (hour >= 18 && hour <= 20) return 1.04;
        return 0.9;
      },
    };
  }

  return {
    label: bestBackdata?.type ?? "기본 프로그램형",
    sourceLabel: bestBackdata
      ? `${bestBackdata.sourceName} ${bestBackdata.type}`
      : "프로그램 시간표",
    weightForHour: (hour: number) => (hour >= 18 && hour <= 20 ? 1.18 : 1),
  };
}

export function createForecast(
  plan: FestivalPlan,
  tourism: TourismContext,
  trends: TrendContext,
  demandBackdata?: DemandBackdataContext,
): ForecastResult {
  const safeExpectedCapacity = positiveNumber(plan.expectedCapacity, 5000);
  const safeBudgetMillionKrw = Math.max(Number.isFinite(plan.totalBudgetMillionKrw) ? plan.totalBudgetMillionKrw : 0, 0);
  const operatingHours = normalizedOperatingHours(plan.operatingHours);
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
  const budgetScale = clamp(safeBudgetMillionKrw / 700, 0.75, 1.35);
  const entranceFactor = plan.facilities.filter((item) => item.type === "entrance")
    .length >= 2
    ? 1.08
    : 0.92;
  const timePattern = createFestivalTimePattern(plan, demandBackdata);
  const baseDemand =
    (similarDemand * 0.52 + safeExpectedCapacity * 0.28 + regionalAttractiveness * 180) *
    (0.75 + socialInterest / 300) *
    trendMultiplier *
    (0.8 + programScore / 400) *
    budgetScale *
    entranceFactor;
  const expectedVisitors = Math.round(
    clamp(baseDemand, 5000, Math.max(5000, safeExpectedCapacity * 1.45)),
  );
  const hourWeights = operatingHours.map((hour) => {
    const programDraw = plan.programs
      .filter((program) => hour >= program.startHour && hour <= program.endHour)
      .reduce(
        (sum, program) => sum + (Number.isFinite(program.expectedDraw) ? program.expectedDraw : 0),
        0,
      );
    const typePatternBoost = timePattern.weightForHour(hour);

    return Math.max(0.7, 0.8 + programDraw / 180) * typePatternBoost;
  });
  const totalWeight = Math.max(hourWeights.reduce((sum, weight) => sum + weight, 0), 1);
  const visitorsByHour = operatingHours.map((hour, index) => ({
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
          "기간별 검색량 평균과 최근 상승률을 제한된 계수로 반영해 사전 관심도 급등 또는 둔화를 보정합니다.",
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
            ? "문화체육관광부 지역축제 정보의 방문객, 예산, 유형 유사도를 수요 기준선으로 반영했습니다."
            : tourism.provenance.sourceStatus === "live"
            ? "TourAPI 행사 메타데이터로 산정한 추정 프록시이며 실제 방문객 집계값은 아닙니다."
            : "샘플 축제 메타데이터로 산정한 추정 프록시이며 실제 방문객 집계값은 아닙니다.",
      },
      {
        label:
          trends.provenance.sourceType === "trend-sample"
            ? "샘플 트렌드 관심도 프록시"
            : "트렌드 관심도 프록시",
        impact: Math.round(socialInterest),
        description:
          trends.provenance.sourceType === "trend-sample"
            ? "사전 정의한 비개인 샘플 관심도이며 실시간 소셜 트렌드는 아닙니다."
            : "비개인 키워드 관심도 프록시를 수요 보정에 반영했습니다.",
      },
      {
        label: "프로그램 매력도",
        impact: Math.round(programScore),
        description: "프로그램 집객력을 시간대별 방문객 분포에 반영했습니다.",
      },
      {
        label: "축제 유형별 시간대 패턴",
        impact: Math.round((Math.max(...hourWeights) / average(hourWeights) - 1) * 100),
        description:
          `${timePattern.sourceLabel} 기준의 ${timePattern.label} 시간대 분포를 적용했습니다. ` +
          "실측 시간대 방문객 집계가 아닌 사전 시뮬레이션 분포입니다.",
      },
    ],
  };
}
