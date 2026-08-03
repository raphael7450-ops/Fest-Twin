import {
  sampleTrafficContext,
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

interface ViewTOdRecord {
  ZONEID?: string | number;
  ZONENAME?: string;
  ZONE_NAME?: string;
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

interface OdZoneMapping {
  zoneId: string;
  zoneName: string;
  note: string;
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
  if (basis.includes("대덕") || basis.includes("대청공원")) return "대전 대덕구 대청공원 접근도로 추정";
  if (basis.includes("대전")) return "대전 행사장 접근도로 추정";
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

function getOdZoneMapping(plan: FestivalPlan): OdZoneMapping | null {
  const basis = `${plan.region} ${plan.venueAddress} ${plan.name}`;
  if (basis.includes("대덕") || basis.includes("대청공원")) {
    return {
      zoneId: "3023060",
      zoneName: "대전광역시 대덕구",
      note: "대전 대덕구 대청공원권 축제 후보의 개최지 행정구 차량 유입량 기준입니다. 세부 행정동 ZONEID 확정 전까지 구 단위 후보값으로 표시합니다.",
    };
  }
  if (basis.includes("대전")) {
    return {
      zoneId: "3000000",
      zoneName: "대전광역시",
      note: "대전권 축제 후보의 개최지 행정구역 차량 유입량 후보 기준입니다. 세부 행정동 ZONEID 확정 전까지 광역 단위 후보값으로 표시합니다.",
    };
  }
  if (basis.includes("광안") || basis.includes("수영구")) {
    return {
      zoneId: "2607065",
      zoneName: "부산광역시 수영구 광안2동",
      note: "광안리 일대 축제장 후보의 개최지 행정동 차량 유입량 기준입니다.",
    };
  }
  if (basis.includes("부산")) {
    return {
      zoneId: "2607065",
      zoneName: "부산광역시 수영구 광안2동",
      note: "부산권 축제 데모의 개최지 행정동 차량 유입량 기준입니다.",
    };
  }
  if (basis.includes("태안") || basis.includes("꽃지")) {
    return {
      zoneId: "4482530",
      zoneName: "충청남도 태안군 안면읍",
      note: "태안 안면읍권 축제 후보의 개최지 행정동 차량 유입량 기준입니다.",
    };
  }
  if (basis.includes("강남") || basis.includes("삼성")) {
    return {
      zoneId: "1123078",
      zoneName: "서울특별시 강남구 삼성1동",
      note: "강남 삼성동 축제장 후보의 개최지 행정동 차량 유입량 기준입니다.",
    };
  }
  if (basis.includes("서울") || basis.includes("광화문")) {
    return {
      zoneId: "1101053",
      zoneName: "서울특별시 종로구 사직동",
      note: "서울 도심 축제장 후보의 개최지 행정동 차량 유입량 기준입니다.",
    };
  }
  return null;
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

function normalizeOdRecords(records: ViewTOdRecord[]) {
  return records
    .map((record) => {
      const value = record.VALUE && typeof record.VALUE === "object" ? record.VALUE : {};
      const inboundVolume = numberValue(record.VALUE_IN ?? value.IN);
      const outboundVolume = numberValue(record.VALUE_OUT ?? value.OUT);
      return {
        zoneId: String(record.ZONEID ?? "-"),
        zoneName: record.ZONENAME ?? record.ZONE_NAME ?? "-",
        inboundVolume,
        outboundVolume,
        totalVolume: inboundVolume + outboundVolume,
      };
    })
    .filter((record) => record.totalVolume > 0);
}

function createOdSourceDetails({
  zoneId,
  zoneName,
  year,
  weekType,
  time,
  records,
  note,
}: {
  zoneId: string;
  zoneName: string;
  year: number;
  weekType: "weekday" | "weekend";
  time: string;
  records: ReturnType<typeof normalizeOdRecords>;
  note: string;
}): MetricEvidenceSourceDetail[] {
  const totalInbound = records.reduce((sum, record) => sum + record.inboundVolume, 0);
  const totalOutbound = records.reduce((sum, record) => sum + record.outboundVolume, 0);
  return [
    {
      sourceId: "ktdb-viewt-emd-od-inflow",
      sourceName: "KTDB/View-T 개최지 행정동 차량 유입량",
      sourceType: "ktdb",
      statusLabel: "기준연도 OD 유입량 조회 성공",
      retrievedAt: new Date().toISOString(),
      endpoint: "/api/traffic/od-emd",
      query: [
        { label: "zoneId", value: zoneId },
        { label: "year", value: String(year) },
        { label: "weekType", value: weekType },
        { label: "time", value: time },
      ],
      records: [
        {
          label: zoneName,
          fields: [
            { label: "ZONEID", value: zoneId },
            { label: "개최지 행정동", value: zoneName },
            { label: "진입 차량량", value: `${totalInbound.toLocaleString("ko-KR")}대/일` },
            { label: "진출 차량량", value: `${totalOutbound.toLocaleString("ko-KR")}대/일` },
            {
              label: "총 차량 이동량",
              value: `${(totalInbound + totalOutbound).toLocaleString("ko-KR")}대/일`,
            },
          ],
        },
        ...records.slice(0, 3).map((record) => ({
          label: record.zoneName,
          fields: [
            { label: "ZONEID", value: record.zoneId },
            { label: "진입", value: `${record.inboundVolume.toLocaleString("ko-KR")}대/일` },
            { label: "진출", value: `${record.outboundVolume.toLocaleString("ko-KR")}대/일` },
          ],
        })),
      ],
      note:
        `${note} 특정 월/일 행사일 실측이 아니라 View-T 기준연도 주중/주말·시간대별 행정동 OD 유입량입니다.`,
    },
  ];
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

function createPlanFallbackLinks(plan: FestivalPlan, time: string): TrafficLinkRecord[] {
  const roadName = inferredAccessRoadName(plan);
  const baseInboundVolume = Math.round(sampleTrafficContext.links[0].inboundVolume * 0.72);
  const baseOutboundVolume = Math.round(sampleTrafficContext.links[0].outboundVolume * 0.72);
  return applyFestivalScaleToLinks(
    [
      {
        ...sampleTrafficContext.links[0],
        roadName,
        roadRank: "행사장 접근도로",
        inboundVolume: baseInboundVolume,
        outboundVolume: baseOutboundVolume,
        totalVolume: baseInboundVolume + baseOutboundVolume,
      },
    ],
    plan,
    time,
    roadName,
  );
}

function createPlanFallbackSourceDetails({
  plan,
  reason,
  weekType,
  time,
  links,
}: {
  plan: FestivalPlan;
  reason: string;
  weekType: "weekday" | "weekend";
  time: string;
  links: TrafficLinkRecord[];
}): MetricEvidenceSourceDetail[] {
  return [
    {
      sourceId: "sample-traffic-link",
      sourceName: "지역 보정 샘플 교통량 근거",
      sourceType: "sample",
      statusLabel: "샘플 교통량 사용",
      endpoint: "/api/traffic/selected-link",
      query: [
        { label: "linkId", value: "View-T 링크 매핑 대기" },
        { label: "year", value: String(DEFAULT_YEAR) },
        { label: "weekType", value: weekType },
        { label: "time", value: time },
      ],
      records: links.map((link) => ({
        label: link.roadName,
        fields: [
          { label: "행사장", value: plan.venueAddress },
          { label: "도로명", value: link.roadName },
          { label: "도로등급", value: link.roadRank ?? "-" },
          { label: "차로수", value: link.lanes ? String(link.lanes) : "-" },
          { label: "진입 차량량", value: `${link.inboundVolume.toLocaleString("ko-KR")}대` },
          { label: "진출 차량량", value: `${link.outboundVolume.toLocaleString("ko-KR")}대` },
          { label: "총 교통량", value: `${link.totalVolume.toLocaleString("ko-KR")}대` },
        ],
      })),
      note:
        `View-T 링크/행정동 자동 매핑이 실패해도 서울 기본 샘플을 쓰지 않고, 선택 축제의 지역·주소·수용 인원·시간대를 반영해 보정합니다. 사유: ${reason}`,
    },
  ];
}

async function getOdInflowSourceDetails({
  plan,
  fetchImpl,
  signal,
  year,
  weekType,
  time,
}: {
  plan: FestivalPlan;
  fetchImpl: typeof fetch;
  signal?: AbortSignal;
  year: number;
  weekType: "weekday" | "weekend";
  time: string;
}): Promise<{ sourceDetails: MetricEvidenceSourceDetail[]; riskAdjustment: number }> {
  const zone = getOdZoneMapping(plan);
  if (!zone) return { sourceDetails: [], riskAdjustment: 0 };

  const url = new URL("/api/traffic/od-emd", window.location.origin);
  url.searchParams.set("zoneId", zone.zoneId);
  url.searchParams.set("year", String(year));
  url.searchParams.set("weekType", weekType);
  url.searchParams.set("time", time);

  try {
    const response = await fetchImpl(`${url.pathname}${url.search}`, { signal });
    if (!response.ok) throw new Error(`Traffic OD proxy HTTP ${response.status}`);
    const payload = (await response.json()) as {
      result?: ViewTOdRecord[];
      RESULT?: ViewTOdRecord[];
    };
    const records = normalizeOdRecords(
      Array.isArray(payload.result)
        ? payload.result
        : Array.isArray(payload.RESULT)
          ? payload.RESULT
          : [],
    );
    if (records.length === 0) return { sourceDetails: [], riskAdjustment: 0 };
    const totalInbound = records.reduce((sum, record) => sum + record.inboundVolume, 0);
    return {
      sourceDetails: createOdSourceDetails({
        zoneId: zone.zoneId,
        zoneName: zone.zoneName,
        year,
        weekType,
        time,
        records,
        note: zone.note,
      }),
      riskAdjustment: clamp(Math.round(totalInbound / 1200), 0, 16),
    };
  } catch (error) {
    if (
      signal?.aborted ||
      (typeof error === "object" &&
        error !== null &&
        "name" in error &&
        error.name === "AbortError")
    ) {
      throw error;
    }
    return { sourceDetails: [], riskAdjustment: 0 };
  }
}

export function createFallbackTrafficContext(
  plan: FestivalPlan,
  reason: string,
  hour?: number,
): TrafficContext {
  const weekType = isWeekendPlan(plan) ? "weekend" : "weekday";
  const time = normalizeTime(hour);
  const links = createPlanFallbackLinks(plan, time);
  const riskScore = calculateTrafficRisk(links, weekType, time);

  return {
    ...sampleTrafficContext,
    weekType,
    time,
    riskScore,
    riskLabel: riskLabel(riskScore),
    links,
    provenance: {
      ...sampleTrafficContext.provenance,
      basisText:
        "View-T 조회 실패 시 선택 축제의 지역, 행사장 주소, 수용 인원, 피크 시간 조건을 반영한 보정 교통량을 사용합니다.",
      fallbackText:
        "실제 링크 교통량을 확보하지 못한 경우에도 서울 기본 도로명으로 표시하지 않고 개최지 기준 샘플로 대체합니다.",
      fallbackReason: reason,
      retrievedAt: new Date().toISOString(),
    },
    sourceDetails: createPlanFallbackSourceDetails({ plan, reason, weekType, time, links }),
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
    const odInflow = await getOdInflowSourceDetails({
      plan,
      fetchImpl,
      signal: options.signal,
      year: DEFAULT_YEAR,
      weekType,
      time,
    });
    const adjustedRiskScore = clamp(riskScore + odInflow.riskAdjustment, 0, 100);

    return {
      status: mapping.isLocalLinkMapping ? "mapped-sample" : "sample-fallback",
      year: DEFAULT_YEAR,
      weekType,
      time,
      riskScore: adjustedRiskScore,
      riskLabel: riskLabel(adjustedRiskScore),
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
      sourceDetails: [
        ...odInflow.sourceDetails,
        ...createTrafficSourceDetails({
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
      ],
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
