import type { SpendingContext } from "../domain/types";
import { createUnavailableInfrastructureContext, type VenueInfrastructureContext } from "../services/infrastructureAdapter";

export function VenueObservations({ infrastructure, spending }: {
  infrastructure?: VenueInfrastructureContext;
  spending?: SpendingContext;
}) {
  const details = [...(infrastructure ?? createUnavailableInfrastructureContext()).sourceDetails,
    ...(spending?.sourceDetails.filter((detail) => detail.sourceId === "observed-tourism-consumption-index") ?? []),
  ];
  return (
    <section className="venue-observations" aria-label="주변 실데이터">
      <h2>주변 실데이터</h2>
      <div className="venue-observations__grid">
        {details.map((detail) => (
          <article className="venue-observations__dataset" key={detail.sourceId} data-source-id={detail.sourceId}>
            <h3>{detail.sourceName}</h3>
            <p className="venue-observations__status" data-observed={detail.sourceType === "public-data"}>{detail.statusLabel}</p>
            {detail.retrievedAt && <time dateTime={detail.retrievedAt}>조회 {new Date(detail.retrievedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} KST</time>}
            {detail.calculationInputs?.map((field) => <p key={field.label}>{field.label}: {field.value}</p>)}
            {!!detail.records?.length && (
              <details>
                <summary>목록 {detail.records.length}건</summary>
                <ul className="venue-observations__records">
                  {detail.records.map((record, index) => (
                    <li key={`${record.label}-${index}`}>
                      <strong>{record.label}</strong>
                      <dl>{record.fields.map((field) => <div key={field.label}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <p className="venue-observations__note">{detail.note}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
