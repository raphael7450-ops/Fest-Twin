import type { MetricEvidenceSourceDetail, TrafficContext } from "../domain/types";

export interface TrafficLinkMapping {
  id: string;
  regionKeyword: string;
  venueKeyword?: string;
  linkId: string;
  roadName: string;
  note: string;
}

export const trafficLinkMappings: TrafficLinkMapping[] = [
  {
    id: "gangnam-teheran",
    regionKeyword: "서울",
    venueKeyword: "강남",
    linkId: "TEHERAN-001",
    roadName: "테헤란로",
    note: "강남권 축제 인근 대표 간선도로의 샘플 링크입니다.",
  },
  {
    id: "gwanghwamun-sejong",
    regionKeyword: "서울",
    venueKeyword: "광화문",
    linkId: "SEJONG-001",
    roadName: "세종대로",
    note: "광화문권 축제 인근 대표 간선도로의 샘플 링크입니다.",
  },
];

export const sampleTrafficSourceDetails: MetricEvidenceSourceDetail[] = [
  {
    sourceId: "sample-traffic-link",
    sourceName: "샘플 교통량 근거",
    sourceType: "sample",
    statusLabel: "샘플 교통량 사용",
    endpoint: "/api/traffic/selected-link",
    query: [
      { label: "linkId", value: "TEHERAN-001" },
      { label: "year", value: "2025" },
      { label: "weekType", value: "weekend" },
      { label: "time", value: "20" },
    ],
    records: [
      {
        label: "테헤란로",
        fields: [
          { label: "LINKID", value: "TEHERAN-001" },
          { label: "도로명", value: "테헤란로" },
          { label: "도로등급", value: "주간선도로" },
          { label: "차로수", value: "6" },
          { label: "진입 차량량", value: "3,200대" },
          { label: "진출 차량량", value: "2,800대" },
          { label: "총 교통량", value: "6,000대" },
        ],
      },
    ],
    note: "View-T 링크 자동 매핑 이전에는 샘플 교통량을 사용합니다. 기준연도 교통량 기반 접근 리스크이며 실시간 교통정보가 아닙니다.",
  },
];

export const sampleTrafficContext: TrafficContext = {
  status: "sample-fallback",
  year: 2025,
  weekType: "weekend",
  time: "20",
  riskScore: 68,
  riskLabel: "보통",
  links: [
    {
      linkId: "TEHERAN-001",
      roadName: "테헤란로",
      roadRank: "주간선도로",
      lanes: 6,
      inboundVolume: 3200,
      outboundVolume: 2800,
      totalVolume: 6000,
    },
  ],
  provenance: {
    sourceName: "KTDB/View-T 교통량 샘플",
    sourceType: "public-data",
    sourceStatus: "sample-fallback",
    basisText: "KTDB/View-T 링크 교통량 구조를 기준으로 한 샘플 접근 교통 리스크입니다.",
    fallbackText: "링크 매핑 또는 View-T 조회 실패 시 샘플 교통량을 사용합니다.",
    fallbackReason: "초기 연동 전 샘플 교통량 사용",
    retrievedAt: "샘플 기준",
    collectedPersonalData: false,
  },
  sourceDetails: sampleTrafficSourceDetails,
};
