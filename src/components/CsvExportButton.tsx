import type { FestivalAnalysisSnapshot } from "../services/analysisSnapshot";
import { buildCsvReportContent, generateCsvFilename } from "../utils/csvExport";

interface CsvExportButtonProps {
  snapshot: FestivalAnalysisSnapshot;
}

export function CsvExportButton({ snapshot }: CsvExportButtonProps) {
  const handleExportCsv = () => {
    const csvContent = buildCsvReportContent({ snapshot });

    const filename = generateCsvFilename(snapshot.plan.name, new Date(snapshot.createdAt));

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
