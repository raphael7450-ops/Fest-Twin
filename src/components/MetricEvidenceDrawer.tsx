/**
 * 파일 : src/components/MetricEvidenceDrawer.tsx
 * 내용 : KPI 지표 산출 근거, 데이터 출처, 산출 공식, 가정을 투명하게 공개하는 슬라이딩 드로어 컴포넌트
 * 수정 : 2026-07-24. 민감 키 비공개 정화 처리 및 공공데이터 레코드 세부 내역 공개 모달 구현
 */

// 근거 정보 타입 정의 불러오기
import type { MetricEvidence } from "../domain/types";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";

// MetricEvidenceDrawer 입력 프로퍼티(Props) 정의
interface MetricEvidenceDrawerProps {
  evidence?: MetricEvidence; // 현재 선택된 KPI 산출 근거 데이터
  isOpen: boolean; // 드로어 열림 상태 여부
  onClose: () => void; // 드로어 닫기 콜백
}

// API 키, 클라이언트 시크릿, 인증 쿠키 등 민감 키를 검출하기 위한 정규표현식 패턴
const sensitiveEvidenceKeyPattern = /\b(?:servicekey|clientsecret|authorization|cookie)\b/i;

// 레이블 또는 값에 민감 키 정보가 포함되어 있는지 진단하는 헬퍼 함수
function isSensitiveEvidenceValue(value: string, label?: string) {
  return sensitiveEvidenceKeyPattern.test(`${label ?? ""} ${value}`);
}

// 민감 정보 발견 시 화면 노출을 막기 위해 "[비공개]" 문구로 정화(Sanitize)하는 함수
function safeEvidenceText(value: string, label?: string) {
  return isSensitiveEvidenceValue(value, label) ? "[비공개]" : value;
}

