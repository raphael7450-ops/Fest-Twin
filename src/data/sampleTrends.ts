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
    { keyword: "서울빛초롱", interestScore: 98, sentimentScore: 84, mentions: 95000 },
    { keyword: "광화문광장", interestScore: 96, sentimentScore: 82, mentions: 88000 },
    { keyword: "윈터페스타", interestScore: 92, sentimentScore: 80, mentions: 78000 },
    { keyword: "청계천등불", interestScore: 88, sentimentScore: 79, mentions: 56000 },
    { keyword: "미디어파사드", interestScore: 86, sentimentScore: 81, mentions: 49000 },
  ],
};
