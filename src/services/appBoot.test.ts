import { describe, expect, it, vi } from "vitest";
import { scheduleAppReady } from "./appBoot";

describe("app boot loading screen", () => {
  it("keeps the boot loader until the first two painted frames complete", () => {
    document.documentElement.classList.remove("app-ready");
    document.body.innerHTML = `
      <div id="app-boot-loader" role="status">불러오는 중</div>
      <div id="root"></div>
    `;
    const frames: FrameRequestCallback[] = [];
    const requestFrame = vi.fn((callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });

    scheduleAppReady(document, requestFrame);

    expect(document.getElementById("app-boot-loader")).not.toBeNull();
    expect(document.documentElement).not.toHaveClass("app-ready");

    frames.shift()?.(0);
    expect(document.getElementById("app-boot-loader")).not.toBeNull();

    frames.shift()?.(16);
    expect(document.documentElement).toHaveClass("app-ready");
    expect(document.getElementById("app-boot-loader")).toBeNull();
  });
});
