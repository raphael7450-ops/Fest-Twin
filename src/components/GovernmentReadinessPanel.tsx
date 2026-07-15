import { evaluateGovernmentReadiness } from "../government/readiness";

const statusClass = {
  반영: "readiness-ready",
  준비: "readiness-progress",
  향후: "readiness-later",
};

export function GovernmentReadinessPanel() {
  const readiness = evaluateGovernmentReadiness();

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>정부 지침 반영 현황</h2>
        <span>B2G SaaS 도입 적합성</span>
      </div>
      <div className="guideline-grid">
        {readiness.map((item) => (
          <article className="guideline-card" key={item.standardId}>
            <div className="guideline-title-row">
              <h3>{item.title}</h3>
              <span className={`readiness ${statusClass[item.status]}`}>
                {item.status}
              </span>
            </div>
            <p>{item.evidence}</p>
            <small>{item.nextAction}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
