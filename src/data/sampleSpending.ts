import type { SpendingContext } from "../domain/types";

export const sampleSpendingContext: SpendingContext = {
  averageSpendPerVisitorKrw: 58_400,
  basis: "tourism-demand-intensity",
  basisLabel: "지역 관광 소비 강도 기반",
  confidence: "medium",
  sourceName: "한국관광공사 지역별 관광 수요 강도",
  sourceStatus: "partial-fallback",
  region: "서울",
  retrievedAt: "공공데이터 연동 설계 기준",
  note:
    "data.go.kr 지역별 관광 수요 강도의 방문량 대비 소비액 계열 지표를 우선 사용하는 구조의 데모 기준값입니다. 실제 API 연결 후 지역·기간별 값으로 교체합니다.",
  sourceDetails: [
    {
      sourceId: "sample-tourism-demand-intensity-spending",
      sourceName: "한국관광공사 지역별 관광 수요 강도",
      sourceType: "sample",
      statusLabel: "공공데이터 구조 기반 샘플",
      endpoint: "data.go.kr/data/15151868/openapi.do",
      query: [
        { label: "region", value: "서울" },
        { label: "indicator", value: "방문량 대비 소비액" },
      ],
      records: [
        {
          label: "지역 관광 소비 강도",
          fields: [
            { label: "평균 소비 단가", value: "58,400원" },
            { label: "산출 방식", value: "방문량 대비 소비액 계열 지표" },
            { label: "신뢰도", value: "보통" },
          ],
        },
      ],
      note:
        "현재 값은 API 연결 전 제출 데모용 보정값이며, 고정 상수 대신 공공데이터 소비 지표의 출처와 산출 방식을 표시합니다.",
    },
  ],
};
