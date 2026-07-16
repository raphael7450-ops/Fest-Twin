export function PrintReportButton() {
  return (
    <button className="print-button" type="button" onClick={() => window.print()}>
      리포트 인쇄
    </button>
  );
}
