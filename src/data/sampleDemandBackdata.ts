import type {
  DemandBackdataContext,
  DemandBackdataSimilarFestival,
  MetricEvidenceSourceDetail,
} from "../domain/types";

export const sampleRegionalFestivalRecords: DemandBackdataSimilarFestival[] = [
  {
    id: "mcst-seoul-winter-festa",
    name: "서울 윈터페스타 & 빛초롱축제",
    region: "서울 종로구",
    type: "야간관광/빛축제",
    periodLabel: "겨울 야간 집중형",
    budgetMillionKrw: 1800,
    visitors: 1000000,
    similarityScore: 98,
    sourceName: "문화체육관광부_지역축제 정보",
  },
  {
    id: "mcst-seoul-fireworks",
    name: "서울세계불꽃축제",
    region: "서울 영등포구",
    type: "야간관광/불꽃",
    periodLabel: "가을 야간 집중형",
    budgetMillionKrw: 4200,
    visitors: 1000000,
    similarityScore: 90,
    sourceName: "문화체육관광부_지역축제 정보",
  },
  {
    id: "mcst-ddp-seoul-light",
    name: "DDP 서울라이트 겨울축제",
    region: "서울 중구",
    type: "야간관광/미디어",
    periodLabel: "겨울 야간형",
    budgetMillionKrw: 1500,
    visitors: 600000,
    similarityScore: 86,
    sourceName: "문화체육관광부_지역축제 정보",
  },
  {
    id: "mcst-busan-fireworks",
    name: "부산불꽃축제",
    region: "부산 수영구",
    type: "야간관광/불꽃",
    periodLabel: "가을 야간 집중형",
    budgetMillionKrw: 3500,
    visitors: 1000000,
    similarityScore: 82,
    sourceName: "문화체육관광부_지역축제 정보",
  },
  {
    id: "mcst-hangang-light-show",
    name: "한강 드론·라이트 쇼",
    region: "서울 한강공원",
    type: "야간관광/미디어",
    periodLabel: "봄·가을 야간형",
    budgetMillionKrw: 1200,
    visitors: 300000,
    similarityScore: 72,
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
