import { describe, expect, it } from "vitest";
import {
  createNeutralPlaceholderSvg,
  getRepresentativeFestivalImage,
} from "./festivalImageProvider";

describe("festivalImageProvider", () => {
  it("preserves existing official image URL if provided", () => {
    const existing = "https://example.com/custom.jpg";
    const result = getRepresentativeFestivalImage({
      title: "테스트 축제",
      existingImageUrl: existing,
    });
    expect(result).toBe(existing);
  });

  it("returns neutral SVG placeholder data URL when official image is absent", () => {
    const result = getRepresentativeFestivalImage({
      title: "서울국제정원박람회",
      region: "서울",
    });
    expect(result.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true);
    const decoded = decodeURIComponent(result);
    expect(decoded).includes("공식 이미지 준비 중");
    expect(decoded).includes("서울국제정원박람회");
    expect(decoded).includes("[서울]");
  });

  it("extracts region from address when region is not explicitly provided", () => {
    const result = getRepresentativeFestivalImage({
      title: "지역 문화재 야행",
      address: "전라북도 전주시 한옥마을",
    });
    expect(result.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true);
    const decoded = decodeURIComponent(result);
    expect(decoded).includes("[전라북도]");
  });

  it("returns identical SVG placeholder data URL before and after candidate selection", () => {
    const beforeSelect = getRepresentativeFestivalImage({
      title: "서울국제정원박람회",
      address: "서울특별시 광화문광장",
    });

    const afterSelect = getRepresentativeFestivalImage({
      title: "서울국제정원박람회",
      address: "서울특별시 광화문광장",
      existingImageUrl: beforeSelect,
    });

    expect(afterSelect).toBe(beforeSelect);
  });

  it("creates neutral SVG placeholder with helper function", () => {
    const svgUrl = createNeutralPlaceholderSvg("대전 0시 축제", "대전");
    expect(svgUrl.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true);
    expect(decodeURIComponent(svgUrl)).includes("대전 0시 축제");
  });

});

