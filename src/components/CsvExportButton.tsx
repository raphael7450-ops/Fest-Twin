import type {
  FestivalPlan,
  ForecastResult,
  MetricEvidence,
  MetricEvidenceId,
  PlanningReport,
  SelectedFestivalBasis,
  SpendingContext,
} from "../domain/types";
import { buildCsvReportContent, generateCsvFilename } from "../utils/csvExport";

interface CsvExportButtonProps {
  plan: FestivalPlan;
  forecast: ForecastResult;
  report: PlanningReport;
  spending?: SpendingContext;
  selectedFestivalBasis?: SelectedFestivalBasis | null;
  evidenceSet?: Record<MetricEvidenceId, MetricEvidence>;
  shareToken?: string;
}

export function CsvExportButton({
  plan,
  forecast,
  report,
  spending,
  selectedFestivalBasis,
  evidenceSet,
  shareToken,
}: CsvExportButtonProps) {
  const handleExportCsv = () => {
    const csvContent = buildCsvReportContent({
      plan,
      forecast,
      report,
      spending,
      selectedFestivalBasis,
      evidenceSet,
      shareToken,
    });

    const filename = generateCsvFilename(plan.name);

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
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
