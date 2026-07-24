import type {
  DemandBackdataContext,
  DemandBackdataSimilarFestival,
  MetricEvidenceSourceDetail,
} from "../domain/types";

export const sampleRegionalFestivalRecords: DemandBackdataSimilarFestival[] = [
  {
    id: "mcst-gangnam-media-winter",
    name: "강남 미디어 윈터페스타",
    region: "서울 강남구",
    type: "도시문화/미디어",
    periodLabel: "겨울 야간형",
    budgetMillionKrw: 920,
    visitors: 54000,
    similarityScore: 96,
    sourceName: "문화체육관광부_지역축제 정보",
  },
  {
    id: "mcst-seoul-light-gwanghwamun",
    name: "서울라이트 광화문",
    region: "서울 종로구",
    type: "도시문화/미디어",
    periodLabel: "겨울 야간형",
    budgetMillionKrw: 1100,
    visitors: 61000,
    similarityScore: 82,
    sourceName: "문화체육관광부_지역축제 정보",
  },
  {
    id: "mcst-digital-media-festival",
    name: "디지털 미디어 축제",
    region: "서울",
    type: "도시문화/미디어",
    periodLabel: "야간형",
    budgetMillionKrw: 680,
    visitors: 32000,
    similarityScore: 68,
    sourceName: "문화체육관광부_지역축제 정보",
  },
  {
    id: "mcst-local-food-festival",
    name: "지역 먹거리 축제",
    region: "전북",
    type: "먹거리/특산물",
    periodLabel: "가을 주간형",
    budgetMillionKrw: 450,
    visitors: 28000,
    similarityScore: 45,
    sourceName: "문화체육관광부_지역축제 정보",
  },
];

export const sampleDemandBackdataSourceDetails: MetricEvidenceSourceDetail[] = [
  {
    sourceId: "mcst-regional-festival-normalized",
    sourceName: "문화체육관광부_지역축제 정보",
    sourceType: "sample",
    statusLabel: "파일데이터 정규화 샘플",
    endpoint: "data.go.kr/data/15143175/fileData.do",
    records: sampleRegionalFestivalRecords.slice(0, 3).map((festival) => ({
      label: festival.name,
      fields: [
        { label: "지역", value: festival.region },
        { label: "유형", value: festival.type },
        { label: "기간 유형", value: festival.periodLabel },
        {
          label: "방문객 수",
          value: `${festival.visitors?.toLocaleString("ko-KR")}명`,
        },
        {
          label: "예산",
          value: `${festival.budgetMillionKrw?.toLocaleString("ko-KR")}백만원`,
        },
        { label: "유사도", value: `${festival.similarityScore}점` },
      ],
    })),
    note: "지역축제 파일데이터의 방문객 수와 예산 항목을 수요 예측 기준선으로 쓰기 위한 정규화 샘플입니다.",
  },
];

export const sampleDemandBackdataContext: DemandBackdataContext = {
  status: "file-normalized",
  similarFestivalBaselines: sampleRegionalFestivalRecords.slice(0, 3),
  sourceDetails: sampleDemandBackdataSourceDetails,
};
