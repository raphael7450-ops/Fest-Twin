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
});
