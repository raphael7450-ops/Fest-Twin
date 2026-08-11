import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { sampleFestivalPlan } from "../data/sampleFestivalPlan";
import {
  buildVenueOperationalNotes,
  buildVenueMarkerStyle,
  buildVWorldScriptUrl,
  isVWorldKeyRejected,
  resetVenueMapContainer,
  VenueMapPanel,
} from "./VenueMapPanel";

describe("VenueMapPanel VWorld integration", () => {
  it("builds the VWorld 2D map script URL with the public API key", () => {
    const url = buildVWorldScriptUrl("test key+/=");

    expect(url).toBe(
      "https://map.vworld.kr/js/vworldMapInit.js.do?version=2.0&apiKey=test%20key%2B%2F%3D",
    );
  });

  it("detects VWorld API key and URI mismatch responses", () => {
    expect(
      isVWorldKeyRejected("var vworldIsValid = 'false'; var vworldErrMsg = '등록하신 API Key와 URI가 일치하지 않습니다.';"),
    ).toBe(true);
    expect(isVWorldKeyRejected("var vworldIsValid = 'true';")).toBe(false);
  });

  it("builds a visible arrow venue marker style with a festival label", () => {
    const created: Record<string, unknown>[] = [];
    const fakeOl = {
      style: {
        Style: class {
          constructor(options: Record<string, unknown>) {
            created.push({ type: "Style", options });
          }
        },
        Icon: class {
          constructor(options: Record<string, unknown>) {
            created.push({ type: "Icon", options });
          }
        },
        Fill: class {
          constructor(options: Record<string, unknown>) {
            created.push({ type: "Fill", options });
          }
        },
        Stroke: class {
          constructor(options: Record<string, unknown>) {
            created.push({ type: "Stroke", options });
          }
        },
        Text: class {
          constructor(options: Record<string, unknown>) {
            created.push({ type: "Text", options });
          }
        },
      },
    };

    buildVenueMarkerStyle(fakeOl, "보령머드축제");

    expect(created).toContainEqual(
      expect.objectContaining({
        type: "Icon",
        options: expect.objectContaining({
          anchor: [0.5, 1],
          src: expect.stringContaining("data:image/svg+xml"),
        }),
      }),
    );
    expect(created).toContainEqual(
      expect.objectContaining({
        type: "Text",
        options: expect.objectContaining({ text: "보령머드축제" }),
      }),
    );
  });

  it("clears the previous VWorld map DOM before rendering a new venue", () => {
    const container = document.createElement("div");
    container.innerHTML = '<div class="ol-viewport"></div><div class="venue-map-fallback"></div>';

    resetVenueMapContainer(container);

    expect(container.childElementCount).toBe(0);
  });

  it("shows a coordinate confirmation prompt without loading VWorld when the plan has no coordinates", () => {
    document.querySelector('script[data-fest-twin-vworld-map]')?.remove();

    render(<VenueMapPanel plan={sampleFestivalPlan} />);

    expect(screen.getByText("행사장 좌표 확인 필요")).toBeInTheDocument();
    expect(document.querySelector('script[data-fest-twin-vworld-map]')).toBeNull();
    expect(screen.queryByText(/Gangnam Media Winter Festa/)).not.toBeInTheDocument();
    expect(screen.queryByText(/C(?:OEX)/)).not.toBeInTheDocument();
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
