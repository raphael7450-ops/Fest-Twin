import { sampleTrafficContext, sampleTrafficSourceDetails, trafficLinkMappings } from "../data/sampleTraffic";
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
  ROAD_RANK?: string;
  LANES?: string | number;
  VALUE_IN?: string | number;
  VALUE_OUT?: string | number;
}

const DEFAULT_YEAR = 2025;

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

function numberValue(value: unknown) {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
}

function riskLabel(score: number): TrafficRiskLabel {
  if (score >= 70) return "높음";
  if (score >= 40) return "보통";
  return "낮음";
}

function calculateTrafficRisk(links: TrafficLinkRecord[], weekType: "weekday" | "weekend", time: string) {
  const maxPerLane = Math.max(...links.map((link) => link.totalVolume / Math.max(link.lanes ?? 1, 1)), 0);
  const weekendBonus = weekType === "weekend" ? 8 : 0;
  const hour = Number(time);
  const peakHourBonus = Number.isFinite(hour) && hour >= 17 && hour <= 21 ? 8 : 0;
  return Math.min(100, Math.round((maxPerLane / 1800) * 100 + weekendBonus + peakHourBonus));
}

function normalizeViewTRecords(records: ViewTRecord[], fallbackRoadName: string): TrafficLinkRecord[] {
  return records.map((record) => {
    const inboundVolume = numberValue(record.VALUE_IN);
    const outboundVolume = numberValue(record.VALUE_OUT);
    return {
      linkId: String(record.LINKID ?? "-"),
      roadName: record.ROAD_NAME ?? fallbackRoadName,
      roadRank: record.ROAD_RANK,
      lanes: numberValue(record.LANES) || undefined,
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
  return [{
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
  }];
}

export function createFallbackTrafficContext(plan: FestivalPlan, reason: string, hour?: number): TrafficContext {
  return {
    ...sampleTrafficContext,
    time: normalizeTime(hour),
    provenance: {
      ...sampleTrafficContext.provenance,
      fallbackReason: reason,
      retrievedAt: new Date().toISOString(),
    },
    sourceDetails: sampleTrafficSourceDetails.map((detail) => ({
      ...detail,
      statusLabel: "샘플 교통량 사용",
      note: `${detail.note} 사유: ${reason}`,
    })),
  };
}

export async function getTrafficContext(plan: FestivalPlan, options: TrafficOptions = {}): Promise<TrafficContext> {
  const mapping = findTrafficMapping(plan);
  const fetchImpl = options.fetchImpl ?? fetch;
  const weekType = isWeekendPlan(plan) ? "weekend" : "weekday";
  const time = normalizeTime(options.hour);

  if (!mapping) return createFallbackTrafficContext(plan, "행사장에 매핑된 KTDB LINKID가 없어 샘플 교통량을 사용합니다.", options.hour);

  try {
    const url = new URL("/api/traffic/selected-link", window.location.origin);
    url.searchParams.set("linkId", mapping.linkId);
    url.searchParams.set("year", String(DEFAULT_YEAR));
    url.searchParams.set("weekType", weekType);
    url.searchParams.set("time", time);
    const response = await fetchImpl(`${url.pathname}${url.search}`, { signal: options.signal });
    if (!response.ok) throw new Error(`Traffic proxy HTTP ${response.status}`);
    const payload = await response.json() as { result?: ViewTRecord[] };
    const links = normalizeViewTRecords(Array.isArray(payload.result) ? payload.result : [], mapping.roadName)
      .filter((link) => link.totalVolume > 0);
    if (links.length === 0) throw new Error("Traffic response did not include usable link records");
    const riskScore = calculateTrafficRisk(links, weekType, time);
    return {
      status: "live",
      year: DEFAULT_YEAR,
      weekType,
      time,
      riskScore,
      riskLabel: riskLabel(riskScore),
      links,
      provenance: {
        sourceName: "KTDB/View-T 선택 링크 교통량",
        sourceType: "public-data",
        sourceStatus: "live",
        basisText: "KTDB/View-T 링크 교통량을 기준으로 행사장 접근 교통 리스크를 추정합니다.",
        fallbackText: "조회 실패 또는 링크 매핑 누락 시 샘플 교통량을 사용합니다.",
        retrievedAt: new Date().toISOString(),
        collectedPersonalData: false,
      },
      sourceDetails: createTrafficSourceDetails({
        linkId: mapping.linkId,
        year: DEFAULT_YEAR,
        weekType,
        time,
        links,
        statusLabel: "기준연도 교통량 조회 성공",
        note: "2025년 기준연도 교통량 기반 접근 리스크이며 실시간 교통정보가 아닙니다.",
      }),
    };
  } catch (error) {
    if (options.signal?.aborted || (typeof error === "object" && error !== null && "name" in error && error.name === "AbortError")) {
      throw error;
    }
    return createFallbackTrafficContext(plan, "KTDB/View-T 교통량 조회 실패로 샘플 교통량을 사용합니다.", options.hour);
  }
}
