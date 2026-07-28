export function PrintReportButton() {
  return (
    <button className="print-button" type="button" onClick={() => window.print()}>
      보고서 인쇄
    </button>
  );
}
