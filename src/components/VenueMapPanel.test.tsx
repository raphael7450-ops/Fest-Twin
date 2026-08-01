import { describe, expect, it } from "vitest";
import {
  buildVenueMarkerStyle,
  buildVWorldScriptUrl,
  isVWorldKeyRejected,
  resetVenueMapContainer,
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
  it("builds a festival map pin marker style with a venue label", () => {
    const created: Record<string, unknown>[] = [];
    const fakeOl = {
      style: {
        Style: class {
          constructor(options: Record<string, unknown>) {
            created.push({ type: "Style", options });
          }
        },
        Circle: class {
          constructor(options: Record<string, unknown>) {
            created.push({ type: "Circle", options });
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
    const icon = created.find((entry) => entry.type === "Icon");
    const iconOptions = icon?.options as { src?: string } | undefined;
    const svg = decodeURIComponent(iconOptions?.src?.split(",")[1] ?? "");

    expect(created).toContainEqual(
      expect.objectContaining({
        type: "Icon",
        options: expect.objectContaining({
          anchor: [0.5, 1],
          src: expect.stringContaining("data:image/svg+xml"),
        }),
      }),
    );
    expect(svg).toContain('data-marker="festival-pin"');
    expect(svg).toContain('data-icon="festival-sparkles"');
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
});
