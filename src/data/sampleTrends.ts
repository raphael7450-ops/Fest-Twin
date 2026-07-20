import type { TrendContext } from "../domain/types";

export const sampleTrendContext: TrendContext = {
  provenance: {
    sourceName: "비식별 소셜 트렌드 샘플",
    sourceType: "trend-sample",
    basisText:
      "개인 계정이 아닌 키워드 단위 관심도와 언급량을 수요 보정에 사용합니다.",
    fallbackText:
      "현재 MVP는 실시간 트렌드를 수집하지 않고 사전 정의된 샘플을 사용합니다.",
    collectedPersonalData: false,
  },
  signals: [
    { keyword: "미디어아트", interestScore: 91, sentimentScore: 80, mentions: 24600 },
    { keyword: "겨울축제", interestScore: 88, sentimentScore: 77, mentions: 22100 },
    { keyword: "빛축제", interestScore: 93, sentimentScore: 82, mentions: 28600 },
    { keyword: "강남", interestScore: 79, sentimentScore: 70, mentions: 17400 },
    { keyword: "가족", interestScore: 68, sentimentScore: 74, mentions: 9600 },
  ],
};
