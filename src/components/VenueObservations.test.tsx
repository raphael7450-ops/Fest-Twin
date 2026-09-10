import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VenueObservations } from "./VenueObservations";
import { createUnavailableInfrastructureContext } from "../services/infrastructureAdapter";

describe("VenueObservations", () => {
  it("renders observed records and distinguishes unavailable datasets", () => {
    const context = createUnavailableInfrastructureContext();
    context.sourceDetails[0] = { ...context.sourceDetails[0], sourceType: "public-data", statusLabel: "위치 확인 1곳", records: [{ label: "실제 정류장", fields: [{ label: "직선거리", value: "120m" }] }] };
    render(<VenueObservations infrastructure={context} />);
    expect(screen.getByRole("heading", { name: "주변 실데이터" })).toBeInTheDocument();
    expect(screen.getByText("실제 정류장")).toBeInTheDocument();
    expect(screen.getAllByText("자료 미확보")).toHaveLength(2);
    expect(screen.queryByText("골든타임 확보")).not.toBeInTheDocument();
  });
});
