import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FestivalCandidatePanel } from "./FestivalCandidatePanel";

afterEach(cleanup);

describe("candidate schedule guard", () => {
  it("shows uncertain schedules and prevents applying their search bounds to a plan", () => {
    const onSelectCandidate = vi.fn();
    render(<FestivalCandidatePanel isOpen isLoading={false} onClose={vi.fn()} onSelectCandidate={onSelectCandidate}
      candidates={[{ id: "unknown", title: "검증대기축제", address: "서울", startDate: "", endDate: "",
        dateStatus: "needs-review", periodLabel: "2026-10 일정 확인 필요", searchScope: "regional-supplement" }]} />);
    fireEvent.click(screen.getByRole("button", { name: "일정 확인 필요 1" }));
    expect(screen.getByText("2026-10 일정 확인 필요")).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "일정 확인 필요" });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onSelectCandidate).not.toHaveBeenCalled();
  });
});
