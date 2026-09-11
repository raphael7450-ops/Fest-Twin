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
      {summary.evaluation.groups.map((group, index) => <div key={index}><p>
        {group.year} · {group.mode === "replay" ? "과거 재현" : "사전 예측"} · {group.modelVersion} · {group.measure === "cumulative_entries" ? "누적 입장" : "고유 방문객"} · {group.scope === "event_total" ? "행사 전체" : "하루"} · {group.count}건:
        MAE {group.mae.toFixed(1)}명 · 편향 {group.bias.toFixed(1)}명 · WAPE {group.wapePercent === null ? "계산 불가" : `${group.wapePercent.toFixed(1)}%`}
      </p><p>독립 축제 {group.independentFestivals ?? 0}개 · {group.evaluationRole === "holdout" ? "별도 검증 표본" : "학습/구분 미확인 표본"}
        {(group.independentFestivals ?? 0) < 5 && " · 표본 부족: 일반적인 정확도로 해석할 수 없습니다."}</p></div>)}
      {(summary.evaluation.benchmarks ?? []).map((item, index) => <p key={`baseline-${index}`}>
        {item.year} · {item.mode === "replay" ? "과거 재현" : "사전 예측"} · {item.modelVersion}: 동일 실적 {item.count}건 비교 ·
        현재 모델 평균 오차 {item.candidateMae.toFixed(1)}명 / 전년도 기준 {item.baselineMae.toFixed(1)}명 ·
        {item.status === "INSUFFICIENT_EVIDENCE" ? "표본 부족" : item.status === "REVIEW_REQUIRED" ? "개선 후보: 추가 검토 필요" : "개선 확인 안 됨"}
      </p>)}
      {!(summary.evaluation.benchmarks?.length) && <p>전년도 기준값과 같은 표본으로 비교할 검증 자료가 아직 없습니다.</p>}
      <details><summary>오차 지표 읽는 법</summary>
        <p>MAE는 예측과 실적 차이의 평균 인원수입니다. WAPE는 전체 실적 대비 절대 오차율이며, 낮을수록 좋습니다. 100에서 빼서 정확도로 표시하지 않습니다.</p>
        <p>편향이 양수이면 과대 예측, 음수이면 과소 예측입니다. 과거 재현은 실제 행사 전 예측 성적과 별도로 봅니다.</p>
        <p>5개 독립 축제는 추가 검토를 위한 최소 기준일 뿐 정확도 인증 기준이 아닙니다. 모델 교체는 자동 실행하지 않습니다.</p>
      </details>
      <details><summary>비교 제외 사유</summary>
        <p>일치하는 예측이 없는 실적 {summary.evaluation.unmatchedActuals}건 · 제외된 예측 {summary.evaluation.excluded}건</p>
        {summary.evaluation.actualIssues.map(issue => <p key={issue.actualId}>{issue.actualId}: {issue.reasons.map(reason => ({ INVALID_ACTUAL: "집계 기준 미확인", UNVERIFIED_ACTUAL: "실적 출처·방법 검토 필요", EVENT_NOT_FINISHED: "행사 종료 전", PENDING_ACTUAL_REVIEW: "집계 범위·추정 방식 비교 검토 중" }[reason] ?? reason)).join(", ")}</p>)}
      </details>
    </> : <p>검증 현황을 아직 확인하지 못했습니다.</p>}
    <p className="muted">보관은 예측 정확도 인증이 아닙니다. 브라우저가 제출한 예측은 모델·입력 검토 전까지 미검증으로 유지합니다.</p>
  </section>;
}
