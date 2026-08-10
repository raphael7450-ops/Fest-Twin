import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { FestivalSearchModal } from "./FestivalSearchModal";

describe("FestivalSearchModal", () => {
  afterEach(() => {
    cleanup();
  });
  it("renders festival search modal and filters presets by keyword", () => {
    const handleClose = vi.fn();
    const handleSelectPreset = vi.fn();

    render(
      <FestivalSearchModal
        isOpen={true}
        onClose={handleClose}
        onSelectPreset={handleSelectPreset}
      />
    );

    expect(screen.getByText("전체 축제 실시간 검색")).toBeInTheDocument();
    expect(screen.getByText("보령 머드축제")).toBeInTheDocument();
    expect(screen.getByText("부산 불꽃축제")).toBeInTheDocument();

    const searchInput = screen.getByRole("searchbox", { name: "축제 검색어 입력" });
    fireEvent.change(searchInput, { target: { value: "머드" } });

    expect(screen.getByText("보령 머드축제")).toBeInTheDocument();
    expect(screen.queryByText("부산 불꽃축제")).toBeNull();
  });

  it("calls onSelectPreset when apply button is clicked", () => {
    const handleClose = vi.fn();
    const handleSelectPreset = vi.fn();

    render(
      <FestivalSearchModal
        isOpen={true}
        onClose={handleClose}
        onSelectPreset={handleSelectPreset}
      />
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
      />
    );

    expect(screen.queryAllByRole("img")).toHaveLength(0);
  });
});
