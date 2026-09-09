import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FestivalCandidatePanel } from "./FestivalCandidatePanel";
import type { FestivalCandidate } from "../services/tourApiAdapter";

afterEach(cleanup);
const candidates: FestivalCandidate[] = [
  { id: "review", title: "미확정 축제", address: "서울", startDate: "", endDate: "", dateStatus: "needs-review", searchScope: "regional-supplement" },
  { id: "a", title: "강변 음악 축제", address: "서울 한강", startDate: "2026-10-17", endDate: "2026-10-19", searchScope: "exact-period" },
  { id: "b", title: "공원 문화 축제", address: "서울 공원", startDate: "2026-10-20", endDate: "2026-10-21", searchScope: "exact-period" },
];
const props = { isOpen: true, isLoading: false, candidates, onClose: vi.fn(), onSelectCandidate: vi.fn() };

describe("candidate panel UX", () => {
  it("defaults to selectable candidates and separates review-required records", () => {
    render(<FestivalCandidatePanel {...props} />);
    expect(screen.queryByRole("heading", { name: "미확정 축제" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "일정 확인 필요 1" }));
    expect(screen.getByRole("heading", { name: "미확정 축제" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "일정 확인 필요" })).toBeDisabled();
  });
  it("filters by title or venue and shows an explicit search empty state", async () => {
    render(<FestivalCandidatePanel {...props} />);
    const search = screen.getByRole("searchbox", { name: "축제명 또는 장소 검색" });
    fireEvent.change(search, { target: { value: "한강" } });
    expect(screen.getByRole("heading", { name: "강변 음악 축제" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "공원 문화 축제" })).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: "없는 축제" } });
    expect(screen.getByText("검색 결과가 없습니다.")).toBeInTheDocument();
  });
  it("focuses search, traps keyboard navigation and restores focus on close", async () => {
    const user = userEvent.setup();
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    const onClose = vi.fn();
    const { rerender, unmount } = render(<FestivalCandidatePanel {...props} onClose={onClose} />);
    expect(screen.getByRole("searchbox")).toHaveFocus();
    const close = screen.getByRole("button", { name: "닫기" });
    close.focus();
    await user.tab({ shift: true });
    const actions = within(screen.getByRole("dialog")).getAllByRole("button", { name: "이 축제 선택" });
    expect(actions[actions.length - 1]).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
    rerender(<FestivalCandidatePanel {...props} isOpen={false} onClose={onClose} />);
    expect(opener).toHaveFocus();
    unmount();
    opener.remove();
  });
});
