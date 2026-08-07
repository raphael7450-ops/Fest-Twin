export function GovernmentHeader() {
  return (
    <header className="government-header">
      <div className="government-header__brand">
        <span className="government-header__mark" aria-hidden="true">FT</span>
        <div className="government-header__content">
          <p className="eyebrow">B2G SaaS Control Center</p>
          <h1>페스트트윈(Fest-Twin)</h1>
          <p>
            지자체가 축제 예산 집행 전에 수요, 혼잡, 안전, 만족도 리스크를
            공공데이터와 시뮬레이션으로 검토하는 사전 진단 플랫폼입니다.
          </p>
        </div>
      </div>
      <div className="government-header__meta" aria-label="데모 검토 상태">
        <span className="status-pill">공공 검토 대시보드</span>
        <span>실데이터 우선</span>

        <button
          className="print-button b2g-pdf-button"
          type="button"
          onClick={() => window.print()}
          aria-label="PDF 보고서 출력 및 다운로드"
        >
          PDF 보고서 출력
        </button>
      </div>
    </header>
  );
}

