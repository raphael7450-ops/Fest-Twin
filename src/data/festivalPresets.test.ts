import { describe, expect, it } from "vitest";
import { FESTIVAL_PRESETS } from "./festivalPresets";

describe("FESTIVAL_PRESETS", () => {
  it("defines at least 3 municipal festival presets with required parameters", () => {
    expect(FESTIVAL_PRESETS.length).toBeGreaterThanOrEqual(3);

    FESTIVAL_PRESETS.forEach((preset) => {
      expect(preset.id).toBeTruthy();
      expect(preset.name).toBeTruthy();
      expect(preset.areaSqm).toBeGreaterThan(0);
      expect(preset.totalBudgetMillionKrw).toBeGreaterThan(0);
      expect(preset.targetVisitors).toBeGreaterThan(0);
      expect(preset.plan.name).toBeTruthy();
      expect(preset.plan.startDate).toBeTruthy();
      expect(preset.plan.endDate).toBeTruthy();
      expect(preset.basis.title).toBeTruthy();
    });
  });

  it("includes Daejeon 0 O'clock, Sejong, and Heritage Night presets", () => {
    const ids = FESTIVAL_PRESETS.map((p) => p.id);
    expect(ids).toContain("preset_daejeon_0시축제");
    expect(ids).toContain("preset_sejong_축제");
    expect(ids).toContain("preset_heritage_야행");
  });
});
