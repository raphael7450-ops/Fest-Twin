interface GovernmentHeaderProps {
  onOpenFestivalSearch?: () => void;
}

export function GovernmentHeader({ onOpenFestivalSearch }: GovernmentHeaderProps) {
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

        {onOpenFestivalSearch && (
          <button
            className="text-button"
            type="button"
            onClick={onOpenFestivalSearch}
            style={{
              padding: "6px 14px",
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              color: "#ffffff",
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "0.85rem",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(37, 99, 235, 0.3)",
            }}
            aria-label="전국 축제 검색 및 변경"
          >
            축제 검색/변경
          </button>
        )}

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

