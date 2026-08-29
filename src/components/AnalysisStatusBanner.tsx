import type { FestivalAnalysisSnapshot } from "../services/analysisSnapshot";

export interface AnalysisStatusBannerProps {
  phase: "loading" | "refreshing" | "ready" | "error";
  snapshot?: FestivalAnalysisSnapshot;
  pendingFestivalTitle?: string;
  activityMessage?: string;
  errorMessages: string[];
}

const datasetStatusLabels = {
  live: "실시간",
  cached: "유효 저장자료",
  supplemented: "검증 보완",
  unavailable: "사용 불가",
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
  activityMessage,
  errorMessages,
}: AnalysisStatusBannerProps) {
  let message;

  if (activityMessage) {
    message = (
      <p>
        <span className="analysis-status-banner__spinner" aria-hidden="true" />
        {activityMessage}
      </p>
    );
  } else if (phase === "loading") {
    message = (
      <p>
        <span className="analysis-status-banner__spinner" aria-hidden="true" />
        초기 분석 데이터를 불러오는 중입니다.
      </p>
    );
  } else if (phase === "refreshing" && snapshot) {
    const displayTitle = snapshot.selectedFestivalBasis?.title ?? snapshot.plan.name;
    message = (
      <p>
        <span className="analysis-status-banner__spinner" aria-hidden="true" />
        현재 결과는 {displayTitle}의 이전 분석입니다. {pendingFestivalTitle ?? "새 축제"} 분석을
        새로고침하고 있습니다. <SnapshotIdentity snapshot={snapshot} />
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
      className={`analysis-status-banner analysis-status-banner--${phase}${phase === "refreshing" || activityMessage ? " analysis-refresh-status" : ""}`}
      role={phase === "error" ? "alert" : "status"}
    >
      <div className="analysis-status-banner__message">{message}</div>
      {snapshot ? <DatasetStatusSummary snapshot={snapshot} /> : null}
    </section>
  );
}
