import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FestivalPlan } from "../domain/types";
import type { CityParkCandidate } from "../services/cityParkAdapter";
import { OPERATING_BOUNDARY_WARNING } from "../services/venueAreaEvidence";
import { VenueAreaReference } from "./VenueAreaReference";

const { lookupCityParkCandidatesMock } = vi.hoisted(() => ({
  lookupCityParkCandidatesMock: vi.fn(),
}));

vi.mock("../services/cityParkAdapter", () => ({
  lookupCityParkCandidates: lookupCityParkCandidatesMock,
}));

const candidate: CityParkCandidate = {
  id: "PARK-001",
  name: "여의도공원",
  type: "근린공원",
  roadAddress: "서울특별시 영등포구 여의공원로 68",
  lotAddress: "서울특별시 영등포구 여의도동 2",
  areaSquareMeters: 229539,
  managementOrganization: "서울특별시",
  referenceDate: "2026-01-01",
  matchScore: 1030,
};

const alternative: CityParkCandidate = {
  ...candidate,
  id: "PARK-002",
  name: "선유도공원",
  areaSquareMeters: 120000,
  matchScore: 110,
};

const plan: FestivalPlan = {
  name: "한강 축제",
  region: "서울특별시",
  venueAddress: "서울특별시 영등포구 여의도공원",
  startDate: "2026-09-12",
  endDate: "2026-09-14",
  operatingHours: [10, 12, 14, 16, 18],
  totalBudgetMillionKrw: 700,
  promotionBudgetMillionKrw: 100,
  safetyBudgetMillionKrw: 90,
  targetGroups: ["families"],
  keywords: ["공원"],
  expectedCapacity: 12000,
  gridWidth: 30,
  gridHeight: 20,
  programs: [],
  facilities: [],
};

