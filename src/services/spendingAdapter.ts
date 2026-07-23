import { sampleSpendingContext } from "../data/sampleSpending";
import type {
  FestivalPlan,
  MetricEvidenceSourceDetail,
  SpendingContext,
} from "../domain/types";

interface SpendingOptions {
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

type SpendingRecord = Record<string, unknown>;

const VISITOR_KEYS = [
  "visitorCnt",
  "visitCnt",
  "visitrCnt",
  "touVisitorCnt",
  "srchCnt",
  "vstrCnt",
];
const TOTAL_SPEND_KEYS = [
  "outRegionSpendAmount",
  "outRegionSpendAmt",
  "tourSpendAmount",
  "tourSpendAmt",
  "consumeAmt",
  "cnsmpAmt",
  "csAmt",
];
const AVERAGE_SPEND_KEYS = [
  "avgSpendPerVisitorKrw",
  "avgSpendPerVisitor",
  "visitAmountPerPerson",
  "visitorSpendAmount",
  "spendPerVisit",
  "avgCsAmt",
];

function numericValue(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string") return undefined;
  const next = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(next) ? next : undefined;
}

function valueFrom(record: SpendingRecord, keys: string[]) {
  for (const key of keys) {
    const value = numericValue(record[key]);
    if (value !== undefined && value > 0) return value;
  }
  return undefined;
}

function extractItems(payload: unknown): SpendingRecord[] {
  const body = (payload as { response?: { body?: { items?: unknown } } })?.response?.body;
  const items = (body?.items as { item?: unknown } | undefined)?.item;
  if (Array.isArray(items)) return items.filter((item): item is SpendingRecord => typeof item === "object" && item !== null);
  if (typeof items === "object" && items !== null) return [items as SpendingRecord];

  const result = (payload as { result?: unknown; RESULT?: unknown })?.result
    ?? (payload as { RESULT?: unknown })?.RESULT;
  if (Array.isArray(result)) return result.filter((item): item is SpendingRecord => typeof item === "object" && item !== null);
  return [];
}

function normalizeAreaName(region: string) {
  return region.replace(/특별시|광역시|특별자치시|특별자치도|도|시|군|구/g, "").trim() || region;
}

function baseYmFromPlan(plan: FestivalPlan) {
  return plan.startDate.slice(0, 7).replace("-", "");
}

function buildSpendingUrl(plan: FestivalPlan) {
  const url = new URL("/api/spending/consumer-strength", window.location.origin);
  url.searchParams.set("areaNm", normalizeAreaName(plan.region));
  url.searchParams.set("baseYm", baseYmFromPlan(plan));
  return url;
}

function createSourceDetails(
  plan: FestivalPlan,
  record: SpendingRecord,
  averageSpendPerVisitorKrw: number,
): MetricEvidenceSourceDetail[] {
  const visitorCount = valueFrom(record, VISITOR_KEYS);
  const totalSpend = valueFrom(record, TOTAL_SPEND_KEYS);
  const baseYm = String(record.baseYm ?? record.BASE_YM ?? baseYmFromPlan(plan));

  return [{
    sourceId: "data-go-kr-tourism-demand-consumer-strength",
    sourceName: "한국관광공사_지역별 관광 수요 강도",
    sourceType: "tourapi",
    statusLabel: "data.go.kr 실데이터 조회 성공",
    retrievedAt: new Date().toISOString(),
    endpoint: "/api/spending/consumer-strength",
    query: [
      { label: "areaNm", value: normalizeAreaName(plan.region) },
      { label: "baseYm", value: baseYm },
    ],
    records: [{
      label: `${plan.region} 관광 소비 강도`,
      fields: [
        { label: "방문객 1인당 평균 소비", value: `${averageSpendPerVisitorKrw.toLocaleString("ko-KR")}원` },
        { label: "외지인 소비액", value: totalSpend ? `${Math.round(totalSpend).toLocaleString("ko-KR")}원` : "-" },
        { label: "방문량", value: visitorCount ? `${Math.round(visitorCount).toLocaleString("ko-KR")}명` : "-" },
      ],
    }],
    note: "공공데이터포털 지역별 관광 수요 강도의 관광 소비 강도 계열 값을 ROI 산식에 적용했습니다.",
  }];
}

function createFallbackSpendingContext(plan: FestivalPlan, reason: string): SpendingContext {
  return {
    ...sampleSpendingContext,
    region: plan.region,
    retrievedAt: new Date().toISOString(),
    note: `${sampleSpendingContext.note} 사유: ${reason}`,
    sourceDetails: sampleSpendingContext.sourceDetails.map((detail) => ({
      ...detail,
      statusLabel: "공공데이터 구조 기반 대체값",
      note: `${detail.note} 사유: ${reason}`,
    })),
  };
}

function normalizeSpendingContext(plan: FestivalPlan, payload: unknown): SpendingContext | undefined {
  const record = extractItems(payload)[0];
  if (!record) return undefined;

  const explicitAverage = valueFrom(record, AVERAGE_SPEND_KEYS);
  const totalSpend = valueFrom(record, TOTAL_SPEND_KEYS);
  const visitorCount = valueFrom(record, VISITOR_KEYS);
  const calculatedAverage =
    totalSpend !== undefined && visitorCount !== undefined
      ? Math.round(totalSpend / visitorCount)
      : undefined;
  const averageSpendPerVisitorKrw = Math.round(explicitAverage ?? calculatedAverage ?? 0);
  if (averageSpendPerVisitorKrw <= 0) return undefined;

  return {
    averageSpendPerVisitorKrw,
    basis: "tourism-demand-intensity",
    basisLabel: "지역 관광 소비 강도 실데이터 기반",
    confidence: "high",
    sourceName: "한국관광공사_지역별 관광 수요 강도",
    sourceStatus: "live",
    region: plan.region,
    retrievedAt: new Date().toISOString(),
    note: "data.go.kr 지역별 관광 수요 강도의 관광 소비 강도 값을 방문객 1인당 소비 단가로 정규화했습니다.",
    sourceDetails: createSourceDetails(plan, record, averageSpendPerVisitorKrw),
  };
}

export async function getSpendingContext(
  plan: FestivalPlan,
  options: SpendingOptions = {},
): Promise<SpendingContext> {
  const fetchImpl = options.fetchImpl ?? fetch;

  try {
    const url = buildSpendingUrl(plan);
    const response = await fetchImpl(`${url.pathname}${url.search}`, { signal: options.signal });
    if (!response.ok) throw new Error(`Spending proxy HTTP ${response.status}`);
    const context = normalizeSpendingContext(plan, await response.json());
    if (!context) throw new Error("Spending response did not include usable records");
    return context;
  } catch (error) {
    if (options.signal?.aborted || (typeof error === "object" && error !== null && "name" in error && error.name === "AbortError")) {
      throw error;
    }
    return createFallbackSpendingContext(plan, "지역별 관광 수요 강도 조회 실패 또는 미승인 API 응답");
  }
}
