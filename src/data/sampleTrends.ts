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
    { keyword: "서울세계불꽃축제", interestScore: 98, sentimentScore: 82, mentions: 92000 },
    { keyword: "여의도불꽃축제", interestScore: 96, sentimentScore: 80, mentions: 87000 },
    { keyword: "한강축제", interestScore: 89, sentimentScore: 78, mentions: 54000 },
    { keyword: "불꽃놀이", interestScore: 94, sentimentScore: 81, mentions: 76000 },
    { keyword: "여의도한강공원", interestScore: 84, sentimentScore: 75, mentions: 43000 },
  ],
};
