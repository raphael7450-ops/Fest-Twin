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
