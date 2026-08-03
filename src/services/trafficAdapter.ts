import {
  sampleTrafficContext,
  sampleTrafficSourceDetails,
  trafficLinkMappings,
} from "../data/sampleTraffic";
import type {
  FestivalPlan,
  MetricEvidenceSourceDetail,
  TrafficContext,
  TrafficLinkRecord,
  TrafficRiskLabel,
} from "../domain/types";

interface TrafficOptions {
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  hour?: number;
}

interface ViewTRecord {
  LINKID?: string | number;
  ROAD_NAME?: string;
  LINKNAME?: string;
  ROAD_RANK?: string;
  LINKRANK?: string;
  LANES?: string | number;
  LINKLINECNT?: string | number;
  VALUE_IN?: string | number;
  VALUE_OUT?: string | number;
  VALUE?: {
    IN?: string | number;
    OUT?: string | number;
  };
}

interface EffectiveTrafficMapping {
  id: string;
  linkId: string;
  roadName: string;
  note: string;
  isLocalLinkMapping: boolean;
}

const DEFAULT_YEAR = 2024;
const VIEWT_VALIDATION_LINK_IDS = ["1000001", "1000007", "8890310"];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function isWeekendPlan(plan: FestivalPlan) {
  const start = new Date(`${plan.startDate}T00:00:00Z`);
  const end = new Date(`${plan.endDate}T00:00:00Z`);
  for (const date = new Date(start); date <= end; date.setUTCDate(date.getUTCDate() + 1)) {
    const day = date.getUTCDay();
    if (day === 0 || day === 6) return true;
  }
  return false;
}

function normalizeTime(hour?: number) {
  if (typeof hour !== "number" || !Number.isFinite(hour)) return "ALL";
  return String(Math.min(Math.max(Math.round(hour), 0), 23));
}

function findTrafficMapping(plan: FestivalPlan) {
  return trafficLinkMappings.find((mapping) => {
    const regionMatches = plan.region.includes(mapping.regionKeyword);
    const venueMatches = mapping.venueKeyword
      ? `${plan.venueAddress} ${plan.name}`.includes(mapping.venueKeyword)
      : true;
    return regionMatches && venueMatches;
  });
}

