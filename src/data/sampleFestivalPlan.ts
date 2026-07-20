import type { FestivalPlan } from "../domain/types";

export const sampleFestivalPlan: FestivalPlan = {
  name: "강남 미디어 윈터페스타",
  region: "서울",
  venueAddress: "서울특별시 강남구 영동대로 511 (삼성동)",
  startDate: "2025-12-19",
  endDate: "2026-01-03",
  operatingHours: [14, 16, 18, 20, 22],
  totalBudgetMillionKrw: 920,
  promotionBudgetMillionKrw: 210,
  safetyBudgetMillionKrw: 130,
  targetGroups: ["families", "youth", "foreigners", "locals"],
  keywords: ["미디어아트", "겨울축제", "빛축제", "강남", "가족"],
  expectedCapacity: 36000,
  gridWidth: 12,
  gridHeight: 8,
  programs: [
    { id: "p1", name: "코엑스 미디어월 쇼", startHour: 18, endHour: 22, expectedDraw: 94 },
    { id: "p2", name: "겨울 포토존 투어", startHour: 14, endHour: 22, expectedDraw: 76 },
    { id: "p3", name: "도심 버스킹 공연", startHour: 16, endHour: 20, expectedDraw: 62 },
    { id: "p4", name: "카운트다운 라이트 세리머니", startHour: 20, endHour: 22, expectedDraw: 88 },
  ],
  facilities: [
    { id: "e1", type: "entrance", name: "삼성역 출입구", x: 1, y: 3, weight: 1.6 },
    { id: "e2", type: "entrance", name: "코엑스 동문", x: 10, y: 6, weight: 1 },
    { id: "s1", type: "stage", name: "미디어월 관람 구역", x: 6, y: 3, weight: 2.5 },
    { id: "b1", type: "booth", name: "겨울 먹거리 부스", x: 5, y: 5, weight: 1.5 },
    { id: "b2", type: "booth", name: "포토존", x: 8, y: 2, weight: 1.4 },
    { id: "r1", type: "restroom", name: "화장실", x: 9, y: 5, weight: 0.9 },
    { id: "m1", type: "medical", name: "응급 부스", x: 3, y: 6, weight: 0.7 },
    { id: "rest1", type: "rest", name: "보행 휴게 공간", x: 2, y: 1, weight: 0.8 },
  ],
};
