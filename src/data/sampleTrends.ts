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
    { keyword: "일상문화", interestScore: 88, sentimentScore: 76, mentions: 18400 },
    { keyword: "먹거리", interestScore: 81, sentimentScore: 72, mentions: 15100 },
    { keyword: "K-POP", interestScore: 96, sentimentScore: 84, mentions: 32800 },
    { keyword: "한강", interestScore: 91, sentimentScore: 79, mentions: 27400 },
    { keyword: "가족", interestScore: 68, sentimentScore: 74, mentions: 9600 },
  ],
};
