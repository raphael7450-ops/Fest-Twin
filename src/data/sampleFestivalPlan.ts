import type { FestivalPlan } from "../domain/types";

export const sampleFestivalPlan: FestivalPlan = {
  name: "한강 일상문화축제",
  region: "서울",
  venueAddress: "서울특별시 영등포구 여의도 한강공원",
  startDate: "2026-09-18",
  endDate: "2026-09-20",
  operatingHours: [12, 14, 16, 18, 20, 22],
  totalBudgetMillionKrw: 850,
  promotionBudgetMillionKrw: 160,
  safetyBudgetMillionKrw: 95,
  targetGroups: ["families", "youth", "foreigners"],
  keywords: ["일상문화", "먹거리", "K-POP", "한강", "가족"],
  expectedCapacity: 42000,
  gridWidth: 12,
  gridHeight: 8,
  programs: [
    { id: "p1", name: "푸드트럭 스트리트", startHour: 12, endHour: 22, expectedDraw: 72 },
    { id: "p2", name: "지역 예술 공연", startHour: 16, endHour: 18, expectedDraw: 58 },
    { id: "p3", name: "K-POP 커버 공연", startHour: 19, endHour: 21, expectedDraw: 95 },
    { id: "p4", name: "한강 라이트쇼", startHour: 20, endHour: 22, expectedDraw: 88 },
  ],
  facilities: [
    { id: "e1", type: "entrance", name: "1번 출입구", x: 1, y: 3, weight: 1.3 },
    { id: "e2", type: "entrance", name: "2번 출입구", x: 10, y: 6, weight: 0.7 },
    { id: "s1", type: "stage", name: "메인 무대", x: 6, y: 3, weight: 2.4 },
    { id: "b1", type: "booth", name: "먹거리 부스", x: 5, y: 5, weight: 1.8 },
    { id: "b2", type: "booth", name: "체험 부스", x: 8, y: 2, weight: 1.1 },
    { id: "r1", type: "restroom", name: "화장실", x: 9, y: 5, weight: 0.9 },
    { id: "m1", type: "medical", name: "응급 부스", x: 3, y: 6, weight: 0.6 },
    { id: "rest1", type: "rest", name: "휴게 공간", x: 2, y: 1, weight: 0.8 },
  ],
};
