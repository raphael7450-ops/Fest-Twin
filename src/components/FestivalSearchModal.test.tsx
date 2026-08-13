import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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

  it("enriches a coordinate-less DB festival only after it is selected", async () => {
    const handleClose = vi.fn();
    const handleSelectPreset = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input), "http://localhost");
        if (url.pathname === "/api/regional-festivals") {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              count: 1,
              records: [
                {
                  id: "mcst-seoul-light-2026",
                  name: "2026 서울라이트 광화문",
                  region: "서울",
                  venue: "광화문 및 광화문광장",
                  startDate: "2026-12-20",
                  endDate: "2027-01-12",
                  sourceName: "문화체육관광부_지역축제 정보",
                },
              ],
            }),
          } as Response;
        }

        return {
          ok: true,
          status: 200,
          json: async () => ({
            response: {
              header: { resultCode: "0000", resultMsg: "OK" },
              body: {
                items: {
                  item: [
                    {
                      contentid: "3073454",
                      title: "서울라이트 광화문",
                      addr1: "서울특별시 종로구 세종로 1-68",
                      mapx: "126.9767821434",
                      mapy: "37.5716786179",
                    },
                  ],
                },
                numOfRows: 10,
                pageNo: 1,
                totalCount: 1,
              },
            },
          }),
        } as Response;
      }),
    );

    render(
      <FestivalSearchModal
        isOpen={true}
        onClose={handleClose}
        onSelectPreset={handleSelectPreset}
      />,
    );
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const festivalHeading = screen.getByText("2026 서울라이트 광화문");
    const dbFestival = festivalHeading.closest("article");
    expect(dbFestival).not.toBeNull();
    fireEvent.click(within(dbFestival!).getByTestId("apply-preset-btn"));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(handleSelectPreset).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: expect.objectContaining({
          venueCoordinates: {
            longitude: 126.9767821434,
            latitude: 37.5716786179,
            source: "tourapi",
          },
        }),
        basis: expect.objectContaining({
          mapX: "126.9767821434",
          mapY: "37.5716786179",
        }),
      }),
    );
    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(screen.queryAllByRole("img")).toHaveLength(0);
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
