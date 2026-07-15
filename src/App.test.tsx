import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders the government-guided Fest-Twin MVP dashboard", () => {
    render(<App />);

    expect(screen.getByText("페스트트윈(Fest-Twin)")).toBeInTheDocument();
    expect(screen.getByText("정부 지침 반영 현황")).toBeInTheDocument();
    expect(screen.getByText("축제 기획안 입력")).toBeInTheDocument();
    expect(screen.getByText("데이터 근거")).toBeInTheDocument();
    expect(screen.getByText("시간대별 수요 예측")).toBeInTheDocument();
    expect(screen.getByText("혼잡도 시뮬레이션")).toBeInTheDocument();
    expect(screen.getByText("기획 보완 리포트")).toBeInTheDocument();
  });
});
