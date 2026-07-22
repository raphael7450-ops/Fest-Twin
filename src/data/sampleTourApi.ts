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
      sourceId: "sample-festival-detail",
      sourceName: "TourAPI 異뺤젣 ?곸꽭 ?섑뵆",
      sourceType: "tourapi",
      statusLabel: "?섑뵆 ?곗씠???ъ슜",
      retrievedAt: "?섑뵆 湲곗?",
      endpoint: "/api/tour/detail",
      query: [{ label: "contentid", value: "sample-festival" }],
      records: [
        {
          label: "?섑뵆 異뺤젣",
          fields: [
            { label: "contentid", value: "sample-festival" },
            { label: "title", value: "?쒖슱鍮쏆큹濡깆텞???덉떆" },
            { label: "addr1", value: "?쒖슱?밸퀎??醫낅줈援??몄쥌?濡??쇰?" },
            { label: "eventstartdate", value: "2026-12-01" },
            { label: "eventenddate", value: "2026-12-31" },
            { label: "mapx/mapy", value: "126.9769, 37.5759" },
          ],
        },
      ],
      note: "TourAPI ?곌껐??遺덇??ν븳 ?섍꼍?먯꽌???곕え ?먮쫫???뺤씤?섍린 ?꾪븳 ?섑뵆 洹쇨굅?낅땲??",
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
