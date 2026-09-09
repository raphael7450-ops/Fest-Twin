import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const url = process.env.FEST_TWIN_LIVE_URL;
assert.ok(url, "Set FEST_TWIN_LIVE_URL to the site under test");
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
const widths = (process.env.TEST_WIDTHS || "320,390,768").split(",").map(Number);
try {
  for (const width of widths) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true });
    if (process.env.FEST_TWIN_API_URL) {
      await page.route("**/api/**", async (route) => {
        const requestUrl = new URL(route.request().url());
        const response = await route.fetch({ url: new URL(requestUrl.pathname + requestUrl.search, process.env.FEST_TWIN_API_URL).href });
        await route.fulfill({ response });
      });
    }
    await page.goto(url);
    await page.locator(".planning-analysis-summary").waitFor({ state: "attached", timeout: 60000 });
    await page.getByRole("button", { name: "TourAPI 후보 보기", exact: true }).click();
    await page.getByRole("button", { name: "이 축제 선택", exact: true }).first().click({ timeout: 60000 });
    await page.getByRole("dialog").waitFor({ state: "hidden", timeout: 60000 });
    await page.locator(".analysis-status-banner--ready").waitFor({ timeout: 60000 });
    await page.locator(".planning-analysis-summary > summary").click();
    const card = page.locator(".selected-festival-card");
    await card.scrollIntoViewIfNeeded();
    const dimensions = await card.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return {
        titleWidth: element.querySelector("h3").getBoundingClientRect().width,
        width: bounds.width,
        overflowing: [...element.querySelectorAll("*")].filter((child) => {
          const rect = child.getBoundingClientRect();
          return rect.width && (rect.left < bounds.left - 1 || rect.right > bounds.right + 1);
        }).map((child) => child.tagName),
      };
    });
    assert.ok(dimensions.titleWidth >= Math.min(180, dimensions.width - 36), `Title compressed at ${width}px: ${JSON.stringify(dimensions)}`);
    assert.deepEqual(dimensions.overflowing, [], `Selected card overflow at ${width}px`);
    if (process.env.SCREENSHOT_DIR) {
      await card.screenshot({ path: `${process.env.SCREENSHOT_DIR}/festival-card-${width}.png` });
    }
    await page.getByRole("button", { name: "전국 축제 검색 및 변경" }).click();
    const dialog = page.getByRole("dialog", { name: "전체 축제 실시간 검색" });
    const first = dialog.locator("article").first();
    await first.waitFor({ timeout: 60000 });
    const searchLayout = await dialog.evaluate((element) => {
      const list = element.querySelector(".candidate-list");
      const help = element.querySelector("p.muted");
      const chips = help.previousElementSibling;
      return {
        chipsBottom: chips.getBoundingClientRect().bottom,
        helpTop: help.getBoundingClientRect().top,
        helpBottom: help.getBoundingClientRect().bottom,
        listTop: list.getBoundingClientRect().top,
        titleWidth: list.querySelector("h3").getBoundingClientRect().width,
        overflow: list.scrollWidth > list.clientWidth + 1,
      };
    });
    assert.ok(searchLayout.chipsBottom <= searchLayout.helpTop + 1, `Search chips overlap at ${width}px: ${JSON.stringify(searchLayout)}`);
    assert.ok(searchLayout.helpBottom <= searchLayout.listTop + 1, `Search help overlaps results at ${width}px`);
    assert.ok(searchLayout.titleWidth >= 140, `Search title compressed at ${width}px`);
    assert.equal(searchLayout.overflow, false, `Search results overflow at ${width}px`);
    if (process.env.SCREENSHOT_DIR) {
      await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/festival-search-${width}.png` });
    }
    const lastAction = dialog.getByTestId("apply-preset-btn").last();
    await lastAction.scrollIntoViewIfNeeded();
    await lastAction.click({ trial: true });
    await first.getByTestId("apply-preset-btn").click();
    await dialog.waitFor({ state: "hidden", timeout: 60000 });
    await page.locator(".analysis-status-banner--ready").waitFor({ timeout: 60000 });
    await page.locator(".dashboard-section-tab").filter({ hasText: "요약" }).click();
    const secondTitle = await page.locator(".selected-festival-card h3").boundingBox();
    assert.ok(secondTitle && secondTitle.width >= 180, `Second festival title compressed at ${width}px`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    if (process.env.SCREENSHOT_DIR) {
      await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/festival-selected-${width}.png`, fullPage: true });
    }
    console.log(`PASS ${width}px: candidate selection, detail card, search layout, last result reachable, second selection`);
    await page.close();
  }
} finally {
  await browser.close();
}
