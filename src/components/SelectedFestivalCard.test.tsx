import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SelectedFestivalBasis } from "../domain/types";
import { SelectedFestivalCard } from "./SelectedFestivalCard";

describe("SelectedFestivalCard", () => {
  it("renders nothing when selectedFestivalBasis is null", () => {
    const { container } = render(<SelectedFestivalCard selectedFestivalBasis={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders festival title, image, address, and dates when basis is provided", () => {
    const basis: SelectedFestivalBasis = {
      contentId: "123456",
      title: "강남 미디어 윈터페스타",
      address: "서울 강남구 영동대로 511",
      startDate: "2025-12-19",
      endDate: "2026-01-03",
      mapX: "127.061",
      mapY: "37.510",
      imageUrl: "https://example.com/festival_image.jpg",
      sourceName: "TourAPI selected festival candidate",
      operatingTimeText: "10:00 ~ 22:00",
    };

    render(<SelectedFestivalCard selectedFestivalBasis={basis} />);

    expect(screen.getByText(/강남 미디어 윈터페스타/)).toBeInTheDocument();
    expect(screen.getByText("서울 강남구 영동대로 511")).toBeInTheDocument();
    expect(screen.getByText("2025-12-19 ~ 2026-01-03")).toBeInTheDocument();
    expect(screen.getByText("10:00 ~ 22:00")).toBeInTheDocument();
    expect(screen.getByText("123456")).toBeInTheDocument();

    const img = screen.getByRole("img", { name: "강남 미디어 윈터페스타" });
    expect(img).toHaveAttribute("src", "https://example.com/festival_image.jpg");
  });
});
