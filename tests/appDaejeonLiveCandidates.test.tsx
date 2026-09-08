import { render, screen, fireEvent, waitFor, cleanup, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { App } from "../src/App";

describe.skipIf(!process.env.FEST_TWIN_LIVE_URL)("App Daejeon Candidate Selection Verification", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const requestUrl = new URL(urlStr, process.env.FEST_TWIN_LIVE_URL);
      const targetUrl = requestUrl.hostname === "localhost"
        ? `${process.env.FEST_TWIN_LIVE_URL}${requestUrl.pathname}${requestUrl.search}` : requestUrl.toString();
      const { signal: _signal, ...nodeInit } = (init || {}) as any;
      try {
        const res = await originalFetch(targetUrl, nodeInit);
        const clone = res.clone();
        const body = await clone.json().catch(() => null);
        console.log(`[TEST FETCH] ${targetUrl} -> status ${res.status}`, body ? (Array.isArray(body) ? `Array(${body.length})` : (body.records ? `records(${body.records.length})` : (body.response?.body?.items?.item ? `items(${body.response.body.items.item.length})` : Object.keys(body)))) : "null/non-json");
        return res;
      } catch (err) {
        console.error(`[TEST FETCH ERROR] ${targetUrl}`, err);
        throw err;
      }
    }) as any;
  });

  afterEach(() => {
    cleanup();
    globalThis.fetch = originalFetch;
  });

  it("updates candidate count and enables selecting Daejeon candidate when region and dates are changed", async () => {
    render(<App />);

    // Wait for initial analysis to settle
    await waitFor(() => {
      expect(screen.queryByText("초기 분석 데이터를 불러오는 중입니다.")).not.toBeInTheDocument();
    }, { timeout: 10000 });

    // 1. Select Daejeon region
    const regionSelect = await screen.findByRole("combobox", { name: "개최 지역" });
    fireEvent.change(regionSelect, { target: { value: "대전" } });

    // 2. Change start date
    const startDateInput = screen.getByLabelText("시작일");
    fireEvent.change(startDateInput, { target: { value: "2026-10-01" } });

    // 3. Change end date
    const endDateInput = screen.getByLabelText("종료일");
    fireEvent.change(endDateInput, { target: { value: "2026-12-31" } });

    // Wait for debounce (300ms) + remote fetch
    await waitFor(
      () => {
        expect(screen.queryByText("조회된 후보 없음")).not.toBeInTheDocument();
        expect(screen.getByText(/TourAPI 후보 \d+건/)).toBeInTheDocument();
      },
      { timeout: 8000 },
    );

    // Open candidate panel
    const openCandidatesBtn = screen.getByRole("button", { name: "TourAPI 후보 보기" });
    fireEvent.click(openCandidatesBtn);

    // Verify candidates are listed in drawer
    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "TourAPI 축제 후보" })).toBeInTheDocument();
      const applyButtons = screen.getAllByRole("button", { name: "이 축제 선택" });
      expect(applyButtons.length).toBeGreaterThan(0);
    });

    // Uncertain schedules are intentionally not selectable.
    const applyButtons = screen.getAllByRole("button", { name: "이 축제 선택" });
    const selectable = applyButtons.find((button) => !(button as HTMLButtonElement).disabled);
    expect(selectable).toBeDefined();
    fireEvent.click(selectable!);

    // Check panel closes and candidate is selected
    await waitFor(
      () => {
        expect(screen.queryByRole("dialog", { name: "TourAPI 축제 후보" })).not.toBeInTheDocument();
        expect(screen.queryByText("선택된 후보 없음")).not.toBeInTheDocument();
      },
      { timeout: 8000 },
    );
  }, 15000);
});
