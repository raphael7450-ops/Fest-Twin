import { describe, expect, it } from "vitest";
import { getRepresentativeFestivalImage } from "./festivalImageProvider";

describe("festivalImageProvider", () => {
  it("preserves existing image URL if provided", () => {
    const existing = "https://example.com/custom.jpg";
    const result = getRepresentativeFestivalImage({
      title: "테스트 축제",
      existingImageUrl: existing,
    });
    expect(result).toBe(existing);
  });

  it("supplies representative image for Daejeon 0 O'clock festival", () => {
    const result = getRepresentativeFestivalImage({
      title: "대전 0시 축제",
      region: "대전",
    });
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  it("supplies representative image for Sejong festival", () => {
    const result = getRepresentativeFestivalImage({
      title: "세종 축제 (호수공원)",
      region: "세종",
    });
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  it("supplies representative image for Heritage Night festival", () => {
    const result = getRepresentativeFestivalImage({
      title: "지역 문화재 야행",
      address: "전라북도 전주시 한옥마을",
    });
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns fallback representative image for unknown titles without existing image", () => {
    const result = getRepresentativeFestivalImage({
      title: "임의 미상 축제",
    });
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  it("assigns stable but distinct fallback images to candidates without official images", () => {
    const first = getRepresentativeFestivalImage({
      title: "서울 가을 문화축제",
      region: "서울",
      candidateKey: "candidate-101",
    });
    const repeated = getRepresentativeFestivalImage({
      title: "서울 가을 문화축제",
      region: "서울",
      candidateKey: "candidate-101",
    });
    const second = getRepresentativeFestivalImage({
      title: "서울 시민 예술제",
      region: "서울",
      candidateKey: "candidate-202",
    });

    expect(repeated).toBe(first);
    expect(second).not.toBe(first);
  });
});