// 투명한 산출 근거 슬라이딩 드로어 메인 UI 컴포넌트
export function MetricEvidenceDrawer({
  evidence,
  isOpen,
  onClose,
}: MetricEvidenceDrawerProps) {
  useBodyScrollLock(isOpen);

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

        {evidence.takeawaySummary && (
          <div
            className="evidence-takeaway-card"
            style={{
              background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
              border: "1px solid #38bdf8",
              borderRadius: "8px",
              padding: "14px 16px",
              marginBottom: "16px",
              boxShadow: "0 4px 12px rgba(56, 189, 248, 0.15)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
              <span style={{ fontSize: "0.74rem", fontWeight: 700, letterSpacing: "0.5px", color: "#38bdf8", textTransform: "uppercase" }}>
                3초 핵심 요약 (Key Takeaway)
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600, color: "#f8fafc", lineHeight: 1.5 }}>
              {safeEvidenceText(evidence.takeawaySummary)}
            </p>
          </div>
        )}

        {evidence.plainExplanation && (
          <div
            className="evidence-plain-explanation"
            style={{
              background: "#f8fafc",
              border: "1px solid #cbd5e1",
              borderLeft: "4px solid #2563eb",
              borderRadius: "4px 8px 8px 4px",
              padding: "12px 14px",
              marginBottom: "16px",
            }}
          >
            <strong style={{ display: "block", fontSize: "0.82rem", color: "#1e293b", marginBottom: "4px" }}>
              행정 보고용 직관 해설 (Plain Language)
            </strong>
            <p style={{ margin: 0, fontSize: "0.88rem", color: "#334155", lineHeight: 1.5 }}>
              {safeEvidenceText(evidence.plainExplanation)}
            </p>
          </div>
        )}

        {evidence.inputComparison && evidence.inputComparison.length > 0 && (
          <div className="evidence-section">
            <h3>투입값 vs 보정치 vs 최종 산출 (Input to Output)</h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "10px",
                marginBottom: "16px",
              }}
            >
              {evidence.inputComparison.map((comp, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "12px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  }}
                >
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", display: "block", marginBottom: "4px" }}>
                    {comp.label}
                  </span>
                  <div style={{ fontSize: "0.85rem", color: "#0f172a", marginBottom: "4px" }}>
                    {comp.planValue}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#2563eb", background: "#eff6ff", padding: "2px 6px", borderRadius: "4px", display: "inline-block", marginBottom: "4px" }}>
                    {comp.adjustedFactor}
                  </div>
                  <div style={{ fontSize: "0.84rem", fontWeight: 600, color: "#059669" }}>
                    {comp.resultValue}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="evidence-summary">{evidence.summary}</p>

        <div className="evidence-section">
          <h3>사용 데이터</h3>
          <ul>
            {evidence.dataSources.map((source) => (
              <li key={source}>{source}</li>
            ))}
          </ul>
          <div className="roadmap-badge-container">
            <span className="source-badge confirmed-source-badge">
              [데이터 출처: 한국관광공사 TourAPI 4.0, KTDB, 네이버 데이터랩, 기상청]
            </span>
          </div>
        </div>

        {evidence.sourceDetails.length > 0 ? (
          <div className="evidence-section">
            <h3>사용 데이터 상세</h3>
            <div className="evidence-table-wrapper">
              <div className="source-detail-list">
                {evidence.sourceDetails.map((source) => (
                  <article className="source-detail-card" key={source.sourceId}>
                    <div className="source-detail-heading">
                      <div>
                        <strong>{safeEvidenceText(source.sourceName)}</strong>
                        {source.endpoint ? <span>{safeEvidenceText(source.endpoint)}</span> : null}
                      </div>
                      <em className={`source-type source-type-${source.sourceType}`}>
                        {safeEvidenceText(source.statusLabel)}
                      </em>
                    </div>

                    {source.retrievedAt ? (
                      <p className="source-detail-meta">
                        조회 기준: {safeEvidenceText(source.retrievedAt)}
                      </p>
                    ) : null}

                    {source.query && source.query.length > 0 ? (
                      <dl className="source-detail-grid">
                        {source.query.map((field) => (
                          <div key={`${source.sourceId}-query-${field.label}`}>
                            <dt>{safeEvidenceText(field.label)}</dt>
                            <dd>{safeEvidenceText(field.value, field.label)}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}

                    {source.records?.map((record) => (
                      <div className="source-record" key={`${source.sourceId}-${record.label}`}>
                        <b>{safeEvidenceText(record.label)}</b>
                        <dl className="source-detail-grid">
                          {record.fields.map((field) => (
                            <div key={`${source.sourceId}-${record.label}-${field.label}`}>
                              <dt>{safeEvidenceText(field.label)}</dt>
                              <dd>{safeEvidenceText(field.value, field.label)}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    ))}

                    {source.calculationInputs && source.calculationInputs.length > 0 ? (
                      <dl className="source-detail-grid">
                        {source.calculationInputs.map((field) => (
                          <div key={`${source.sourceId}-input-${field.label}`}>
                            <dt>{safeEvidenceText(field.label)}</dt>
                            <dd>{safeEvidenceText(field.value, field.label)}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}

                    {source.note ? (
                      <p className="source-detail-note">{safeEvidenceText(source.note)}</p>
                    ) : null}
                  </article>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <div className="evidence-section">
          <h3>산출 방식</h3>
          <p>{evidence.formulaSummary}</p>
        </div>

        {evidence.calculationSteps && evidence.calculationSteps.length > 0 ? (
          <div className="evidence-section calculation-flow-section">
            <h3>단계별 연산 흐름도 (Step-by-Step Breakdown)</h3>
            <div className="calculation-step-flow">
              {evidence.calculationSteps.map((step) => (
                <div key={step.stepNumber} className="calculation-step-card">
                  <div className="step-header">
                    <span className="step-badge">Step {step.stepNumber}</span>
                    <strong className="step-title">{safeEvidenceText(step.title)}</strong>
                  </div>
                  <div className="step-formula-box">
                    <code>{safeEvidenceText(step.formula)}</code>
                  </div>
                  <div className="step-details-grid">
                    <div>
                      <small>입력/기준 데이터</small>
                      <span>{safeEvidenceText(step.inputValue)}</span>
                    </div>
                    <div>
                      <small>가중치 계수</small>
                      <span className="badge-coeff">{safeEvidenceText(step.coefficient)}</span>
                    </div>
                    <div>
                      <small>중간/최종 산출값</small>
                      <strong className="subtotal-val">{safeEvidenceText(step.subtotal)}</strong>
                    </div>
                  </div>
                  {step.note ? <p className="step-note">{safeEvidenceText(step.note)}</p> : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

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
