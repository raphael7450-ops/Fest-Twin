import type {
  DemandBackdataContext,
  DwellProfile,
  DwellProfileKind,
  FestivalPlan,
  ForecastResult,
  HourlyVisitorFlow,
} from "../domain/types";

const MIN_DWELL_MINUTES = 30;
const MAX_DWELL_MINUTES = 720;

const PROFILE_DEFAULTS: Record<
  DwellProfileKind,
  Omit<DwellProfile, "averageMinutes" | "sourceType" | "sourceName" | "retentionRates"> & {
    averageMinutes: number;
    retentionRates: number[];
  }
> = {
  "fireworks-performance": {
    kind: "fireworks-performance",
    label: "불꽃·대형 공연형",
    averageMinutes: 270,
    confidence: "low",
    retentionRates: [1, 0.98, 0.94, 0.86, 0.68, 0.38, 0.12, 0],
  },
  "food-experience": {
    kind: "food-experience",
    label: "먹거리·체험형",
    averageMinutes: 180,
    confidence: "low",
    retentionRates: [1, 0.88, 0.68, 0.42, 0.18, 0],
  },
  "night-exhibition": {
    kind: "night-exhibition",
    label: "야간 경관·미디어형",
    averageMinutes: 150,
    confidence: "low",
    retentionRates: [1, 0.82, 0.55, 0.28, 0.08, 0],
  },
  "street-parade": {
    kind: "street-parade",
    label: "거리·퍼레이드형",
    averageMinutes: 120,
    confidence: "low",
    retentionRates: [1, 0.65, 0.28, 0.05, 0],
  },
  "daytime-general": {
    kind: "daytime-general",
    label: "주간 종합형",
    averageMinutes: 150,
    confidence: "low",
    retentionRates: [1, 0.82, 0.55, 0.25, 0.07, 0],
  },
};

const DEFAULT_SOURCE_NAME = "축제 유형별 기본 체류 프로필";
const USER_SOURCE_NAME = "유형 기본값 참고 후 사용자 조정";

function normalizeText(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(normalizeText(term)));
}