function hashText(value: string) {
  return [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function inferredAccessRoadName(plan: FestivalPlan) {
  const basis = `${plan.region} ${plan.venueAddress} ${plan.name}`;
  if (basis.includes("광안")) return "부산 광안리 접근도로 추정";
  if (basis.includes("해운대")) return "부산 해운대 접근도로 추정";
  if (basis.includes("부산")) return "부산 행사장 접근도로 추정";
  if (basis.includes("태안") || basis.includes("꽃지")) return "태안 행사장 접근도로 추정";
  if (basis.includes("서울") || basis.includes("강남")) return "서울 행사장 접근도로 추정";
  if (basis.includes("인천")) return "인천 행사장 접근도로 추정";
  if (basis.includes("전북")) return "전북 행사장 접근도로 추정";
  if (basis.includes("충남") || basis.includes("충청남도")) return "충남 행사장 접근도로 추정";
  return `${plan.region || "행사장"} 접근도로 추정`;
}

function createEffectiveTrafficMapping(plan: FestivalPlan): EffectiveTrafficMapping {
  const mapping = findTrafficMapping(plan);
  if (mapping) {
    return {
      id: mapping.id,
      linkId: mapping.linkId,
      roadName: mapping.roadName,
      note: mapping.note,
      isLocalLinkMapping: true,
    };
  }

  const hash = hashText(`${plan.region} ${plan.venueAddress} ${plan.name}`);
  return {
    id: "viewt-validation-scale-adjusted",
    linkId: VIEWT_VALIDATION_LINK_IDS[hash % VIEWT_VALIDATION_LINK_IDS.length],
    roadName: inferredAccessRoadName(plan),
    note:
      "행사장 LINKID 매핑 전 단계입니다. View-T 검증 링크 교통량을 호출한 뒤 축제 지역, 수용 인원, 피크 시간 조건으로 보정합니다.",
    isLocalLinkMapping: false,
  };
}

function numberValue(value: unknown) {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
}

function riskLabel(score: number): TrafficRiskLabel {
  if (score >= 70) return "높음";
  if (score >= 40) return "보통";
  return "낮음";
}

function calculateTrafficRisk(
  links: TrafficLinkRecord[],
  weekType: "weekday" | "weekend",
  time: string,
) {
  const maxPerLane = Math.max(
    ...links.map((link) => link.totalVolume / Math.max(link.lanes ?? 1, 1)),
    0,
  );
  const weekendBonus = weekType === "weekend" ? 8 : 0;
  const hour = Number(time);
  const peakHourBonus = Number.isFinite(hour) && hour >= 17 && hour <= 21 ? 8 : 0;
  const lateNightBonus = Number.isFinite(hour) && hour >= 22 ? 6 : 0;
  return Math.min(
    100,
    Math.round((maxPerLane / 1800) * 100 + weekendBonus + peakHourBonus + lateNightBonus),
  );
}

function regionTrafficFactor(plan: FestivalPlan) {
  const basis = `${plan.region} ${plan.venueAddress} ${plan.name}`;
  if (basis.includes("부산") || basis.includes("광안") || basis.includes("해운대")) return 1.18;
  if (basis.includes("서울") || basis.includes("강남") || basis.includes("광화문")) return 1.15;
  if (basis.includes("인천")) return 1.08;
  if (basis.includes("태안") || basis.includes("충남") || basis.includes("충청남도")) return 0.82;
  return 1;
}

function festivalScaleFactor(plan: FestivalPlan, time: string) {
  const capacityFactor = clamp(plan.expectedCapacity / 36000, 0.55, 2.15);
  const hour = Number(time);
  const lateNightFactor = Number.isFinite(hour) && hour >= 22 ? 1.18 : 1;
  const eveningFactor = Number.isFinite(hour) && hour >= 17 && hour <= 21 ? 1.1 : 1;
  return capacityFactor * regionTrafficFactor(plan) * lateNightFactor * eveningFactor;
}

function applyFestivalScaleToLinks(
  links: TrafficLinkRecord[],
  plan: FestivalPlan,
  time: string,
  roadName: string,
) {
  const scale = festivalScaleFactor(plan, time);
  return links.map((link, index) => {
    const inboundVolume = Math.round(link.inboundVolume * scale);
    const outboundVolume = Math.round(link.outboundVolume * scale);
    return {
      ...link,
      roadName: index === 0 ? roadName : link.roadName,
      inboundVolume,
      outboundVolume,
      totalVolume: inboundVolume + outboundVolume,
    };
  });
}

function normalizeViewTRecords(
  records: ViewTRecord[],
  fallbackRoadName: string,
): TrafficLinkRecord[] {
  return records.map((record) => {
    const inboundVolume = numberValue(record.VALUE_IN ?? record.VALUE?.IN);
    const outboundVolume = numberValue(record.VALUE_OUT ?? record.VALUE?.OUT);
    return {
      linkId: String(record.LINKID ?? "-"),
      roadName: record.ROAD_NAME ?? record.LINKNAME ?? fallbackRoadName,
      roadRank: record.ROAD_RANK ?? record.LINKRANK,
      lanes: numberValue(record.LANES ?? record.LINKLINECNT) || undefined,
      inboundVolume,
      outboundVolume,
      totalVolume: inboundVolume + outboundVolume,
    };
  });
}

function createTrafficSourceDetails({
  linkId,
  year,
  weekType,
  time,
  links,
  statusLabel,
  note,
}: {
  linkId: string;
  year: number;
  weekType: "weekday" | "weekend";
  time: string;
  links: TrafficLinkRecord[];
  statusLabel: string;
  note: string;
}): MetricEvidenceSourceDetail[] {
  return [
    {
      sourceId: "ktdb-viewt-selected-link",
      sourceName: "KTDB/View-T 선택 링크 교통량 조회",
      sourceType: "ktdb",
      statusLabel,
      retrievedAt: new Date().toISOString(),
      endpoint: "/api/traffic/selected-link",
      query: [
        { label: "linkId", value: linkId },
        { label: "year", value: String(year) },
        { label: "weekType", value: weekType },
        { label: "time", value: time },
      ],
      records: links.map((link) => ({
        label: link.roadName,
        fields: [
          { label: "LINKID", value: link.linkId },
          { label: "도로명", value: link.roadName },
          { label: "도로등급", value: link.roadRank ?? "-" },
          { label: "차로수", value: link.lanes ? String(link.lanes) : "-" },
          { label: "진입 차량량", value: `${link.inboundVolume.toLocaleString("ko-KR")}대` },
          { label: "진출 차량량", value: `${link.outboundVolume.toLocaleString("ko-KR")}대` },
          { label: "총 교통량", value: `${link.totalVolume.toLocaleString("ko-KR")}대` },
        ],
      })),
      note,
    },
  ];
}

export function createFallbackTrafficContext(
  plan: FestivalPlan,
  reason: string,
  hour?: number,
): TrafficContext {
  const weekType = isWeekendPlan(plan) ? "weekend" : "weekday";
  const time = normalizeTime(hour);

  return {
    ...sampleTrafficContext,
    weekType,
    time,
    provenance: {
      ...sampleTrafficContext.provenance,
      fallbackReason: reason,
      retrievedAt: new Date().toISOString(),
    },
    sourceDetails: sampleTrafficSourceDetails.map((detail) => ({
      ...detail,
      query: detail.query?.map((item) =>
        item.label === "time"
          ? { ...item, value: time }
          : item.label === "weekType"
            ? { ...item, value: weekType }
            : item,
      ),
      statusLabel: "샘플 교통량 사용",
      note: `${detail.note} 사유: ${reason}`,
    })),
  };
}

export async function getTrafficContext(
  plan: FestivalPlan,
  options: TrafficOptions = {},
): Promise<TrafficContext> {
  const mapping = createEffectiveTrafficMapping(plan);
  const fetchImpl = options.fetchImpl ?? fetch;
  const weekType = isWeekendPlan(plan) ? "weekend" : "weekday";
  const time = normalizeTime(options.hour);

  try {
    const url = new URL("/api/traffic/selected-link", window.location.origin);
    url.searchParams.set("linkId", mapping.linkId);
    url.searchParams.set("year", String(DEFAULT_YEAR));
    url.searchParams.set("weekType", weekType);
    url.searchParams.set("time", time);
    const response = await fetchImpl(`${url.pathname}${url.search}`, { signal: options.signal });
    if (!response.ok) throw new Error(`Traffic proxy HTTP ${response.status}`);
    const payload = (await response.json()) as {
      result?: ViewTRecord[];
      RESULT?: ViewTRecord[];
    };
    const records = Array.isArray(payload.result)
      ? payload.result
      : Array.isArray(payload.RESULT)
        ? payload.RESULT
        : [];
    const normalizedLinks = normalizeViewTRecords(records, mapping.roadName).filter(
      (link) => link.totalVolume > 0,
    );
    const links = mapping.isLocalLinkMapping
      ? normalizedLinks
      : applyFestivalScaleToLinks(normalizedLinks, plan, time, mapping.roadName);
    if (links.length === 0) {
      throw new Error("Traffic response did not include usable link records");
    }
    const riskScore = calculateTrafficRisk(links, weekType, time);

    return {
      status: mapping.isLocalLinkMapping ? "mapped-sample" : "sample-fallback",
      year: DEFAULT_YEAR,
      weekType,
      time,
      riskScore,
      riskLabel: riskLabel(riskScore),
      links,
      provenance: {
        sourceName: mapping.isLocalLinkMapping
          ? "KTDB/View-T 선택 링크 교통량"
          : "KTDB/View-T 검증 링크 + 축제 규모 보정",
        sourceType: "public-data",
        sourceStatus: "partial-fallback",
        basisText: mapping.isLocalLinkMapping
          ? "KTDB/View-T 링크 교통량을 기준으로 행사장 접근 교통 리스크를 추정합니다."
          : "행사장 LINKID 매핑 전 단계라 View-T 검증 링크 교통량에 축제 지역, 수용 인원, 피크 시간 조건을 보정합니다.",
        fallbackText: "조회 실패 또는 링크 매핑 미확보 시 축제 규모 보정 교통량을 사용합니다.",
        retrievedAt: new Date().toISOString(),
        collectedPersonalData: false,
      },
      sourceDetails: createTrafficSourceDetails({
        linkId: mapping.linkId,
        year: DEFAULT_YEAR,
        weekType,
        time,
        links,
        statusLabel: mapping.isLocalLinkMapping
          ? "기준연도 교통량 조회 성공"
          : "View-T 호출 성공 · 축제 규모 보정",
        note: mapping.isLocalLinkMapping
          ? "기준연도 교통량 기반 접근 리스크이며 실시간 교통정보가 아닙니다."
          : mapping.note,
      }),
    };
  } catch (error) {
    if (
      options.signal?.aborted ||
      (typeof error === "object" &&
        error !== null &&
        "name" in error &&
        error.name === "AbortError")
    ) {
      throw error;
    }
    return createFallbackTrafficContext(
      plan,
      "KTDB/View-T 교통량 조회 실패로 샘플 교통량을 사용합니다.",
      options.hour,
    );
  }
}
