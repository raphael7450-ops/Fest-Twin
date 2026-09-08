import { describe, expect, it } from "vitest";
import { FESTIVAL_PRESETS } from "../src/data/festivalPresets";
import {
  getRegionDefaultGeoInfo,
  updatePlanDates,
  updatePlanRegion,
} from "../src/services/festivalSelection";
import { calculateDayTypeCounts, createForecast } from "../src/services/forecast";
import { getFallbackWeatherContext } from "../src/services/weatherAdapter";
import { sampleFestivalPlan } from "../src/data/sampleFestivalPlan";
import { sampleTourismContext } from "../src/data/sampleTourApi";
import { sampleTrendContext } from "../src/data/sampleTrends";
import { sampleSpendingContext } from "../src/data/sampleSpending";

describe("Festival, Region and Date Switching Integrity Tests", () => {
  describe("1. Festival Preset Switching", () => {
    it("switches from Seoul Winter Festa to Busan Fireworks with complete coordinate and date shift", () => {
      const seoulPreset = FESTIVAL_PRESETS.find((p) => p.id === "preset_seoul_lantern")!;
      const busanPreset = FESTIVAL_PRESETS.find((p) => p.id === "preset_busan_fireworks")!;

      expect(seoulPreset.plan.region).toBe("서울");
      expect(seoulPreset.plan.startDate).toBe("2026-12-18");
      expect(seoulPreset.plan.venueCoordinates?.latitude).toBeCloseTo(37.5759, 3);
      expect(seoulPreset.plan.venueCoordinates?.longitude).toBeCloseTo(126.9768, 3);

      expect(busanPreset.plan.region).toBe("부산");
      expect(busanPreset.plan.startDate).toBe("2026-11-07");
      expect(busanPreset.plan.venueCoordinates?.latitude).toBeCloseTo(35.1532, 3);
      expect(busanPreset.plan.venueCoordinates?.longitude).toBeCloseTo(129.1186, 3);

      expect(seoulPreset.plan.venueCoordinates?.latitude).not.toBe(busanPreset.plan.venueCoordinates?.latitude);
      expect(seoulPreset.plan.facilities[0].name).not.toBe(busanPreset.plan.facilities[0].name);
    });

    it("ensures all 10 presets have valid region geo alignments", () => {
      FESTIVAL_PRESETS.forEach((preset) => {
        const geoInfo = getRegionDefaultGeoInfo(preset.region);
        expect(geoInfo).toBeDefined();
        expect(preset.plan.venueCoordinates?.latitude).toBeGreaterThan(33.0);
        expect(preset.plan.venueCoordinates?.longitude).toBeGreaterThan(124.0);
      });
    });
  });

  describe("2. Region Switching and Geographic Synchronization", () => {
    it("updates venue address and coordinates when switching region from Seoul to Busan", () => {
      const initialPlan = { ...sampleFestivalPlan, region: "서울" };
      const updatedPlan = updatePlanRegion(initialPlan, "부산");

      expect(updatedPlan.region).toBe("부산");
      expect(updatedPlan.venueAddress).toContain("부산");
      expect(updatedPlan.venueCoordinates?.latitude).toBeCloseTo(35.1532, 3);
      expect(updatedPlan.venueCoordinates?.longitude).toBeCloseTo(129.1186, 3);
      expect(updatedPlan.venueAreaSquareMeters).toBeUndefined();
      expect(updatedPlan.totalExitWidthMeters).toBeUndefined();
      expect(updatedPlan.evacuationDistanceMeters).toBeUndefined();
      expect(updatedPlan.facilities[0].name).toContain("부산");
    });

    it("updates venue address and coordinates when switching region from Seoul to Daejeon", () => {
      const initialPlan = { ...sampleFestivalPlan, region: "서울" };
      const updatedPlan = updatePlanRegion(initialPlan, "대전");

      expect(updatedPlan.region).toBe("대전");
      expect(updatedPlan.venueAddress).toContain("대전");
      expect(updatedPlan.venueCoordinates?.latitude).toBeCloseTo(36.3287, 3);
      expect(updatedPlan.venueCoordinates?.longitude).toBeCloseTo(127.4258, 3);
      expect(updatedPlan.facilities[0].name).toContain("대전");
    });

    it("preserves custom address if the custom address already includes the new region name", () => {
      const customPlan = {
        ...sampleFestivalPlan,
        region: "부산",
        venueAddress: "부산광역시 해운대구 우동 APEC나루공원",
        venueCoordinates: { latitude: 35.168, longitude: 129.135, source: "vworld" as const },
      };

      const updated = updatePlanRegion(customPlan, "부산");
      expect(updated.venueAddress).toBe("부산광역시 해운대구 우동 APEC나루공원");
      expect(updated.venueCoordinates?.latitude).toBe(35.168);
    });
  });

  describe("3. Date Switching and Climate / Inflow Profile Synchronization", () => {
    it("updates plan dates according to user input", () => {
      const plan = { ...sampleFestivalPlan, startDate: "2026-08-01", endDate: "2026-08-05" };
      const updated = updatePlanDates(plan, "2026-08-10", "2026-08-15");

      expect(updated.startDate).toBe("2026-08-10");
      expect(updated.endDate).toBe("2026-08-15");
    });

    it("recalculates weekday and weekend days count when switching dates", () => {
      const threeDayWeekend = calculateDayTypeCounts("2026-10-09", "2026-10-11");
      expect(threeDayWeekend.totalDays).toBe(3);
      expect(threeDayWeekend.weekendDays).toBe(2);
      expect(threeDayWeekend.weekdayDays).toBe(1);

      const twoWeekFestival = calculateDayTypeCounts("2026-10-01", "2026-10-14");
      expect(twoWeekFestival.totalDays).toBe(14);
      expect(twoWeekFestival.weekendDays).toBe(4);
      expect(twoWeekFestival.weekdayDays).toBe(10);
    });

    it("changes seasonal climate sample when shifting between winter (12월) and summer (8월)", () => {
      const winterMonth = 12;
      const summerMonth = 8;

      const winterWeather = getFallbackWeatherContext(37.5, 127.0, winterMonth);
      const summerWeather = getFallbackWeatherContext(37.5, 127.0, summerMonth);

      expect(winterWeather.weather.temperatureCelsius).toBeLessThan(5);
      expect(winterWeather.weather.conditionText).toContain("동계");

      expect(summerWeather.weather.temperatureCelsius).toBeGreaterThan(25);
      expect(summerWeather.weather.conditionText).not.toContain("동계");
    });

    it("updates visitor forecast profile according to date change without numerical corruption", () => {
      const weatherWinter = getFallbackWeatherContext(37.5759, 126.9768, 12);
      const winterPlan = { ...sampleFestivalPlan, startDate: "2026-12-18", endDate: "2026-12-31" };
      const forecastWinter = createForecast(winterPlan, sampleTourismContext, sampleTrendContext, undefined, weatherWinter);

      const weatherSummer = getFallbackWeatherContext(36.3045, 126.5165, 8);
      const summerPlan = {
        ...sampleFestivalPlan,
        region: "충남",
        startDate: "2026-08-01",
        endDate: "2026-08-03",
        expectedCapacity: 50000,
      };
      const forecastSummer = createForecast(summerPlan, sampleTourismContext, sampleTrendContext, undefined, weatherSummer);

      expect(forecastWinter.dayTypeCounts?.totalDays).toBe(14);
      expect(forecastSummer.dayTypeCounts?.totalDays).toBe(3);
      expect(forecastWinter.expectedVisitors).toBeGreaterThan(0);
      expect(forecastSummer.expectedVisitors).toBeGreaterThan(0);
      expect(Number.isFinite(forecastWinter.peakHour)).toBe(true);
      expect(Number.isFinite(forecastSummer.peakHour)).toBe(true);
    });
  });
});
