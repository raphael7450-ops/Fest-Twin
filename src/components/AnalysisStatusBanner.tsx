import type { FestivalAnalysisSnapshot } from "../services/analysisSnapshot";

export interface AnalysisStatusBannerProps {
  phase: "loading" | "refreshing" | "ready" | "error";
  snapshot?: FestivalAnalysisSnapshot;
  pendingFestivalTitle?: string;
  errorMessages: string[];
}

const datasetStatusLabels = {
  live: "?ㅼ떆媛?",
  cached: "?좏슚 ??μ옄猷?",
  supplemented: "寃利?蹂댁셿",
  unavailable: "?ъ슜 遺덇?",
} as const;

function DatasetStatusSummary({ snapshot }: { snapshot: FestivalAnalysisSnapshot }) {
  const counts = Object.values(snapshot.datasets).reduce(
    (summary, dataset) => {
      summary[dataset.status] += 1;
      return summary;
    },
    { live: 0, cached: 0, supplemented: 0, unavailable: 0 },
  );

  return (
    <ul className="analysis-status-banner__datasets" aria-label="분석 데이터 상태 요약">
      {Object.entries(datasetStatusLabels).map(([status, label]) => (
        <li data-status={status} key={status}>
          {label} {counts[status as keyof typeof counts]}
        </li>
      ))}
    </ul>
  );
}

function SnapshotIdentity({ snapshot }: { snapshot: FestivalAnalysisSnapshot }) {
  return (
    <span className="analysis-status-banner__identity">
      <time dateTime={snapshot.createdAt}>{snapshot.createdAt}</time>
      <span aria-hidden="true"> · </span>
      <span data-testid="analysis-id">{snapshot.analysisId}</span>
    </span>
  );
}

export function AnalysisStatusBanner({
  phase,
  snapshot,
  pendingFestivalTitle,
  errorMessages,
}: AnalysisStatusBannerProps) {
  let message;

  if (phase === "loading") {
    message = <p>遺꾩꽍 ?먮즺瑜?以鍮꾪븯怨??덉뒿?덈떎.</p>;
  } else if (phase === "refreshing" && snapshot) {
    message = (
      <p>
        현재 결과는 {snapshot.plan.name}의 이전 스냅샷입니다. {pendingFestivalTitle ?? "새 축제"}
        분석을 새로고침하고 있습니다. <SnapshotIdentity snapshot={snapshot} />
      </p>
    );
  } else if (phase === "ready" && snapshot) {
    message = (
      <p>
        분석 완료 · <SnapshotIdentity snapshot={snapshot} />
      </p>
    );
  } else if (phase === "error") {
    message = (
      <>
        <p>
          분석 갱신에 실패했습니다.
          {snapshot ? (
            <>
              {" "}이전 결과를 유지합니다. <SnapshotIdentity snapshot={snapshot} />
            </>
          ) : null}
        </p>
        {errorMessages.length > 0 ? (
          <ul className="analysis-status-banner__errors">
            {errorMessages.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        ) : null}
      </>
    );
  } else {
    message = <p>분석 결과를 준비하지 못했습니다.</p>;
  }

  return (
    <section
      className={`analysis-status-banner analysis-status-banner--${phase}${phase === "refreshing" ? " analysis-refresh-status" : ""}`}
      role={phase === "error" ? "alert" : "status"}
    >
      <div className="analysis-status-banner__message">{message}</div>
      {snapshot ? <DatasetStatusSummary snapshot={snapshot} /> : null}
    </section>
  );
}