describe("VenueAreaReference", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    lookupCityParkCandidatesMock.mockResolvedValue([candidate]);
  });

  it("does not change the plan during lookup and applies the best candidate explicitly", async () => {
    const user = userEvent.setup();
    const onPlanChange = vi.fn();
    render(<VenueAreaReference plan={plan} onPlanChange={onPlanChange} />);

    await screen.findByText("여의도공원");
    expect(screen.getByText("서울특별시 영등포구 여의도동 2")).toBeInTheDocument();
    expect(screen.getByText("전국도시공원정보표준데이터")).toBeInTheDocument();
    expect(onPlanChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "행사장 면적으로 적용" }));

    expect(onPlanChange).toHaveBeenCalledWith(
      expect.objectContaining({
        venueAreaSquareMeters: 229539,
        venueAreaProvenance: expect.objectContaining({
          origin: "public-data",
          sourceRecordId: "PARK-001",
        }),
      }),
    );
  });

  it("uses the canonical operating-boundary warning", async () => {
    render(<VenueAreaReference plan={plan} onPlanChange={vi.fn()} />);

    expect(await screen.findByText(OPERATING_BOUNDARY_WARNING)).toBeInTheDocument();
  });

  it("lets the operator choose an alternative before applying it", async () => {
    const user = userEvent.setup();
    const onPlanChange = vi.fn();
    lookupCityParkCandidatesMock.mockResolvedValue([candidate, alternative]);
    render(<VenueAreaReference plan={plan} onPlanChange={onPlanChange} />);

    const selector = await screen.findByRole("combobox", { name: "도시공원 후보" });
    await user.selectOptions(selector, "PARK-002");
    await user.click(screen.getByRole("button", { name: "행사장 면적으로 적용" }));

    expect(onPlanChange).toHaveBeenCalledWith(
      expect.objectContaining({
        venueAreaSquareMeters: 120000,
        venueAreaProvenance: expect.objectContaining({ sourceRecordId: "PARK-002" }),
      }),
    );
  });

  it("keeps an existing area when lookup fails and offers retry", async () => {
    const user = userEvent.setup();
    const onPlanChange = vi.fn();
    lookupCityParkCandidatesMock.mockRejectedValueOnce(new Error("network"));
    render(
      <VenueAreaReference
        plan={{ ...plan, venueAreaSquareMeters: 4000 }}
        onPlanChange={onPlanChange}
      />,
    );

    expect(await screen.findByText("도시공원 조회에 실패했습니다.")).toBeInTheDocument();
    expect(screen.getByDisplayValue("4000")).toBeInTheDocument();
    expect(onPlanChange).not.toHaveBeenCalled();

    lookupCityParkCandidatesMock.mockResolvedValueOnce([candidate]);
    await user.click(screen.getByRole("button", { name: "도시공원 조회 다시 시도" }));
    await waitFor(() => expect(screen.getByText("여의도공원")).toBeInTheDocument());
  });

  it("shows loading and empty states without changing manual area input", async () => {
    let resolveLookup: ((value: CityParkCandidate[]) => void) | undefined;
    lookupCityParkCandidatesMock.mockImplementation(
      () => new Promise<CityParkCandidate[]>((resolve) => { resolveLookup = resolve; }),
    );
    const onPlanChange = vi.fn();
    render(
      <VenueAreaReference plan={{ ...plan, venueAreaSquareMeters: 4000 }} onPlanChange={onPlanChange} />,
    );

    expect(screen.getByText("도시공원 조회 중")).toBeInTheDocument();
    resolveLookup?.([]);
    expect(await screen.findByText("일치하는 도시공원 정보 없음")).toBeInTheDocument();
    expect(screen.getByDisplayValue("4000")).toBeInTheDocument();
    expect(onPlanChange).not.toHaveBeenCalled();
  });

  it("aborts the previous lookup and ignores its stale resolution after a venue change", async () => {
    const resolvers: Array<(value: CityParkCandidate[]) => void> = [];
    lookupCityParkCandidatesMock.mockImplementation(
      () => new Promise<CityParkCandidate[]>((resolve) => { resolvers.push(resolve); }),
    );
    const onPlanChange = vi.fn();
    const view = render(<VenueAreaReference plan={plan} onPlanChange={onPlanChange} />);
    await waitFor(() => expect(lookupCityParkCandidatesMock).toHaveBeenCalledTimes(1));

    view.rerender(
      <VenueAreaReference
        plan={{ ...plan, venueAddress: "서울특별시 영등포구 선유도공원" }}
        onPlanChange={onPlanChange}
      />,
    );
    await waitFor(() => expect(lookupCityParkCandidatesMock).toHaveBeenCalledTimes(2));
    expect(lookupCityParkCandidatesMock.mock.calls[0][1].signal.aborted).toBe(true);

    resolvers[0]?.([candidate]);
    await Promise.resolve();
    expect(screen.queryByText("여의도공원")).not.toBeInTheDocument();

    resolvers[1]?.([alternative]);
    expect(await screen.findByText("선유도공원")).toBeInTheDocument();
  });

  it("clears manual area input and its provenance when the value is removed", async () => {
    const onPlanChange = vi.fn();
    render(
      <VenueAreaReference
        plan={{
          ...plan,
          venueAreaSquareMeters: 4000,
          venueAreaProvenance: { origin: "user-input" },
        }}
        onPlanChange={onPlanChange}
      />,
    );

    fireEvent.change(await screen.findByLabelText("행사장 면적 (m²)"), { target: { value: "" } });

    expect(onPlanChange).toHaveBeenCalledWith(
      expect.objectContaining({
        venueAreaSquareMeters: undefined,
        venueAreaProvenance: undefined,
      }),
    );
  });

  it("supports manual input and marks a public-data value as adjusted", async () => {
    const onPlanChange = vi.fn();
    const appliedPlan: FestivalPlan = {
      ...plan,
      venueAreaSquareMeters: 229539,
      venueAreaProvenance: {
        origin: "public-data",
        sourceDataset: "전국도시공원정보표준데이터",
        sourceRecordId: "PARK-001",
        sourceParkName: "여의도공원",
        referenceAreaSquareMeters: 229539,
        managementOrganization: "서울특별시",
        referenceDate: "2026-01-01",
        appliedAt: "2026-01-01T00:00:00.000Z",
      },
    };
    render(<VenueAreaReference plan={appliedPlan} onPlanChange={onPlanChange} />);

    const areaInput = await screen.findByLabelText("행사장 면적 (m²)");
    fireEvent.change(areaInput, { target: { value: "12000" } });

    expect(onPlanChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        venueAreaSquareMeters: 12000,
        venueAreaProvenance: expect.objectContaining({
          origin: "user-adjusted",
          sourceRecordId: "PARK-001",
          referenceAreaSquareMeters: 229539,
        }),
      }),
    );
  });
});
