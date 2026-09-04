import type { TourismContext } from "../domain/types";

export const sampleTourismContext: TourismContext = {
  provenance: {
    sourceName: "TourAPI 형태·서울시/서울관광재단 공식 행사 정보 기반 샘플",
    sourceType: "public-data",
    basisText:
      "2026년 서울 윈터페스타 & 빛초롱축제의 광화문광장 및 청계광장 개최 정보를 첫 화면 예측 근거로 사용합니다.",
    fallbackText:
      "실제 API 키가 없거나 호출에 실패하면 서울 윈터페스타 & 빛초롱축제 형태의 샘플 데이터를 사용합니다.",
    collectedPersonalData: false,
  },
  sourceDetails: [
    {
      sourceId: "sample-nearby-spots",
      sourceName: "샘플 주변 관광지",
      sourceType: "sample",
      statusLabel: "샘플 보완 데이터",
      records: [
        { label: "경복궁", fields: [{ label: "매력도 점수", value: "96점" }] },
        { label: "청계천", fields: [{ label: "매력도 점수", value: "94점" }] },
        { label: "세종문화회관", fields: [{ label: "매력도 점수", value: "90점" }] },
        { label: "인사동 문화의 거리", fields: [{ label: "매력도 점수", value: "86점" }] },
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
          label: "서울 윈터페스타 & 빛초롱축제",
          fields: [
            { label: "추정 방문객", value: "1,000,000명" },
            { label: "주제 유사도", value: "0.98" },
          ],
        },
        {
          label: "DDP 서울라이트 겨울축제",
          fields: [
            { label: "추정 방문객", value: "600,000명" },
            { label: "주제 유사도", value: "0.85" },
          ],
        },
        {
          label: "부산 크리스마스트리문화축제",
          fields: [
            { label: "추정 방문객", value: "500,000명" },
            { label: "주제 유사도", value: "0.78" },
          ],
        },
      ],
      note: "TourAPI 유사 축제 조회를 사용할 수 없을 때 수요 계산에 사용하는 비개인 샘플입니다.",
    },
  ],
  nearbySpots: [
    { id: "t1", name: "경복궁", category: "문화재", distanceKm: 0.3, appealScore: 96 },
    { id: "t2", name: "청계천", category: "수변공간", distanceKm: 0.1, appealScore: 94 },
    { id: "t3", name: "세종문화회관", category: "공연장", distanceKm: 0.1, appealScore: 90 },
    { id: "t4", name: "인사동 문화의 거리", category: "관광지", distanceKm: 0.8, appealScore: 86 },
  ],
  similarFestivals: [
    { id: "seoul-winter-festa-2026", name: "서울 윈터페스타 & 빛초롱축제", region: "서울 종로구", visitors: 1000000, themeOverlap: 0.98 },
    { id: "ddp-seoul-light", name: "DDP 서울라이트 겨울축제", region: "서울 중구", visitors: 600000, themeOverlap: 0.85 },
    { id: "busan-christmas-tree", name: "부산 크리스마스트리문화축제", region: "부산 중구", visitors: 500000, themeOverlap: 0.78 },
  ],
};
