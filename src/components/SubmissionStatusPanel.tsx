const submissionStatuses = [
  {
    label: "공개 데모",
    value: "cwserver.tail97dbc3.ts.net",
    detail: "Tailscale Funnel HTTPS 공개 URL",
    href: "https://cwserver.tail97dbc3.ts.net/",
  },
  {
    label: "TourAPI 프록시",
    value: "festivals/detail resultCode=0000",
    detail: "브라우저는 서버의 /api/tour/* 경로만 호출",
  },
  {
    label: "보안",
    value: "인증키는 서버 런타임 환경변수로만 주입",
    detail: "Git, 브라우저 번들, 제출 문서에 비밀값 미기록",
  },
  {
    label: "제출 상태",
    value: "문서·스크린샷·공개 URL 검증 완료",
    detail: "제출 요약서, 시연 가이드, 검증 체크리스트 정리",
  },
];

export function SubmissionStatusPanel() {
  return (
    <section className="panel submission-status-panel" aria-labelledby="submission-status-title">
      <div className="panel-heading">
        <div>
          <h2 id="submission-status-title">제출 데모 검증 현황</h2>
          <span>공개 URL과 공공데이터 연동 상태</span>
        </div>
        <a className="status-link" href="https://cwserver.tail97dbc3.ts.net/" target="_blank" rel="noreferrer">
          공개 데모 열기
        </a>
      </div>
      <div className="submission-status-grid">
        {submissionStatuses.map((item) => (
          <article className="submission-status-card" key={item.label}>
            <span>{item.label}</span>
            {item.href ? (
              <a href={item.href} target="_blank" rel="noreferrer">
                {item.value}
              </a>
            ) : (
              <strong>{item.value}</strong>
            )}
            <small>{item.detail}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
