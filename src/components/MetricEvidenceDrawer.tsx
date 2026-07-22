import type { MetricEvidence } from "../domain/types";

interface MetricEvidenceDrawerProps {
  evidence?: MetricEvidence;
  isOpen: boolean;
  onClose: () => void;
}

export function MetricEvidenceDrawer({
  evidence,
  isOpen,
  onClose,
}: MetricEvidenceDrawerProps) {
  if (!isOpen || !evidence) return null;

  return (
    <aside
      className="evidence-drawer"
      role="dialog"
      aria-modal="true"
      aria-label="지표 산출 근거"
    >
      <div className="evidence-drawer-backdrop" onClick={onClose} />
      <section className="evidence-drawer-panel">
        <div className="evidence-drawer-heading">
          <div>
            <span
              className={`confidence-badge confidence-badge-${evidence.confidence}`}
            >
              신뢰도 {evidence.confidenceLabel}
            </span>
            <h2>{evidence.title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="근거 닫기">
            닫기
          </button>
        </div>

        <p className="evidence-summary">{evidence.summary}</p>

        <div className="evidence-section">
          <h3>사용 데이터</h3>
          <ul>
            {evidence.dataSources.map((source) => (
              <li key={source}>{source}</li>
            ))}
          </ul>
        </div>

        {evidence.sourceDetails.length > 0 ? (
          <div className="evidence-section">
            <h3>사용 데이터 상세</h3>
            <div className="source-detail-list">
              {evidence.sourceDetails.map((source) => (
                <article className="source-detail-card" key={source.sourceId}>
                  <div className="source-detail-heading">
                    <div>
                      <strong>{source.sourceName}</strong>
                      {source.endpoint ? <span>{source.endpoint}</span> : null}
                    </div>
                    <em className={`source-type source-type-${source.sourceType}`}>
                      {source.statusLabel}
                    </em>
                  </div>

                  {source.retrievedAt ? (
                    <p className="source-detail-meta">조회 기준: {source.retrievedAt}</p>
                  ) : null}

                  {source.query && source.query.length > 0 ? (
                    <dl className="source-detail-grid">
                      {source.query.map((field) => (
                        <div key={`${source.sourceId}-query-${field.label}`}>
                          <dt>{field.label}</dt>
                          <dd>{field.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}

                  {source.records?.slice(0, 5).map((record) => (
                    <div className="source-record" key={`${source.sourceId}-${record.label}`}>
                      <b>{record.label}</b>
                      <dl className="source-detail-grid">
                        {record.fields.map((field) => (
                          <div key={`${source.sourceId}-${record.label}-${field.label}`}>
                            <dt>{field.label}</dt>
                            <dd>{field.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))}

                  {source.calculationInputs && source.calculationInputs.length > 0 ? (
                    <dl className="source-detail-grid">
                      {source.calculationInputs.map((field) => (
                        <div key={`${source.sourceId}-input-${field.label}`}>
                          <dt>{field.label}</dt>
                          <dd>{field.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}

                  {source.note ? <p className="source-detail-note">{source.note}</p> : null}
                </article>
              ))}
            </div>
          </div>
        ) : null}

        <div className="evidence-section">
          <h3>산출 방식</h3>
          <p>{evidence.formulaSummary}</p>
        </div>

        <div className="evidence-section">
          <h3>주요 영향 요인</h3>
          <ul className="contributor-list">
            {evidence.contributors.map((item) => (
              <li
                key={`${item.label}-${item.value}`}
                className={`contributor contributor-${item.effect}`}
              >
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </li>
            ))}
          </ul>
        </div>

        <div className="evidence-section">
          <h3>가정</h3>
          <ul>
            {evidence.assumptions.map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
        </div>

        <div className="evidence-section">
          <h3>해석 시 주의사항</h3>
          <ul>
            {evidence.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </div>
      </section>
    </aside>
  );
}
