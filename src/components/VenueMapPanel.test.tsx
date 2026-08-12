import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import {
  buildVenueOperationalNotes,
  buildVWorldTileUrl,
  VenueMapPanel,
} from "./VenueMapPanel";

describe("VenueMapPanel VWorld integration", () => {
  it("builds the VWorld WMTS tile URL with the public API key", () => {
    const url = buildVWorldTileUrl("TEST-KEY");

    expect(url).toBe(
      "https://api.vworld.kr/req/wmts/1.0.0/TEST-KEY/Base/{z}/{y}/{x}.png",
    );
  });

  it("shows a coordinate confirmation prompt without loading VWorld when the plan has no coordinates", () => {
    render(<VenueMapPanel plan={{ ...sampleFestivalPlan, venueCoordinates: undefined }} />);

    expect(screen.getByText("행사장 좌표 확인 필요")).toBeInTheDocument();
  });

  it("derives operational notes from the plan facilities", () => {
    const notes = buildVenueOperationalNotes({
      ...sampleFestivalPlan,
      facilities: sampleFestivalPlan.facilities.filter((facility) => facility.type !== "booth"),
    });

    expect(notes).toEqual([
      `행사장 중심 구역: ${sampleFestivalPlan.name}`,
      `주요 진출입 후보: ${sampleFestivalPlan.facilities
        .filter((facility) => facility.type === "entrance")
        .map((facility) => facility.name)
        .join(", ")}`,
      `관람 집중 후보: ${sampleFestivalPlan.facilities
        .filter((facility) => facility.type === "stage")
        .map((facility) => facility.name)
        .join(", ")}`,
      "분산 운영 후보: 기획안 입력 필요",
    ]);
  });
});
