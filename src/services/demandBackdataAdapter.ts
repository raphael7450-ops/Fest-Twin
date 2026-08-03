/**
 * File: src/services/demandBackdataAdapter.ts
 * Purpose: Match MCST regional festival backdata to the selected festival plan.
 */

import {
  sampleDemandBackdataContext,
  sampleDemandBackdataSourceDetails,
  sampleRegionalFestivalRecords,
} from "../data/sampleDemandBackdata";
import type {
  DataSourceStatus,
  DemandBackdataContext,
  DemandBackdataSimilarFestival,
  FestivalPlan,
  MetricEvidenceSourceDetail,
} from "../domain/types";

interface DemandBackdataOptions {
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

interface RegionalFestivalApiRecord {
  id: string;
  year: number;
  name: string;
  region: string;
  localGovernment?: string;
  type: string;
  venue?: string;
  startDate?: string;
  endDate?: string;
  periodLabel?: string;
  budgetMillionKrw?: number;
  visitors?: number;
  sourceName: string;
  sourceFile?: string;
}

function buildRegionalFestivalsUrl(plan: FestivalPlan) {
  const url = new URL("/api/regional-festivals", window.location.origin);
  url.searchParams.set("region", plan.region);
  url.searchParams.set("startDate", plan.startDate);
  url.searchParams.set("endDate", plan.endDate);
  url.searchParams.set("keywords", plan.keywords.join(","));
  url.searchParams.set("limit", "12");
  return url;
}

function formatCount(value?: number) {
  return value ? `${value.toLocaleString("ko-KR")}명` : "-";
}

function formatBudget(value?: number) {
  return value ? `${value.toLocaleString("ko-KR")}백만원` : "-";
}

function createApiSourceDetails(
  festivals: DemandBackdataSimilarFestival[],
  status: DataSourceStatus,
): MetricEvidenceSourceDetail[] {
  return [
    {
      sourceId: "mcst-regional-festival-server-db",
      sourceName: "문화체육관광부_지역축제 정보",
      sourceType: status === "file-normalized" ? "derived" : "sample",
      statusLabel: "서버 DB 파일 정규화 조회 성공",
      retrievedAt: new Date().toISOString(),
      endpoint: "/api/regional-festivals",
      records: festivals.map((festival) => ({
        label: festival.name,
        fields: [
          { label: "지역", value: festival.region },
          { label: "유형", value: festival.type },
          { label: "기간", value: festival.periodLabel },
          { label: "방문객 수", value: formatCount(festival.visitors) },
          { label: "예산", value: formatBudget(festival.budgetMillionKrw) },
          { label: "원천 파일", value: festival.sourceFile ?? "-" },
          { label: "유사도", value: `${festival.similarityScore}점` },
        ],
      })),
      note: "문화체육관광부 지역축제 개최계획 파일을 서버 JSON DB로 정규화해 수요 예측의 비교 근거로 사용합니다.",
    },
  ];
}

function apiRecordToFestival(record: RegionalFestivalApiRecord): DemandBackdataSimilarFestival {
  return {
    id: record.id,
    name: record.name,
    region: [record.region, record.localGovernment].filter(Boolean).join(" "),
    type: record.type,
    periodLabel:
      record.periodLabel ??
      [record.startDate, record.endDate].filter(Boolean).join(" ~ ") ??
      String(record.year),
    budgetMillionKrw: record.budgetMillionKrw,
    visitors: record.visitors,
    similarityScore: 50,
    sourceName: record.sourceName,
    sourceFile: record.sourceFile,
  };
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(/[^0-9a-z가-힣]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function regionScore(plan: FestivalPlan, festival: DemandBackdataSimilarFestival) {
  const planRegion = normalizeText(plan.region);
  const festivalRegion = normalizeText(festival.region);

  if (festivalRegion.includes(planRegion) || planRegion.includes(festivalRegion)) return 35;
  if (planRegion.slice(0, 2) && festivalRegion.includes(planRegion.slice(0, 2))) return 22;
  return 0;
}

function keywordScore(plan: FestivalPlan, festival: DemandBackdataSimilarFestival) {
  const haystack = normalizeText(`${festival.name} ${festival.type} ${festival.periodLabel}`);
  const planRegion = normalizeText(plan.region);

  return plan.keywords.reduce((score, keyword) => {
    const normalizedKeyword = normalizeText(keyword);
    if (!normalizedKeyword) return score;
    if (normalizedKeyword === planRegion || planRegion.includes(normalizedKeyword)) return score;
    return haystack.includes(normalizedKeyword) ? score + 14 : score;
  }, 0);
}

const THEME_GROUPS = [
  ["카운트다운", "새해", "해맞이", "타종", "제야", "일출", "연말"],
  ["불꽃", "드론", "라이트", "빛", "야간"],
  ["바다", "해양", "해변", "여름", "물"],
  ["음식", "푸드", "먹거리", "맥주", "와인", "커피"],
  ["음악", "공연", "콘서트", "문화", "예술"],
  ["꽃", "벚꽃", "장미", "국화", "정원"],
  ["역사", "전통", "민속", "문화재"],
];

function themeScore(plan: FestivalPlan, festival: DemandBackdataSimilarFestival) {
  const planText = normalizeText(`${plan.name} ${plan.keywords.join(" ")}`);
  const festivalText = normalizeText(`${festival.name} ${festival.type}`);
  let score = 0;

  for (const group of THEME_GROUPS) {
    const planMatches = group.some((keyword) => planText.includes(normalizeText(keyword)));
    const festivalMatches = group.some((keyword) => festivalText.includes(normalizeText(keyword)));
    if (planMatches && festivalMatches) score += 22;
  }

  const planTokens = new Set(tokenize(`${plan.name} ${plan.keywords.join(" ")}`));
  const festivalTokens = new Set(tokenize(`${festival.name} ${festival.type}`));
  const regionTokens = new Set(tokenize(plan.region));
  for (const token of planTokens) {
    if (regionTokens.has(token)) continue;
    if (festivalTokens.has(token)) score += 8;
  }

  return Math.min(score, 32);
}

function budgetScore(plan: FestivalPlan, festival: DemandBackdataSimilarFestival) {
  if (!festival.budgetMillionKrw) return 0;

  const ratio = festival.budgetMillionKrw / Math.max(plan.totalBudgetMillionKrw, 1);
  if (ratio >= 0.75 && ratio <= 1.35) return 18;
  if (ratio >= 0.5 && ratio <= 1.8) return 10;
  return 0;
}

function monthFromDate(value?: string) {
  if (!value) return undefined;
  const match = value.match(/-(\d{2})-/);
  return match ? Number(match[1]) : undefined;
}

function festivalMonths(festival: DemandBackdataSimilarFestival) {
  return [...festival.periodLabel.matchAll(/-(\d{2})-/g)]
    .map((match) => Number(match[1]))
    .filter((month) => month >= 1 && month <= 12);
}

function seasonScore(plan: FestivalPlan, festival: DemandBackdataSimilarFestival) {
  const planMonths = [monthFromDate(plan.startDate), monthFromDate(plan.endDate)].filter(
    (month): month is number => Boolean(month),
  );
  const candidateMonths = festivalMonths(festival);
  if (planMonths.length === 0 || candidateMonths.length === 0) return 0;

  if (planMonths.some((month) => candidateMonths.includes(month))) return 18;

  const isPlanYearEnd = planMonths.some((month) => month === 12 || month === 1);
  const isFestivalYearEnd = candidateMonths.some((month) => month === 12 || month === 1);
  if (isPlanYearEnd && isFestivalYearEnd) return 14;

  return 0;
}

function rescoreFestival(plan: FestivalPlan, festival: DemandBackdataSimilarFestival) {
  return {
    ...festival,
    similarityScore: Math.min(
      100,
      Math.round(
        regionScore(plan, festival) +
          keywordScore(plan, festival) +
          themeScore(plan, festival) +
          seasonScore(plan, festival) +
          budgetScore(plan, festival) +
          festival.similarityScore * 0.25,
      ),
    ),
  };
}

function isRelevantFestival(plan: FestivalPlan, festival: DemandBackdataSimilarFestival) {
  const hasThemeMatch = themeScore(plan, festival) >= 16;
  const hasSeasonMatch = seasonScore(plan, festival) >= 14;
  const hasKeywordMatch = keywordScore(plan, festival) >= 14;

  return (
    festival.similarityScore >= 58 ||
    (regionScore(plan, festival) >= 22 && hasThemeMatch && (hasSeasonMatch || hasKeywordMatch))
  );
}

function createSourceDetails(
  festivals: DemandBackdataSimilarFestival[],
  statusLabel: string,
  note: string,
): MetricEvidenceSourceDetail[] {
  return [
    {
      ...sampleDemandBackdataSourceDetails[0],
      statusLabel,
      records: festivals.map((festival) => ({
        label: festival.name,
        fields: [
          { label: "지역", value: festival.region },
          { label: "유형", value: festival.type },
          { label: "기간", value: festival.periodLabel },
          { label: "방문객 수", value: formatCount(festival.visitors) },
          { label: "예산", value: formatBudget(festival.budgetMillionKrw) },
          { label: "원천 파일", value: festival.sourceFile ?? "-" },
          { label: "유사도", value: `${festival.similarityScore}점` },
        ],
      })),
      note,
    },
  ];
}

export function createFallbackDemandBackdataContext(
  plan: FestivalPlan,
  reason: string,
): DemandBackdataContext {
  const fallbackFestivals = sampleDemandBackdataContext.similarFestivalBaselines.map((festival) =>
    rescoreFestival(plan, festival),
  );

  return {
    status: "sample-fallback",
    similarFestivalBaselines: fallbackFestivals,
    sourceDetails: createSourceDetails(
      fallbackFestivals,
      "샘플 유사 축제 기준",
      `지역축제 파일 데이터 매칭 실패로 샘플 기준을 사용합니다. 사유: ${reason}`,
    ),
  };
}

export function getDemandBackdataContext(plan: FestivalPlan): DemandBackdataContext {
  const festivals = sampleRegionalFestivalRecords
    .map((festival) => rescoreFestival(plan, festival))
    .filter((festival) => (festival.visitors ?? 0) > 0 && festival.similarityScore >= 35)
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, 3);

  if (festivals.length === 0) {
    return createFallbackDemandBackdataContext(plan, "유사도 35점 이상 지역축제 레코드 없음");
  }

  return {
    status: "file-normalized",
    similarFestivalBaselines: festivals,
    sourceDetails: createSourceDetails(
      festivals,
      "파일 데이터 정규화 기준",
      "문화체육관광부 지역축제 정보의 방문객, 예산, 유형을 수요 예측 기준으로 사용합니다.",
    ),
  };
}

export async function getDemandBackdataContextFromApi(
  plan: FestivalPlan,
  options: DemandBackdataOptions = {},
): Promise<DemandBackdataContext> {
  const fetchImpl = options.fetchImpl ?? fetch;

  try {
    const url = buildRegionalFestivalsUrl(plan);
    const response = await fetchImpl(`${url.pathname}${url.search}`, { signal: options.signal });
    if (!response.ok) throw new Error(`Regional festival DB HTTP ${response.status}`);
    const payload = (await response.json()) as { records?: RegionalFestivalApiRecord[] };
    const records = Array.isArray(payload.records) ? payload.records : [];
    const festivals = records
      .map(apiRecordToFestival)
      .map((festival) => rescoreFestival(plan, festival))
      .filter((festival) => (festival.visitors ?? 0) > 0 && isRelevantFestival(plan, festival))
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 3);

    if (festivals.length === 0) {
      return createFallbackDemandBackdataContext(plan, "서버 DB에서 사용할 수 있는 방문객 레코드 없음");
    }

    return {
      status: "file-normalized",
      similarFestivalBaselines: festivals,
      sourceDetails: createApiSourceDetails(festivals, "file-normalized"),
    };
  } catch (error) {
    if (
      options.signal?.aborted ||
      (typeof error === "object" && error !== null && "name" in error && error.name === "AbortError")
    ) {
      throw error;
    }
    return createFallbackDemandBackdataContext(plan, "문화체육관광부 지역축제 서버 DB 조회 실패");
  }
}
