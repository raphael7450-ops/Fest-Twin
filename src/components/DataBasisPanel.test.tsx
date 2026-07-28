import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { sampleDemandBackdataContext } from "../data/sampleDemandBackdata";
import { sampleSpendingContext } from "../data/sampleSpending";
import { sampleTrafficContext } from "../data/sampleTraffic";
import { sampleTourismContext } from "../data/sampleTourApi";
import { sampleTrendContext } from "../data/sampleTrends";
import type { SelectedFestivalBasis } from "../domain/types";
import { DataBasisPanel } from "./DataBasisPanel";

afterEach(() => {
  cleanup();
});

const selectedFestivalBasis: SelectedFestivalBasis = {
  contentId: "3439947",
  title: "Gangnam Media Winter Festa",
  address: "Seoul Gangnam-gu Yeongdong-daero 511",
  startDate: "2025-12-19",
  endDate: "2026-01-03",
  mapX: "127.0610512042",
  mapY: "37.5103955843",
  sourceName: "TourAPI selected festival candidate",
};

describe("DataBasisPanel", () => {
  it("shows compact data source status rows", () => {
    render(
      <DataBasisPanel
        tourism={sampleTourismContext}
        trends={sampleTrendContext}
        traffic={sampleTrafficContext}
        spending={sampleSpendingContext}
        demandBackdata={sampleDemandBackdataContext}
      />,
    );

    expect(screen.getByText("데이터 근거")).toBeInTheDocument();
    expect(screen.getByText("TourAPI 축제·관광지")).toBeInTheDocument();
    expect(screen.getByText("검색·소셜 트렌드")).toBeInTheDocument();
    expect(screen.getByText("KTDB/View-T 교통")).toBeInTheDocument();
    expect(screen.getByText("관광소비 객단가")).toBeInTheDocument();
    expect(screen.getByText("지역 수요 백데이터")).toBeInTheDocument();
    expect(screen.getByText("3건 비교")).toBeInTheDocument();
  });

  it("shows TourAPI operating account application evidence without exposing secrets", () => {
    render(<DataBasisPanel tourism={sampleTourismContext} trends={sampleTrendContext} />);

    expect(screen.getByText("OpenAPI 운영계정 신청 증빙")).toBeInTheDocument();
    expect(screen.getByText("https://cwserver.tail97dbc3.ts.net/")).toBeInTheDocument();
    expect(screen.getByText("areaCode2")).toBeInTheDocument();
    expect(screen.getByText("searchFestival2")).toBeInTheDocument();
    expect(screen.getByText("detailCommon2")).toBeInTheDocument();
    expect(screen.getByText("locationBasedList2")).toBeInTheDocument();
    expect(screen.getByText(/일 1,000건/)).toBeInTheDocument();
    expect(screen.getByText(/약 1~3일/)).toBeInTheDocument();
    expect(screen.getByText(/서버 환경변수/)).toBeInTheDocument();
    expect(screen.queryByText(/serviceKey|clientSecret|Authorization|Cookie/i)).not.toBeInTheDocument();
  });

  it("shows the selected TourAPI festival basis", () => {
    render(
      <DataBasisPanel
        tourism={sampleTourismContext}
        trends={sampleTrendContext}
        selectedFestivalBasis={selectedFestivalBasis}
      />,
    );

    expect(screen.getByText("선택 TourAPI 축제 기준")).toBeInTheDocument();
    expect(screen.getByText("Gangnam Media Winter Festa")).toBeInTheDocument();
    expect(screen.getByText("3439947")).toBeInTheDocument();
    expect(screen.getByText("127.0610512042, 37.5103955843")).toBeInTheDocument();
  });
});
