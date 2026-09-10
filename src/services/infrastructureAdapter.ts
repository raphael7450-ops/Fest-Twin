import type { FestivalPlan, MetricEvidenceSourceDetail } from "../domain/types";

export interface VenueInfrastructureContext {
  sourceDetails: MetricEvidenceSourceDetail[];
}

const providers = [
  { id: "tago-public-transit-accessibility", name: "버스 정류장", path: "/api/transit/nearby-stops", radius: 500 },
  { id: "small-business-commercial-density", name: "주변 상권", path: "/api/commercial/nearby-stores", radius: 1000 },
  { id: "emergency-hospital-and-119-safety-center", name: "응급의료기관", path: "/api/emergency/nearby-facilities", radius: 5000 },
] as const;

export function createUnavailableInfrastructureContext(): VenueInfrastructureContext {
  return { sourceDetails: providers.map((provider) => ({
    sourceId: provider.id, sourceName: provider.name, sourceType: "sample",
    statusLabel: "자료 미확보", records: [], endpoint: provider.path,
    note: "선택 행사장의 좌표와 API 응답을 확인하지 못했습니다. 다른 지역이나 샘플 시설로 대체하지 않습니다.",
  })) };
}

export async function getInfrastructureContext(
  plan: FestivalPlan,
  options: { fetchImpl?: typeof fetch; signal?: AbortSignal } = {},
): Promise<VenueInfrastructureContext> {
  options.signal?.throwIfAborted();
  const fallback = createUnavailableInfrastructureContext();
  const point = plan.venueCoordinates;
  if (!point || !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) return fallback;
  const sourceDetails = await Promise.all(providers.map(async (provider, index): Promise<MetricEvidenceSourceDetail> => {
    try {
      const params = new URLSearchParams({ lat: String(point.latitude), lon: String(point.longitude) });
      const response = await (options.fetchImpl ?? fetch)(`${provider.path}?${params}`, { signal: options.signal });
      if (!response.ok) return fallback.sourceDetails[index];
      const data = await response.json();
      const received = data.provenance?.requestedCoordinates;
      if (!["live", "empty"].includes(data.status) || !Array.isArray(data.observations) ||
          received?.latitude !== point.latitude || received?.longitude !== point.longitude ||
          !Number.isFinite(Date.parse(data.provenance?.retrievedAt))) return fallback.sourceDetails[index];
      const records = data.observations.filter((item: Record<string, unknown>) =>
        item && typeof item.name === "string" && typeof item.distanceMeters === "number" &&
        Number.isFinite(item.distanceMeters) && item.distanceMeters >= 0 && item.distanceMeters <= provider.radius,
      ).map((item: { name: string; address?: string; category?: string; distanceMeters: number }) => ({
        label: item.name,
        fields: [
          { label: "주소", value: typeof item.address === "string" && item.address ? item.address : "주소 미제공" },
          { label: "분류", value: typeof item.category === "string" && item.category ? item.category : "분류 미제공" },
          { label: "직선거리", value: `${Math.round(item.distanceMeters).toLocaleString("ko-KR")}m` },
        ],
      }));
      if ((data.status === "live" && !records.length) || (data.status === "empty" && records.length)) return fallback.sourceDetails[index];
      return {
        sourceId: provider.id, sourceName: provider.name, sourceType: "public-data",
        statusLabel: data.status === "empty" ? "API 조회 0건" : `위치 확인 ${records.length}곳`,
        retrievedAt: data.provenance.retrievedAt, endpoint: provider.path,
        query: [
          { label: "위도", value: String(point.latitude) }, { label: "경도", value: String(point.longitude) },
          { label: "직선거리 범위", value: `${provider.radius}m` },
        ],
        calculationInputs: provider.id === "small-business-commercial-density" && Number.isInteger(data.providerTotalCount) && data.providerTotalCount >= 0
          ? [{ label: "API 전체 조회 건수", value: `${data.providerTotalCount.toLocaleString("ko-KR")}건 (목록은 첫 100건)` }] : [],
        records,
        note: `${typeof data.note === "string" ? data.note : "API 반환 목록의 좌표 확인 결과입니다."} 현재 시설 자료이며 축제 개최일의 운영 여부·수용 능력·이송 시간을 보장하지 않습니다.`,
      };
    } catch (error) {
      if (options.signal?.aborted) throw error;
      return fallback.sourceDetails[index];
    }
  }));
  return { sourceDetails };
}
