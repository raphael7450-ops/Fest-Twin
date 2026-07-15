import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders the government-guided Fest-Twin shell", () => {
    render(<App />);

    expect(screen.getByText("페스트트윈(Fest-Twin)")).toBeInTheDocument();
    expect(screen.getByText("정부 지침 기반 B2G SaaS MVP")).toBeInTheDocument();
    expect(screen.getByText("KRDS")).toBeInTheDocument();
    expect(screen.getByText("전자정부 웹 품질")).toBeInTheDocument();
    expect(screen.getByText("KWCAG 2.2")).toBeInTheDocument();
  });
});
