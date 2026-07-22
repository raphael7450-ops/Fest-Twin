import type { TourismContext } from "../domain/types";

export const sampleTourismContext: TourismContext = {
  provenance: {
    sourceName: "한국관광공사 TourAPI 실제 예시 기반 샘플",
    sourceType: "public-data",
    basisText:
      "2026년 서울 축제 조회에서 확인한 강남 미디어 윈터페스타 메타데이터와 주변 관광정보 형태를 예측 근거로 사용합니다.",
    fallbackText:
      "실제 API 키가 없거나 호출에 실패하면 TourAPI 형태의 샘플 데이터를 사용합니다.",
    collectedPersonalData: false,
  },
  sourceDetails: [
    {
      sourceId: "sample-nearby-spots",
      sourceName: "샘플 주변 관광지",
      sourceType: "sample",
      statusLabel: "샘플 보완 데이터",
      records: [
        { label: "코엑스", fields: [{ label: "매력도 점수", value: "92점" }] },
        { label: "스타필드 코엑스몰", fields: [{ label: "매력도 점수", value: "86점" }] },
        { label: "봉은사", fields: [{ label: "매력도 점수", value: "78점" }] },
        { label: "무역센터 일대", fields: [{ label: "매력도 점수", value: "74점" }] },
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
          label: "강남 미디어 윈터페스타",
          fields: [
            { label: "추정 방문객", value: "54,000명" },
            { label: "주제 유사도", value: "0.96" },
          ],
        },
        {
          label: "서울라이트 광화문",
          fields: [
            { label: "추정 방문객", value: "61,000명" },
            { label: "주제 유사도", value: "0.82" },
          ],
        },
        {
          label: "도심 미디어아트 축제",
          fields: [
            { label: "추정 방문객", value: "32,000명" },
            { label: "주제 유사도", value: "0.68" },
          ],
        },
      ],
      note: "TourAPI 유사 축제 조회를 사용할 수 없을 때 수요 계산에 사용하는 비개인 샘플입니다.",
    },
  ],
  nearbySpots: [
    { id: "t1", name: "코엑스", category: "관광지", distanceKm: 0.1, appealScore: 92 },
    { id: "t2", name: "스타필드 코엑스몰", category: "쇼핑", distanceKm: 0.3, appealScore: 86 },
    { id: "t3", name: "봉은사", category: "문화", distanceKm: 0.8, appealScore: 78 },
    { id: "t4", name: "무역센터 일대", category: "관광지", distanceKm: 0.4, appealScore: 74 },
  ],
  similarFestivals: [
    { id: "3439947", name: "강남 미디어 윈터페스타", region: "서울 강남구", visitors: 54000, themeOverlap: 0.96 },
    { id: "3073454", name: "서울라이트 광화문", region: "서울 종로구", visitors: 61000, themeOverlap: 0.82 },
    { id: "f3", name: "도심 미디어아트 축제", region: "서울", visitors: 32000, themeOverlap: 0.68 },
  ],
};
