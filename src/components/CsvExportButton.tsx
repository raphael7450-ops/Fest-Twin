import type { FestivalPlan, ForecastResult, PlanningReport, SpendingContext } from "../domain/types";

interface CsvExportButtonProps {
  plan: FestivalPlan;
  forecast: ForecastResult;
  report: PlanningReport;
  spending?: SpendingContext;
}

export function CsvExportButton({ plan, forecast, report, spending }: CsvExportButtonProps) {
  const handleExportCsv = () => {
    const rows = [
      ["분류", "수치 및 내용"],
      ["축제명", plan.name],
      ["지역/개최지", `${plan.region} (${plan.venueAddress || "미정"})`],
      ["행사기간", `${plan.startDate} ~ ${plan.endDate}`],
      ["총 투입예산", `${plan.totalBudgetMillionKrw}백만원`],
      ["안전 예산", `${plan.safetyBudgetMillionKrw}백만원`],
      ["홍보 예산", `${plan.promotionBudgetMillionKrw}백만원`],
      ["예상 방문객 수", `${forecast.expectedVisitors.toLocaleString("ko-KR")}명`],
      ["피크 시간대", `${forecast.peakHour}:00`],
      ["성공 예측 점수", `${forecast.successScore}점 (신뢰도 ${forecast.confidence})`],
      ["인당 추정 소비액", spending ? `${spending.averageSpendPerVisitorKrw.toLocaleString("ko-KR")}원` : "공공데이터 샘플"],
      ["요약 총평", report.summary],
      ["추출 일시", new Date().toLocaleString("ko-KR")],
    ];

    const csvContent =
      "\uFEFF" +
      rows
        .map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(","))
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${plan.name.replace(/[\/\s]/g, "_")}_기획보완리포트_지표.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button className="print-button csv-export-button" type="button" onClick={handleExportCsv}>
      CSV 다운로드
    </button>
  );
}
