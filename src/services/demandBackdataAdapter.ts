/**
 * 파일 : src/services/demandBackdataAdapter.ts
 * 내용 : 문화체육관광부 지역축제 정보 실적 백데이터 매칭 및 유사 축제 베이스라인 추출 어댑터
 * 수정 : 2026-07-24. 지역/유형 기반 유사 축제 매칭 및 근거 레코드 추출 구현
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
  url.searchParams.set("limit", "8");
  return url;
}

function createApiSourceDetails(
  festivals: DemandBackdataSimilarFestival[],
  records: RegionalFestivalApiRecord[],
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
      records: festivals.map((festival, index) => ({
        label: festival.name,
        fields: [
          { label: "지역", value: festival.region },
          { label: "유형", value: festival.type },
          { label: "기간", value: festival.periodLabel },
          {
            label: "방문객 수",
            value: festival.visitors ? `${festival.visitors.toLocaleString("ko-KR")}명` : "-",
          },
          {
            label: "예산",
            value: festival.budgetMillionKrw
              ? `${festival.budgetMillionKrw.toLocaleString("ko-KR")}백만원`
              : "-",
          },
          { label: "원천 파일", value: records[index]?.sourceFile ?? "-" },
          { label: "유사도", value: `${festival.similarityScore}점` },
        ],
      })),
      note: "문화체육관광부 지역축제 엑셀 파일을 서버 JSON DB로 정규화해 수요 예측 기준선으로 사용합니다.",
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
  };
}
function normalizeText(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
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

  return plan.keywords.reduce((score, keyword) => {
    const normalizedKeyword = normalizeText(keyword);
    if (!normalizedKeyword) return score;
    return haystack.includes(normalizedKeyword) ? score + 14 : score;
  }, 0);
}

function budgetScore(plan: FestivalPlan, festival: DemandBackdataSimilarFestival) {
  if (!festival.budgetMillionKrw) return 0;

  const ratio = festival.budgetMillionKrw / Math.max(plan.totalBudgetMillionKrw, 1);
  if (ratio >= 0.75 && ratio <= 1.35) return 18;
  if (ratio >= 0.5 && ratio <= 1.8) return 10;
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
          budgetScore(plan, festival) +
          festival.similarityScore * 0.25,
      ),
    ),
  };
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
          { label: "기간 유형", value: festival.periodLabel },
          {
            label: "방문객 수",
            value: festival.visitors ? `${festival.visitors.toLocaleString("ko-KR")}명` : "-",
          },
          {
            label: "예산",
            value: festival.budgetMillionKrw
              ? `${festival.budgetMillionKrw.toLocaleString("ko-KR")}백만원`
              : "-",
          },
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
      "샘플 유사 축제 기준선",
      `지역축제 파일데이터 매칭 실패로 샘플 기준선을 사용합니다. 사유: ${reason}`,
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
      "파일데이터 정규화 기준선",
      "문화체육관광부 지역축제 정보의 방문객 수, 예산, 유형을 수요 예측 기준선으로 사용합니다.",
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
      .filter((festival) => (festival.visitors ?? 0) > 0)
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 3);

    if (festivals.length === 0) {
      return createFallbackDemandBackdataContext(plan, "서버 DB에 사용 가능한 방문객 수 레코드 없음");
    }

    return {
      status: "file-normalized",
      similarFestivalBaselines: festivals,
      sourceDetails: createApiSourceDetails(festivals, records, "file-normalized"),
    };
  } catch (error) {
    if (options.signal?.aborted || (typeof error === "object" && error !== null && "name" in error && error.name === "AbortError")) {
      throw error;
    }
    return createFallbackDemandBackdataContext(plan, "문화체육관광부 지역축제 서버 DB 조회 실패");
  }
}