/**
 * 파일 : server/db/database.js
 * 내용 : JSON 파일 기반 영속 저장소 및 데이터 레이어
 * 수정 : 2026-07-24. B2G 축제 시나리오 CRUD, share_token 생성 및 영속화 스토리지 구축
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE_PATH = path.resolve(__dirname, "../../data/scenarios_db.json");

// 기본 시나리오 데이터가 없을 때 초기 시나리오 세트
const INITIAL_SCENARIOS = [
  {
    id: "scen_sample_01",
    title: "2026 강남 미디어 윈터페스타 (기본 기획안)",
    description: "관광데이터랩 객단가 117,000원 및 KTDB 영동대로 정체 시뮬레이션 적용안",
    parameters: {
      selectedHour: 20,
      plan: {
        name: "2026 강남 미디어 윈터페스타",
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
      },
    },
    results_summary: {
      roiMultiplier: 2.1,
      peakDensity: 4.8,
      riskLevel: "medium",
    },
    share_token: "token_gn_winter_2026",
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

class ScenarioDatabase {
  constructor(filePath = DB_FILE_PATH) {
    this.filePath = filePath;
    this.scenarios = new Map();
    this.init();
  }

  init() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf-8");
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          list.forEach((item) => this.scenarios.set(item.id, item));
          return;
        }
      }
    } catch (error) {
      console.warn("Notice: Initializing fresh scenario DB due to:", error.message);
    }

    // 초기 샘플 시나리오 로드
    INITIAL_SCENARIOS.forEach((item) => this.scenarios.set(item.id, item));
    this.persist();
  }

  persist() {
    try {
      const list = Array.from(this.scenarios.values());
      fs.writeFileSync(this.filePath, JSON.stringify(list, null, 2), "utf-8");
    } catch (error) {
      console.error("Failed to persist scenario DB to disk:", error);
    }
  }

  // 랜덤 8자리 고유 share_token 생성
  generateShareToken() {
    return `tok_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36).substring(4)}`;
  }

  // 전체 시나리오 목록 (최신순 정렬)
  getAllScenarios() {
    return Array.from(this.scenarios.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  // ID 기반 특정 시나리오 조회
  getScenarioById(id) {
    return this.scenarios.get(id) ?? null;
  }

  // 공유 토큰 기반 시나리오 조회
  getScenarioByShareToken(shareToken) {
    for (const scenario of this.scenarios.values()) {
      if (scenario.share_token === shareToken) {
        return scenario;
      }
    }
    return null;
  }

  // 신규 시나리오 생성
  createScenario({ title, description, parameters, results_summary }) {
    const id = `scen_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const share_token = this.generateShareToken();
    const now = new Date().toISOString();

    const newScenario = {
      id,
      title: title ?? parameters?.plan?.name ?? "신규 축제 시나리오",
      description: description ?? "",
      parameters: parameters ?? {},
      results_summary: results_summary ?? {},
      share_token,
      created_at: now,
      updated_at: now,
    };

    this.scenarios.set(id, newScenario);
    this.persist();
    return newScenario;
  }

  // 시나리오 업데이트
  updateScenario(id, { title, description, parameters, results_summary }) {
    const existing = this.scenarios.get(id);
    if (!existing) return null;

    const updated = {
      ...existing,
      title: title ?? existing.title,
      description: description ?? existing.description,
      parameters: parameters ?? existing.parameters,
      results_summary: results_summary ?? existing.results_summary,
      updated_at: new Date().toISOString(),
    };

    this.scenarios.set(id, updated);
    this.persist();
    return updated;
  }

  // 시나리오 삭제
  deleteScenario(id) {
    const existed = this.scenarios.delete(id);
    if (existed) {
      this.persist();
    }
    return existed;
  }

  // 전체 데이터베이스 리셋 (테스트용)
  resetDb() {
    this.scenarios.clear();
    INITIAL_SCENARIOS.forEach((item) => this.scenarios.set(item.id, item));
    this.persist();
  }
}

export const scenarioDb = new ScenarioDatabase();
