import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { sampleTourismContext } from "../data/sampleTourApi";
import { sampleTrendContext } from "../data/sampleTrends";
import { sampleTrafficContext } from "../data/sampleTraffic";
import { sampleSpendingContext } from "../data/sampleSpending";
import { sampleDemandBackdataContext } from "../data/sampleDemandBackdata";
import type { SelectedFestivalBasis } from "../domain/types";
import { DataBasisPanel } from "./DataBasisPanel";

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
    expect(screen.getByText("주최 / 주관")).toBeInTheDocument();
    expect(screen.getByText("Seoul Gangnam-gu Yeongdong-daero 511")).toBeInTheDocument();
  });

  it("summarizes data source status across evidence contexts", () => {
    const { container } = render(
      <DataBasisPanel
        tourism={sampleTourismContext}
        trends={sampleTrendContext}
        traffic={sampleTrafficContext}
        spending={sampleSpendingContext}
        demandBackdata={sampleDemandBackdataContext}
      />,
    );
    const panel = within(container);

    expect(panel.getByText("데이터 상태 요약")).toBeInTheDocument();
    expect(panel.getByText("TourAPI")).toBeInTheDocument();
    expect(panel.getByText("검색 관심도")).toBeInTheDocument();
    expect(panel.getByText("교통 근거")).toBeInTheDocument();
    expect(panel.getByText("관광소비")).toBeInTheDocument();
    expect(panel.getByText("지역 수요 백데이터")).toBeInTheDocument();
    expect(panel.getByText("파일 정규화")).toBeInTheDocument();
  });
});
