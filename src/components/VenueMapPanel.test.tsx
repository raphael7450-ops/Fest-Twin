import { describe, expect, it } from "vitest";
import { buildVWorldScriptUrl, isVWorldKeyRejected } from "./VenueMapPanel";

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
});