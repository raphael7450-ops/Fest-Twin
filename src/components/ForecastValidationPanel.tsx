import type { ArchiveState } from "../hooks/useForecastArchive";

const labels = { idle: "보관 대기", saving: "서버 보관 중", saved: "서버 보관 완료 · 검증 전", failed: "보관 실패 · 분석 결과는 유지됩니다" };
export function ForecastValidationPanel({ state }: { state: ArchiveState }) {
  const summary = state.summary;
  return <section className="forecast-validation" aria-label="예측 검증 현황">
    <h2>예측 검증</h2>
    <p role="status">{labels[state.phase]}</p>
    {state.receipt && <p>서버 수신: <time dateTime={state.receipt.receivedAt}>{new Date(state.receipt.receivedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} KST</time>
      {state.receipt.timing === "after_start_received" && " · 행사 시작 이후 수신"}</p>}
    {summary ? <>
      <dl className="forecast-validation__counts">
        <div><dt>전체 보관</dt><dd>{summary.archive.archived}건</dd></div>
        <div><dt>행사 시작 전 수신</dt><dd>{summary.archive.preEvent}건</dd></div>
        <div><dt>비교 가능</dt><dd>{summary.evaluation.comparable}건</dd></div>
        <div><dt>실적 검토 필요</dt><dd>{summary.evaluation.actualIssues.length}건</dd></div>
      </dl>
      {summary.archive.corrupt > 0 && <p role="alert">보관 기록 무결성 오류 {summary.archive.corrupt}건</p>}
      {!summary.evaluation.comparable && <p><strong>정확도 판정 보류</strong></p>}
      {summary.evaluation.groups.map((group, index) => <p key={index}>
        {group.year} · {group.mode === "replay" ? "과거 재현" : "사전 예측"} · {group.modelVersion} · {group.measure} · {group.scope} · {group.count}건:
        MAE {group.mae.toFixed(1)}명 · 편향 {group.bias.toFixed(1)}명 · WAPE {group.wapePercent === null ? "계산 불가" : `${group.wapePercent.toFixed(1)}%`}
      </p>)}
      <details><summary>비교 제외 사유</summary>
        <p>일치하는 예측이 없는 실적 {summary.evaluation.unmatchedActuals}건 · 제외된 예측 {summary.evaluation.excluded}건</p>
        {summary.evaluation.actualIssues.map(issue => <p key={issue.actualId}>{issue.actualId}: {issue.reasons.map(reason => ({ INVALID_ACTUAL: "집계 기준 미확인", UNVERIFIED_ACTUAL: "실적 출처·방법 검토 필요", EVENT_NOT_FINISHED: "행사 종료 전", PENDING_ACTUAL_REVIEW: "집계 범위·추정 방식 비교 검토 중" }[reason] ?? reason)).join(", ")}</p>)}
      </details>
    </> : <p>검증 현황을 아직 확인하지 못했습니다.</p>}
    <p className="muted">보관은 예측 정확도 인증이 아닙니다. 브라우저가 제출한 예측은 모델·입력 검토 전까지 미검증으로 유지합니다.</p>
  </section>;
}
