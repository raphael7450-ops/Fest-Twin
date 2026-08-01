import { describe, expect, it } from "vitest";
import { buildVenueMarkerStyle, buildVWorldScriptUrl, isVWorldKeyRejected } from "./VenueMapPanel";

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
  it("builds a visible venue marker style with a festival label", () => {
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

    expect(created).toContainEqual({
      type: "Fill",
      options: { color: "#ef4444" },
    });
    expect(created).toContainEqual(
      expect.objectContaining({
        type: "Text",
        options: expect.objectContaining({ text: "보령머드축제" }),
      }),
    );
  });
});
