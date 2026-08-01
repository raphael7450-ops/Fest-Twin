import { describe, expect, it } from "vitest";
import { buildVWorldScriptUrl } from "./VenueMapPanel";

describe("VenueMapPanel VWorld integration", () => {
  it("builds the VWorld 2D map script URL with the public API key", () => {
    const url = buildVWorldScriptUrl("test key+/=");

    expect(url).toBe(
      "https://map.vworld.kr/js/vworldMapInit.js.do?version=2.0&apiKey=test%20key%2B%2F%3D",
    );
  });
});