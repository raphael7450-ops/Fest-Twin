import { describe, expect, it } from "vitest";
import { sampleFestivalPlan } from "../src/data/sampleFestivalPlan";
import { sampleSpendingContext } from "../src/data/sampleSpending";
import { sampleTourismContext } from "../src/data/sampleTourApi";
import { sampleTrendContext } from "../src/data/sampleTrends";
import type { ForecastResult, PlanningReport } from "../src/domain/types";
import { createMetricEvidenceSet } from "../src/services/metricEvidence";
import { createSimulation } from "../src/services/simulation";
import {
  buildCsvReportContent,
  escapeCsvCell,
  formatCsvRow,
  generateCsvFilename,
} from "../src/utils/csvExport";

const dummyForecast: ForecastResult = {
  expectedVisitors: 52200,
  visitorsByHour: [
    { hour: 18, visitors: 15000 },
    { hour: 20, visitors: 22000 },
  ],
  peakHour: 20,
  successScore: 88,
  confidence: "high",
  reasons: [
    { label: "축제 관심도 상승", impact: 10 },
    { label: "교통 대중교통 접근 양호", impact: 5 },
  ],
};

const dummyReport: PlanningReport = {
  summary: "피크 시간대 20:00에 22,000명 집적 예상. 현장 인프라 보강을 권고합니다.",
  governmentReviewNote: "예산 집행 전 지자체 사전 검토용 보고서입니다.",
  scores: [
    {
      label: "안전 진단 위험도",
      score: 38,
      level: "low",
      reason: "보행 밀집도 수용 범위 내 관리 가능",
    },
  ],
  findings: ["주차장 유입 집중 시간대 모니터링 필요"],
  recommendations: [],
};

describe("src/utils/csvExport - B2G CSV Report Generator", () => {
  it("prepends UTF-8 BOM (\\uFEFF) to prevent Korean character corruption in Windows Excel", () => {
    const csv = buildCsvReportContent({
      plan: sampleFestivalPlan,
      forecast: dummyForecast,
      report: dummyReport,
      spending: sampleSpendingContext,
    });

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("structures CSV into the required 4 administrative sections", () => {
    const simulation = createSimulation(sampleFestivalPlan, dummyForecast, dummyForecast.peakHour);
    const evidenceSet = createMetricEvidenceSet(
      sampleFestivalPlan,
      dummyForecast,
      simulation,
      sampleTourismContext,
      sampleTrendContext,
      undefined,
      sampleSpendingContext,
    );

    const csv = buildCsvReportContent({
      plan: sampleFestivalPlan,
      forecast: dummyForecast,
      report: dummyReport,
      spending: sampleSpendingContext,
      evidenceSet,
      shareToken: "token_seoul_fireworks_2026",
    });

    // 4대 구획 헤더 검증
    expect(csv).toContain("[구획 1] 행정 메타데이터 (Document Metadata)");
    expect(csv).toContain("[구획 2] 핵심 시뮬레이션 요약 (Executive Summary Metrics)");
    expect(csv).toContain("[구획 3] 4단계 수치 산출 근거 상세 (Step Breakdown Evidence)");
    expect(csv).toContain("[구획 4] 데이터 출처 및 행정 감사 라벨 (Data Provenance & Audit)");

    // 구획 1 세부 항목
    expect(csv).toContain("[Fest-Twin] 축제·행사 사전 진단 및 수요 추정 결과 보고서");
    expect(csv).toContain("token_seoul_fireworks_2026");
    expect(csv).toContain(sampleFestivalPlan.name);
    expect(csv).toContain("Fest-Twin B2G SaaS Web v0.1.0");

    // 구획 2 세부 항목
    expect(csv).toContain("52,200명");
    expect(csv).toContain("20:00");
    expect(csv).toContain("88점 (신뢰도 high)");

    // 구획 3 4단계 산출 근거 항목
    expect(csv).toContain("Step 1 (베이스라인)");
    expect(csv).toContain("Step 2 (가중치 계수)");
    expect(csv).toContain("Step 3 (상권/경제 보정)");
    expect(csv).toContain("Step 4 (최종 산출 연산식)");

    // 구획 4 행정 감사 항목
    expect(csv).toContain("한국관광공사 TourAPI 4.0");
    expect(csv).toContain("AUDIT-HASH-SHA256-token_seoul_fireworks_2026");
    expect(csv).toContain("개인정보 미수집 (0건 준수)");
  });

  it("generates filenames in the standardized format: Fest-Twin_시나리오명_YYYYMMDD_HHmm.csv", () => {
    const fixedDate = new Date("2026-08-04T13:08:43");
    const filename = generateCsvFilename("2026 서울세계불꽃축제", fixedDate);

    expect(filename).toBe("Fest-Twin_2026_서울세계불꽃축제_20260804_1308.csv");
  });

  it("sanitizes forbidden filename characters like slashes, colons, and question marks", () => {
    const fixedDate = new Date("2026-08-04T14:30:00");
    const filename = generateCsvFilename("서울:축제/테스트?안내*", fixedDate);

    expect(filename).toBe("Fest-Twin_서울_축제_테스트_안내__20260804_1430.csv");
  });

  it("properly escapes CSV cells containing quotes, commas, and newlines", () => {
    expect(escapeCsvCell('Hello "World"')).toBe('"Hello ""World"""');
    expect(escapeCsvCell("A,B,C")).toBe('"A,B,C"');
    expect(escapeCsvCell("Line1\nLine2")).toBe('"Line1\nLine2"');
    expect(escapeCsvCell(12345)).toBe('"12345"');
    expect(escapeCsvCell(null)).toBe('""');

    const row = formatCsvRow(["항목", '내용 "샘플"', 100]);
    expect(row).toBe('"항목","내용 ""샘플""","100"');
  });
});
