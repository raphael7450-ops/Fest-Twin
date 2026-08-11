import type { TourismContext } from "../domain/types";

export const sampleTourismContext: TourismContext = {
  provenance: {
    sourceName: "TourAPI 형태·서울시/한화 공식 행사 정보 기반 샘플",
    sourceType: "public-data",
    basisText:
      "2026년 서울세계불꽃축제의 여의도 및 이촌 한강공원 개최 정보를 첫 화면 예측 근거로 사용합니다.",
    fallbackText:
      "실제 API 키가 없거나 호출에 실패하면 서울세계불꽃축제 형태의 샘플 데이터를 사용합니다.",
    collectedPersonalData: false,
  },
  sourceDetails: [
    {
      sourceId: "sample-nearby-spots",
      sourceName: "샘플 주변 관광지",
      sourceType: "sample",
      statusLabel: "샘플 보완 데이터",
      records: [
        { label: "여의도 한강공원", fields: [{ label: "매력도 점수", value: "96점" }] },
        { label: "이촌 한강공원", fields: [{ label: "매력도 점수", value: "88점" }] },
        { label: "여의도공원", fields: [{ label: "매력도 점수", value: "82점" }] },
        { label: "IFC몰·더현대 서울", fields: [{ label: "매력도 점수", value: "80점" }] },
      ],
      note: "TourAPI 주변 관광지 조회를 사용할 수 없을 때 계산에 사용하는 비개인 샘플입니다.",
    },
    {
      sourceId: "sample-similar-festivals",
      sourceName: "샘플 유사 축제",
      sourceType: "sample",
      statusLabel: "샘플 보완 데이터",
      records: [
        {
          label: "서울세계불꽃축제",
          fields: [
            { label: "추정 방문객", value: "1,000,000명" },
            { label: "주제 유사도", value: "0.98" },
          ],
        },
        {
          label: "부산불꽃축제",
          fields: [
            { label: "추정 방문객", value: "1,000,000명" },
            { label: "주제 유사도", value: "0.88" },
          ],
        },
        {
          label: "한강 드론·라이트 쇼",
          fields: [
            { label: "추정 방문객", value: "300,000명" },
            { label: "주제 유사도", value: "0.72" },
          ],
        },
      ],
      note: "TourAPI 유사 축제 조회를 사용할 수 없을 때 수요 계산에 사용하는 비개인 샘플입니다.",
    },
  ],
  nearbySpots: [
    { id: "t1", name: "여의도 한강공원", category: "관광지", distanceKm: 0.1, appealScore: 96 },
    { id: "t2", name: "이촌 한강공원", category: "관광지", distanceKm: 1.4, appealScore: 88 },
    { id: "t3", name: "여의도공원", category: "공원", distanceKm: 0.9, appealScore: 82 },
    { id: "t4", name: "IFC몰·더현대 서울", category: "쇼핑", distanceKm: 1.1, appealScore: 80 },
  ],
  similarFestivals: [
    { id: "seoul-fireworks-2026", name: "서울세계불꽃축제", region: "서울 영등포구", visitors: 1000000, themeOverlap: 0.98 },
    { id: "busan-fireworks", name: "부산불꽃축제", region: "부산 수영구", visitors: 1000000, themeOverlap: 0.88 },
    { id: "hangang-light-show", name: "한강 드론·라이트 쇼", region: "서울 한강공원", visitors: 300000, themeOverlap: 0.72 },
  ],
};
