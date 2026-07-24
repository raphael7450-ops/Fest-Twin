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
  DemandBackdataContext,
  DemandBackdataSimilarFestival,
  FestivalPlan,
  MetricEvidenceSourceDetail,
} from "../domain/types";

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
