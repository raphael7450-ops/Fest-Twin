import { sampleTrendContext } from "../data/sampleTrends";
import type {
  DataSourceStatus,
  FestivalPlan,
  TrendContext,
  TrendKeywordGroup,
  TrendPoint,
  TrendSignal,
} from "../domain/types";

interface TrendAdapterOptions {
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

interface NaverDataLabPoint {
  period?: string;
  ratio?: number;
}

interface NaverDataLabResult {
  title?: string;
  keywords?: string[];
  data?: NaverDataLabPoint[];
}

interface NaverDataLabProxyPayload {
  sourceName?: string;
  sourceStatus?: DataSourceStatus;
  retrievedAt?: string;
  fallbackReason?: string;
  results?: NaverDataLabResult[];
}

function yyyymmddToIsoDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return value.replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3");
}

function offsetDate(value: string, days: number) {
  const date = new Date(`${yyyymmddToIsoDate(value)}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function uniqueValues(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

function createKeywordGroups(plan: FestivalPlan): TrendKeywordGroup[] {
  return [
    {
      groupName: plan.name,
      keywords: uniqueValues([plan.name, ...plan.keywords]).slice(0, 20),
    },
  ].slice(0, 5);
}

function trendPointsFromResults(results: NaverDataLabResult[]): TrendPoint[] {
  const byPeriod = new Map<string, number[]>();

  results.forEach((result) => {
    result.data?.forEach((point) => {
      if (!point.period || typeof point.ratio !== "number") return;
      byPeriod.set(point.period, [...(byPeriod.get(point.period) ?? []), point.ratio]);
    });
  });

  return Array.from(byPeriod.entries())
    .map(([period, ratios]) => ({
      period,
      ratio: Math.round(ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length),
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

function scoreFromPoints(points: TrendPoint[]) {
  if (points.length === 0) return undefined;

  return Math.round(
    points.reduce((sum, point) => sum + point.ratio, 0) / points.length,
  );
}

function accelerationFromPoints(points: TrendPoint[]) {
  if (points.length < 2) return 0;

  return Math.round(points[points.length - 1].ratio - points[0].ratio);
}

function fallbackTrendContext(plan: FestivalPlan, fallbackReason?: string): TrendContext {
  const planKeywords = new Set(plan.keywords);
  const signals = sampleTrendContext.signals.filter((signal) =>
    planKeywords.has(signal.keyword),
  );
  const selectedSignals = signals.length > 0 ? signals : sampleTrendContext.signals;

  return {
    ...sampleTrendContext,
    sourceName: sampleTrendContext.provenance.sourceName,
    sourceStatus: "sample-fallback",
    basisLabel: "샘플 검색 관심도",
    keywordGroups: createKeywordGroups(plan),
    searchInterestScore:
      selectedSignals.reduce((sum, signal) => sum + signal.interestScore, 0) /
      selectedSignals.length,
    trendAcceleration: 0,
    fallbackReason,
    signals: selectedSignals,
    provenance: {
      ...sampleTrendContext.provenance,
      sourceStatus: "sample-fallback",
      fallbackReason,
    },
  };
}

function liveSignalsFromResults(
  plan: FestivalPlan,
  results: NaverDataLabResult[],
  searchInterestScore: number,
): TrendSignal[] {
  const keywords = uniqueValues(
    results.flatMap((result) => result.keywords ?? []).concat(plan.keywords),
  ).slice(0, 5);

  return keywords.map((keyword) => ({
    keyword,
    interestScore: searchInterestScore,
    sentimentScore: 50,
    mentions: Math.round(searchInterestScore * 100),
  }));
}

function mapNaverDataLabPayloadToTrendContext(
  plan: FestivalPlan,
  payload: NaverDataLabProxyPayload,
): TrendContext {
  const results = Array.isArray(payload.results) ? payload.results : [];
  const points = trendPointsFromResults(results);
  const searchInterestScore = scoreFromPoints(points);

  if (searchInterestScore === undefined) {
    return fallbackTrendContext(plan, "Naver DataLab 응답에 검색량 지점이 없습니다.");
  }

  const sourceStatus = payload.sourceStatus ?? "live";
  const sourceName = payload.sourceName ?? "Naver DataLab search trend";
  const fallbackReason =
    sourceStatus === "sample-fallback" ? payload.fallbackReason : undefined;

  return {
    signals: liveSignalsFromResults(plan, results, searchInterestScore),
    sourceName,
    sourceStatus,
    basisLabel: "Naver DataLab 검색량 관심도",
    keywordGroups: createKeywordGroups(plan),
    searchInterestScore,
    trendAcceleration: accelerationFromPoints(points),
    points,
    fallbackReason,
    provenance: {
      sourceName,
      sourceType: sourceStatus === "live" ? "public-data" : "trend-sample",
      sourceStatus,
      basisText:
        "Naver DataLab 검색어트렌드 API의 기간별 상대 검색량을 축제 사전 관심도 보정값으로 사용합니다.",
      fallbackText:
        "API 인증 또는 응답 실패 시 비식별 샘플 관심도만 사용하며 개인정보는 수집하지 않습니다.",
      fallbackReason,
      retrievedAt: payload.retrievedAt,
      collectedPersonalData: false,
    },
    sourceDetails: [
      {
        sourceId: "naver-datalab-search-trend",
        sourceName,
        sourceType: "derived",
        statusLabel: sourceStatus === "live" ? "실시간 API 응답" : "샘플 대체",
        retrievedAt: payload.retrievedAt,
        endpoint: "/api/trends/naver-search",
        query: [
          { label: "startDate", value: offsetDate(plan.startDate, -90) },
          { label: "endDate", value: yyyymmddToIsoDate(plan.startDate) },
          { label: "timeUnit", value: "week" },
        ],
        records: results.map((result) => ({
          label: result.title ?? "keyword group",
          fields: [
            { label: "keywords", value: (result.keywords ?? []).join(", ") },
            { label: "points", value: String(result.data?.length ?? 0) },
          ],
        })),
        note: "브라우저에는 Naver Client Secret 또는 인증 헤더를 노출하지 않습니다.",
      },
    ],
  };
}

export async function getTrendContext(
  plan: FestivalPlan,
  options: TrendAdapterOptions = {},
): Promise<TrendContext> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;

  if (typeof fetchImpl !== "function") {
    return fallbackTrendContext(plan, "브라우저 fetch API를 사용할 수 없습니다.");
  }

  try {
    const response = await fetchImpl("/api/trends/naver-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: options.signal,
      body: JSON.stringify({
        startDate: offsetDate(plan.startDate, -90),
        endDate: yyyymmddToIsoDate(plan.startDate),
        timeUnit: "week",
        keywordGroups: createKeywordGroups(plan),
      }),
    });

    if (!response.ok) {
      return fallbackTrendContext(plan, `Naver DataLab 프록시 호출 실패: ${response.status}`);
    }

    return mapNaverDataLabPayloadToTrendContext(
      plan,
      (await response.json()) as NaverDataLabProxyPayload,
    );
  } catch (error) {
    return fallbackTrendContext(
      plan,
      error instanceof Error ? error.message : "Naver DataLab 프록시 호출 실패",
    );
  }
}
