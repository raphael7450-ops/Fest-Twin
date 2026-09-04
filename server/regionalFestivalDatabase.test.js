import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { RegionalFestivalDatabase } from "./db/regionalFestivalDatabase.js";

let tempDir;

afterEach(() => {
  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    tempDir = undefined;
  }
});

function createTestDatabase(records) {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fest-twin-regional-db-"));
  const filePath = path.join(tempDir, "regional_festivals_db.json");
  fs.writeFileSync(
    filePath,
    JSON.stringify({
      generatedAt: "2026-08-01T00:00:00.000Z",
      source: "test",
      records,
    }),
  );
  return new RegionalFestivalDatabase(filePath);
}

describe("RegionalFestivalDatabase", () => {
  it("deduplicates edition-numbered Busan Sea Festival records and applies the verified 2026 schedule", () => {
    const db = createTestDatabase([
      {
        id: "tourapi-busan-sea-2026",
        year: 2026,
        name: "부산바다축제",
        region: "부산",
        localGovernment: "",
        type: "문화예술",
        venue: "다대포해수욕장",
        startDate: "2026-08-07",
        endDate: "2026-08-13",
        visitors: 90000,
        budgetMillionKrw: 1260,
      },
      {
        id: "mcst-busan-sea-2026",
        year: 2026,
        name: "제30회 부산바다축제",
        region: "부산",
        localGovernment: "",
        type: "문화예술",
        venue: "다대포해수욕장",
        startDate: "2026-08-07",
        endDate: "2026-08-09",
        visitors: 82435,
        budgetMillionKrw: 1260,
      },
    ]);

    const records = db.searchFestivals({
      region: "부산",
      startDate: "2026-08-01",
      endDate: "2026-08-31",
      limit: 10,
    });

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      name: "제30회 부산바다축제",
      startDate: "2026-08-07",
      endDate: "2026-08-13",
    });
  });

  it("excludes same-year regional festivals that do not overlap the requested date range when no search term is provided", () => {
    const db = createTestDatabase([
      {
        id: "busan-august-2026",
        year: 2026,
        name: "Busan August Festival",
        region: "Busan",
        localGovernment: "Haeundae-gu",
        type: "Culture",
        venue: "Haeundae Beach",
        startDate: "2026-08-10",
        endDate: "2026-08-15",
        visitors: 120000,
        budgetMillionKrw: 900,
      },
      {
        id: "busan-winter-2026",
        year: 2026,
        name: "Busan Winter Light Festival",
        region: "Busan",
        localGovernment: "Haeundae-gu",
        type: "Light",
        venue: "Haeundae Beach",
        startDate: "2026-12-01",
        endDate: "2026-12-31",
        visitors: 500000,
        budgetMillionKrw: 2500,
      },
    ]);

    const records = db.searchFestivals({
      region: "Busan",
      startDate: "2026-08-01",
      endDate: "2026-08-31",
      limit: 10,
    });

    expect(records.map((record) => record.id)).toEqual(["busan-august-2026"]);
  });

  it("can limit planning search results to festivals that are ongoing or upcoming", () => {
    const db = createTestDatabase([
      {
        id: "ended-2026",
        year: 2026,
        name: "Ended Summer Festival",
        region: "Busan",
        startDate: "2026-08-01",
        endDate: "2026-08-09",
        visitors: 100000,
        budgetMillionKrw: 500,
      },
      {
        id: "ongoing-2026",
        year: 2026,
        name: "Ongoing Summer Festival",
        region: "Busan",
        startDate: "2026-08-08",
        endDate: "2026-08-13",
        visitors: 100000,
        budgetMillionKrw: 500,
      },
      {
        id: "upcoming-2026",
        year: 2026,
        name: "Upcoming Autumn Festival",
        region: "Busan",
        startDate: "2026-10-01",
        endDate: "2026-10-03",
        visitors: 100000,
        budgetMillionKrw: 500,
      },
    ]);

    const planningRecords = db.searchFestivals({
      region: "Busan",
      minEndDate: "2026-08-11",
      limit: 10,
    });
    const backdataRecords = db.searchFestivals({
      region: "Busan",
      limit: 10,
    });

    expect(planningRecords.map((record) => record.id)).toEqual([
      "ongoing-2026",
      "upcoming-2026",
    ]);
    expect(backdataRecords.map((record) => record.id)).toContain("ended-2026");
  });

  it("hides inactive planning festivals while keeping them available for backdata", () => {
    const db = createTestDatabase([
      {
        id: "daejeon-midnight-2026",
        year: 2026,
        name: "제4회 2026 대전 0시 축제",
        region: "대전",
        startDate: "2026-08-07",
        endDate: "2026-08-17",
        visitors: 1000000,
        budgetMillionKrw: 9600,
      },
      {
        id: "daejeon-art-2026",
        year: 2026,
        name: "2026 대전 서구 아트페스티벌",
        region: "대전",
        startDate: "2026-10-01",
        endDate: "2026-10-01",
        visitors: 100000,
        budgetMillionKrw: 500,
      },
    ]);

    const planningRecords = db.searchFestivals({
      region: "대전",
      minEndDate: "2026-08-11",
      limit: 10,
    });
    const backdataRecords = db.searchFestivals({
      region: "대전",
      limit: 10,
    });

    expect(planningRecords.map((record) => record.id)).toEqual(["daejeon-art-2026"]);
    expect(backdataRecords.map((record) => record.id)).toContain("daejeon-midnight-2026");
  });

  it("keeps same-year keyword matches when normalized MCST dates do not overlap selected festival dates", () => {
    const db = createTestDatabase([
      {
        id: "mcst-2026-undated-baekje",
        year: 2026,
        name: "제72회 백제문화제",
        region: "충청남도",
        localGovernment: "부여군",
        type: "전통역사",
        venue: "백제문화단지",
        startDate: null,
        endDate: null,
        visitors: 953000,
        budgetMillionKrw: 5337,
      },
      {
        id: "mcst-2025-nonsan-strawberry",
        year: 2025,
        name: "2025 논산딸기축제",
        region: "충청남도",
        localGovernment: "논산시",
        type: "지역특산물",
        venue: "논산시민가족공원",
        startDate: "2025-03-01",
        endDate: "2025-03-01",
        visitors: 450000,
        budgetMillionKrw: 1500,
      },
    ]);

    const records = db.searchFestivals({
      region: "충청남도",
      startDate: "2025-03-27",
      endDate: "2025-03-30",
      keywords: ["논산딸기축제"],
      limit: 3,
    });

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      name: "2025 논산딸기축제",
      visitors: 450000,
    });
  });

  it("matches full metropolitan region names such as 부산광역시 to records stored as 부산", () => {
    const db = createTestDatabase([
      {
        id: "busan-rock-2026",
        year: 2026,
        name: "2026 부산국제록페스티벌",
        region: "부산",
        localGovernment: "사상구",
        type: "음악",
        venue: "삼락생태공원",
        startDate: "2026-10-02",
        endDate: "2026-10-04",
        visitors: 70000,
        budgetMillionKrw: 1500,
      },
    ]);

    const records = db.searchFestivals({
      region: "부산광역시",
      startDate: "2026-10-01",
      endDate: "2026-10-05",
      limit: 10,
    });

    expect(records).toHaveLength(1);
    expect(records[0].name).toBe("2026 부산국제록페스티벌");
  });

  it("retrieves matching regional date festivals even when unrelated prior keywords are passed", () => {
    const db = createTestDatabase([
      {
        id: "busan-wheat-2026",
        year: 2026,
        name: "2026 부산밀페스티벌",
        region: "부산",
        localGovernment: "북구",
        type: "음식",
        venue: "화명생태공원",
        startDate: "2026-04-25",
        endDate: "2026-04-26",
        visitors: 33000,
        budgetMillionKrw: 300,
      },
    ]);

    const records = db.searchFestivals({
      region: "부산광역시",
      startDate: "2026-04-20",
      endDate: "2026-04-30",
      keywords: ["서울빛초롱", "광화문광장", "윈터페스타"],
      limit: 10,
    });

    expect(records).toHaveLength(1);
    expect(records[0].name).toBe("2026 부산밀페스티벌");
  });

  it("strictly isolates Daegu searches and never returns Daejeon or Busan festivals", () => {
    const db = createTestDatabase([
      {
        id: "daegu-light-2026",
        year: 2026,
        name: "수성빛예술제",
        region: "대구",
        localGovernment: "수성구",
        venue: "수성못 일원",
        startDate: "2026-12-24",
        endDate: "2027-01-03",
        visitors: 150000,
        budgetMillionKrw: 800,
      },
      {
        id: "daejeon-yuseong-2026",
        year: 2026,
        name: "2026 유성온천 크리스마스축제",
        region: "대전",
        localGovernment: "유성구",
        venue: "유림공원 일원",
        startDate: "2026-12-04",
        endDate: "2026-12-06",
        visitors: 80000,
        budgetMillionKrw: 400,
      },
      {
        id: "busan-haeundae-2026",
        year: 2026,
        name: "해운대 빛축제",
        region: "부산",
        localGovernment: "해운대구",
        venue: "해운대해수욕장 일원",
        startDate: "2026-12-01",
        endDate: "2026-12-31",
        visitors: 500000,
        budgetMillionKrw: 1200,
      },
    ]);

    const records = db.searchFestivals({
      region: "대구",
      startDate: "2026-12-01",
      endDate: "2026-12-31",
      limit: 10,
    });

    expect(records.map((r) => r.id)).toEqual(["daegu-light-2026"]);
    expect(records.some((r) => r.region === "대전")).toBe(false);
    expect(records.some((r) => r.region === "부산")).toBe(false);
  });
});
