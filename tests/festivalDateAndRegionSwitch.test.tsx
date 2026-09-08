import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { App } from "../src/App";

describe("Festival Date and Region Switching Integration Tests", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const targetUrl = urlStr.startsWith("http") ? urlStr : `http://100.104.94.112:18080${urlStr}`;
      const { signal: _signal, ...nodeInit } = (init || {}) as any;
      try {
        return await originalFetch(targetUrl, nodeInit);
      } catch (err) {
        throw err;
      }
    }) as any;
  });

  afterEach(() => {
    cleanup();
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("dynamically updates festival candidates as region and dates are changed", async () => {
    render(<App />);

    // Wait for initial analysis to settle
    await waitFor(() => {
      expect(screen.queryByText("초기 분석 데이터를 불러오는 중입니다.")).not.toBeInTheDocument();
    }, { timeout: 10000 });

    // Step 1: Switch region to "대전" and dates to autumn (2026-10-01 ~ 2026-12-31)
    const regionSelect = await screen.findByRole("combobox", { name: "개최 지역" });
    fireEvent.change(regionSelect, { target: { value: "대전" } });

    const startDateInput = screen.getByLabelText("시작일");
    const endDateInput = screen.getByLabelText("종료일");
    fireEvent.change(startDateInput, { target: { value: "2026-10-01" } });
    fireEvent.change(endDateInput, { target: { value: "2026-12-31" } });

    // Candidates are immediately retrieved for Daejeon autumn
    await waitFor(
      () => {
        expect(screen.queryByText("조회된 후보 없음")).not.toBeInTheDocument();
        expect(screen.getByText(/TourAPI 후보 \d+건/)).toBeInTheDocument();
      },
      { timeout: 8000 },
    );

    // Open candidate drawer to verify Daejeon candidates are listed
    const openCandidatesBtn = screen.getByRole("button", { name: "TourAPI 후보 보기" });
    fireEvent.click(openCandidatesBtn);

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "TourAPI 축제 후보" })).toBeInTheDocument();
      const applyButtons = screen.getAllByRole("button", { name: "이 축제 선택" });
      expect(applyButtons.length).toBeGreaterThan(0);
    });

    // Close drawer
    const closeBtn = screen.getByRole("button", { name: "닫기" });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "TourAPI 축제 후보" })).not.toBeInTheDocument();
    });

    // Step 2: Switch region to "세종" with October dates (2026-10-01 ~ 2026-10-31)
    fireEvent.change(regionSelect, { target: { value: "세종" } });
    fireEvent.change(endDateInput, { target: { value: "2026-10-31" } });

    await waitFor(
      () => {
        expect(screen.queryByText("조회된 후보 없음")).not.toBeInTheDocument();
        expect(screen.getByText(/TourAPI 후보 \d+건/)).toBeInTheDocument();
      },
      { timeout: 8000 },
    );
  }, 30000);
});
