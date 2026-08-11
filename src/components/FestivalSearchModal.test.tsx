import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FESTIVAL_PRESETS } from "../data/festivalPresets";
import { FestivalSearchModal } from "./FestivalSearchModal";

describe("FestivalSearchModal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-11T09:00:00+09:00"));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ count: 0, records: [] }),
      })),
    );
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("renders only ongoing or upcoming preset festivals and filters them by keyword", () => {
    const futurePreset = FESTIVAL_PRESETS.find((preset) => preset.id === "preset_busan_fireworks");
    const pastPreset = FESTIVAL_PRESETS.find((preset) => preset.id === "preset_boryeong_mud");
    const inactivePreset = FESTIVAL_PRESETS.find((preset) => preset.id === "preset_daejeon_0시축제");

    render(
      <FestivalSearchModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectPreset={vi.fn()}
      />,
    );

    expect(screen.getByText(futurePreset?.name ?? "")).toBeInTheDocument();
    expect(screen.queryByText(pastPreset?.name ?? "")).toBeNull();
    expect(screen.queryByText(inactivePreset?.name ?? "")).toBeNull();

    const searchInput = screen.getByRole("searchbox");
    fireEvent.change(searchInput, { target: { value: futurePreset?.name.slice(0, 2) ?? "" } });

    expect(screen.getByText(futurePreset?.name ?? "")).toBeInTheDocument();
    expect(screen.queryByText(pastPreset?.name ?? "")).toBeNull();
    expect(screen.queryByText(inactivePreset?.name ?? "")).toBeNull();
  });

  it("requests only ongoing or upcoming DB festivals for planning search", () => {
    render(
      <FestivalSearchModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectPreset={vi.fn()}
      />,
    );

    expect(fetch).toHaveBeenCalled();

    const firstUrl = new URL(String(vi.mocked(fetch).mock.calls[0][0]), "http://localhost");
    expect(firstUrl.pathname).toBe("/api/regional-festivals");
    expect(firstUrl.searchParams.get("minEndDate")).toBe("2026-08-11");
  });

  it("calls onSelectPreset when apply button is clicked", () => {
    const handleClose = vi.fn();
    const handleSelectPreset = vi.fn();

    render(
      <FestivalSearchModal
        isOpen={true}
        onClose={handleClose}
        onSelectPreset={handleSelectPreset}
      />,
    );

    const applyButtons = screen.getAllByTestId("apply-preset-btn");
    fireEvent.click(applyButtons[0]);

    expect(handleSelectPreset).toHaveBeenCalledTimes(1);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("renders festival choices without image elements so search stays lightweight", () => {
    render(
      <FestivalSearchModal
        isOpen={true}
        onClose={vi.fn()}
        onSelectPreset={vi.fn()}
      />,
    );

    expect(screen.queryAllByRole("img")).toHaveLength(0);
  });
});
