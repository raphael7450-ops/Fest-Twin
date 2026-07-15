export function App() {
  return (
    <main className="app-shell">
      <header className="government-header">
        <div>
          <p className="eyebrow">정부 지침 기반 B2G SaaS MVP</p>
          <h1>페스트트윈(Fest-Twin)</h1>
          <p>
            지자체 축제 기획안을 TourAPI와 트렌드 데이터로 사전 진단하는
            축제 수요 예측·군중 안전 플랫폼입니다.
          </p>
        </div>
        <span className="status-pill">공공 검토용 데모</span>
      </header>

      <section className="standard-strip" aria-label="적용 지침">
        <span>KRDS</span>
        <span>전자정부 웹 품질</span>
        <span>KWCAG 2.2</span>
        <span>공공 SaaS</span>
        <span>공공데이터</span>
        <span>개인정보 최소수집</span>
      </section>
    </main>
  );
}
