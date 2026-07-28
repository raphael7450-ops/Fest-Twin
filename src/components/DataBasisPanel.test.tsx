import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { sampleTourismContext } from "../data/sampleTourApi";
import { sampleTrendContext } from "../data/sampleTrends";
import { DataBasisPanel } from "./DataBasisPanel";

describe("DataBasisPanel", () => {
  it("shows TourAPI operating account application evidence without exposing secrets", () => {
    render(<DataBasisPanel tourism={sampleTourismContext} trends={sampleTrendContext} />);

    expect(screen.getByText("OpenAPI 운영계정 신청 증빙")).toBeInTheDocument();
    expect(screen.getByText("https://cwserver.tail97dbc3.ts.net/")).toBeInTheDocument();
    expect(screen.getByText("areaCode2")).toBeInTheDocument();
    expect(screen.getByText("searchFestival2")).toBeInTheDocument();
    expect(screen.getByText("detailCommon2")).toBeInTheDocument();
    expect(screen.getByText("locationBasedList2")).toBeInTheDocument();
    expect(screen.getByText(/오퍼레이션별 일 1,000건/)).toBeInTheDocument();
    expect(screen.getByText(/운영계정 승인.*1~3일/)).toBeInTheDocument();
    expect(screen.getByText(/서비스키는 서버 환경변수/)).toBeInTheDocument();
    expect(screen.queryByText(/serviceKey|clientSecret|Authorization|Cookie/i)).not.toBeInTheDocument();
  });
});
