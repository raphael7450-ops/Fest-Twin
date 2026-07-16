import type { TourismContext } from "../domain/types";

export const sampleTourismContext: TourismContext = {
  provenance: {
    sourceName: "한국관광공사 TourAPI 샘플",
    sourceType: "public-data",
    basisText:
      "샘플 관광정보와 행사 메타데이터 기반 추정 수요 프록시를 예측 근거로 사용합니다.",
    fallbackText:
      "실제 API 키가 없거나 호출에 실패하면 TourAPI 형태의 샘플 데이터를 사용합니다.",
    collectedPersonalData: false,
  },
  nearbySpots: [
    { id: "t1", name: "여의도 한강공원", category: "관광지", distanceKm: 0.2, appealScore: 94 },
    { id: "t2", name: "IFC몰", category: "쇼핑", distanceKm: 1.1, appealScore: 78 },
    { id: "t3", name: "63스퀘어", category: "전망", distanceKm: 1.8, appealScore: 82 },
    { id: "t4", name: "샛강생태공원", category: "문화", distanceKm: 3.6, appealScore: 72 },
  ],
  similarFestivals: [
    { id: "f1", name: "서울 밤도깨비 야시장", region: "서울", visitors: 62000, themeOverlap: 0.92 },
    { id: "f2", name: "한강 불빛 축제", region: "서울", visitors: 48000, themeOverlap: 0.76 },
    { id: "f3", name: "도심 푸드 페스타", region: "경기", visitors: 28000, themeOverlap: 0.64 },
  ],
};