function classificationText(plan: FestivalPlan, demandBackdata?: DemandBackdataContext) {
  const similarFestival = demandBackdata?.similarFestivalBaselines[0];
  return normalizeText(
    [
      plan.name,
      ...plan.keywords,
      ...plan.programs.map((program) => program.name),
      similarFestival?.name,
      similarFestival?.type,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function classifyProfile(text: string): DwellProfileKind {
  if (
    includesAny(text, [
      "불꽃",
      "폭죽",
      "카운트다운",
      "타종",
      "제야",
      "해맞이",
      "대형공연",
      "콘서트",
      "fireworks",
      "countdown",
    ])
  ) {
    return "fireworks-performance";
  }

  if (
    includesAny(text, [
      "먹거리",
      "푸드",
      "음식",
      "미식",
      "식음",
      "특산물",
      "지역특산물",
      "맛집",
      "푸드트럭",
      "야시장",
      "장터",
      "시장",
      "체험",
      "food",
      "gourmet",
      "market",
      "specialty",
    ])
  ) {
    return "food-experience";
  }

  if (
    includesAny(text, [
      "야간",
      "밤",
      "빛",
      "라이트",
      "미디어",
      "조명",
      "드론",
      "야경",
      "나이트",
      "night",
      "light",
      "media",
    ])
  ) {
    return "night-exhibition";
  }

  if (includesAny(text, ["거리", "퍼레이드", "행진", "카니발", "street", "parade", "carnival"])) {
    return "street-parade";
  }

  return "daytime-general";
}

function interpolate(values: number[], position: number) {
  if (position <= 0) return values[0] ?? 0;
  if (position >= values.length - 1) return values[values.length - 1] ?? 0;

  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  const fraction = position - lowerIndex;
  const lower = values[lowerIndex] ?? 0;
  const upper = values[upperIndex] ?? lower;
  return lower + (upper - lower) * fraction;
}

function scaleRetentionRates(rates: number[], defaultMinutes: number, overrideMinutes: number) {
  const scale = overrideMinutes / defaultMinutes;
  const finalElapsedHour = (rates.length - 1) * scale;
  const pointCount = Math.max(2, Math.ceil(finalElapsedHour) + 1);
  const scaled: number[] = [];

  for (let index = 0; index < pointCount; index += 1) {
    const value = Math.min(Math.max(interpolate(rates, index / scale), 0), 1);
    const previous = scaled[index - 1];
    scaled.push(previous === undefined ? value : Math.min(previous, value));
  }

  return scaled;
}

function retentionAt(
  profile: DwellProfile,
  elapsedHours: number,
  arrivalHour: number,
  anchorEndHour?: number,
) {
  if (elapsedHours < 0) return 0;

  const baseRetention = Math.min(
    Math.max(interpolate(profile.retentionRates, elapsedHours), 0),
    1,
  );
  if (
    profile.kind !== "fireworks-performance" ||
    anchorEndHour === undefined ||
    !Number.isFinite(anchorEndHour)
  ) {
    return baseRetention;
  }

  const hoursUntilAnchor = anchorEndHour - arrivalHour;
  if (arrivalHour < anchorEndHour && elapsedHours <= hoursUntilAnchor) {
    return Math.max(baseRetention, 0.85);
  }
  if (arrivalHour < anchorEndHour && elapsedHours === hoursUntilAnchor + 1) {
    return Math.min(baseRetention, 0.18);
  }
  if (arrivalHour < anchorEndHour && elapsedHours >= hoursUntilAnchor + 2) {
    return 0;
  }

  return baseRetention;
}

export function selectDwellProfile(
  plan: FestivalPlan,
  demandBackdata?: DemandBackdataContext,
): DwellProfile {
  const kind = classifyProfile(classificationText(plan, demandBackdata));
  const defaults = PROFILE_DEFAULTS[kind];
  const overrideMinutes = plan.averageDwellMinutes;
  const hasValidOverride =
    typeof overrideMinutes === "number" &&
    Number.isFinite(overrideMinutes) &&
    overrideMinutes >= MIN_DWELL_MINUTES &&
    overrideMinutes <= MAX_DWELL_MINUTES;

  if (hasValidOverride) {
    return {
      ...defaults,
      averageMinutes: overrideMinutes,
      sourceType: "user-adjusted",
      sourceName: USER_SOURCE_NAME,
      retentionRates: scaleRetentionRates(
        defaults.retentionRates,
        defaults.averageMinutes,
        overrideMinutes,
      ),
    };
  }

  return {
    ...defaults,
    sourceType: "type-default",
    sourceName: DEFAULT_SOURCE_NAME,
    retentionRates: [...defaults.retentionRates],
  };
}

export function buildVisitorFlow(
  arrivals: Array<{ hour: number; visitors: number }>,
  profile: DwellProfile,
  anchorEndHour?: number,
): HourlyVisitorFlow[] {
  const cohorts = arrivals
    .filter(
      (arrival) => Number.isFinite(arrival.hour) && Number.isFinite(arrival.visitors) && arrival.visitors > 0,
    )
    .map((arrival) => ({
      hour: Math.round(arrival.hour),
      visitors: arrival.visitors,
    }))
    .sort((left, right) => left.hour - right.hour);

  if (cohorts.length === 0) return [];

  const firstHour = cohorts[0].hour;
  const lastArrivalHour = cohorts[cohorts.length - 1].hour;
  const naturalEndHour = lastArrivalHour + Math.max(profile.retentionRates.length - 1, 0);
  const safeAnchorEndHour =
    typeof anchorEndHour === "number" && Number.isFinite(anchorEndHour)
      ? Math.round(anchorEndHour)
      : undefined;
  const finalHour = Math.max(
    naturalEndHour,
    safeAnchorEndHour === undefined ? naturalEndHour : safeAnchorEndHour + 2,
  );
  const arrivalsByHour = new Map<number, number>();

  for (const cohort of cohorts) {
    arrivalsByHour.set(cohort.hour, (arrivalsByHour.get(cohort.hour) ?? 0) + cohort.visitors);
  }

  let cumulativeArrivals = 0;
  const flow: HourlyVisitorFlow[] = [];

  for (let hour = firstHour; hour <= finalHour; hour += 1) {
    const hourArrivals = arrivalsByHour.get(hour) ?? 0;
    let occupancy = 0;
    let departures = 0;

    for (const cohort of cohorts) {
      if (cohort.hour > hour) continue;

      const elapsedHours = hour - cohort.hour;
      const currentRetention = retentionAt(
        profile,
        elapsedHours,
        cohort.hour,
        safeAnchorEndHour,
      );
      const previousRetention = retentionAt(
        profile,
        elapsedHours - 1,
        cohort.hour,
        safeAnchorEndHour,
      );

      occupancy += cohort.visitors * currentRetention;
      departures += cohort.visitors * Math.max(previousRetention - currentRetention, 0);
    }

    cumulativeArrivals += hourArrivals;
    flow.push({
      hour,
      arrivals: Math.max(0, Math.round(hourArrivals)),
      occupancy: Math.max(0, Math.round(occupancy)),
      departures: Math.max(0, Math.round(departures)),
      cumulativeArrivals: Math.max(0, Math.round(cumulativeArrivals)),
    });
  }

  return flow;
}

export function occupancySeries(
  forecast: Pick<ForecastResult, "visitorsByHour" | "occupancyByHour">,
): Array<{ hour: number; visitors: number }> {
  return forecast.occupancyByHour ?? forecast.visitorsByHour;
}
