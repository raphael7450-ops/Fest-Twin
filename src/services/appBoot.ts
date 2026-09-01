type RequestFrame = (callback: FrameRequestCallback) => number;

export function scheduleAppReady(
  targetDocument: Document = document,
  requestFrame: RequestFrame = window.requestAnimationFrame.bind(window),
) {
  requestFrame(() => {
    requestFrame(() => {
      targetDocument.documentElement.classList.add("app-ready");
      targetDocument.getElementById("app-boot-loader")?.remove();
    });
  });
}
