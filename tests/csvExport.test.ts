import { describe, expect, it } from "vitest";
import { createTestAnalysisSnapshot } from "../src/test/analysisSnapshotFixture";
import {
  buildCsvReportContent,
  escapeCsvCell,
  formatCsvRow,
  generateCsvFilename,
} from "../src/utils/csvExport";

describe("src/utils/csvExport - B2G CSV Report Generator", () => {
  it("prepends UTF-8 BOM (\\uFEFF) to prevent Korean character corruption in Windows Excel", () => {
    const csv = buildCsvReportContent({ snapshot: createTestAnalysisSnapshot() });

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("structures CSV into the required 4 administrative sections", () => {
    const snapshot = createTestAnalysisSnapshot();
    const csv = buildCsvReportContent({ snapshot });

    expect(csv).toContain("[구획 1] 행정 메타데이터 (Document Metadata)");
    expect(csv).toContain("[구획 2] 핵심 시뮬레이션 요약 (Executive Summary Metrics)");
    expect(csv).toContain("[구획 3] 4단계 수치 산출 근거 상세 (Step Breakdown Evidence)");
    expect(csv).toContain("[구획 4] 데이터 출처 및 행정 감사 라벨 (Data Provenance & Audit)");
    expect(csv).toContain("[Fest-Twin] 축제·행사 사전 진단 및 수요 추정 결과 보고서");
    expect(csv).toContain(snapshot.plan.name);
    expect(csv).toContain("Fest-Twin B2G SaaS Web v0.1.0");
    expect(csv).toContain(`${snapshot.forecast.expectedVisitors.toLocaleString("ko-KR")}명`);
    expect(csv).toContain(`${snapshot.forecast.peakHour}:00`);
    expect(csv).toContain(`${snapshot.metrics.summary.successPotential.score}점`);
    expect(csv).toContain("Step 1 (베이스라인)");
    expect(csv).toContain("Step 2 (가중치 계수)");
    expect(csv).toContain("Step 3 (상권/경제 보정)");
    expect(csv).toContain("Step 4 (최종 산출 연산식)");
    expect(csv).toContain("한국관광공사 TourAPI 4.0");
    expect(csv).toContain(`AUDIT-HASH-SHA256-${snapshot.analysisId}`);
    expect(csv).toContain("개인정보 미수집 (0건 준수)");
  });

  it("includes committed identity, creation time, statuses, and canonical output values", () => {
    const snapshot = createTestAnalysisSnapshot();
    const csv = buildCsvReportContent({ snapshot });

    expect(csv).toContain(snapshot.analysisId);
    expect(csv).toContain(snapshot.modelVersion);
    expect(csv).toContain(snapshot.createdAt);
    expect(csv).toContain(snapshot.festivalId);
    expect(csv).toContain(String(snapshot.metrics.summary.capacityPressure.displayPercent));
    expect(csv).toContain(String(snapshot.safety.summary.staffing.recommended));
    Object.entries(snapshot.datasets).forEach(([name, dataset]) => {
      expect(csv).toContain(`dataset:${name}`);
      expect(csv).toContain(dataset.status);
    });
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
