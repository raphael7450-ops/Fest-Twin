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
