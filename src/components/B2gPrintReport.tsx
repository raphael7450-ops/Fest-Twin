import type { FestivalAnalysisSnapshot } from "../services/analysisSnapshot";

interface B2gPrintReportProps {
  snapshot?: FestivalAnalysisSnapshot;
}

function formatKrw(value: number) {
  return `${(value || 0).toLocaleString("ko-KR")}원`;
}

export function B2gPrintReport({
  snapshot,
}: B2gPrintReportProps) {
  if (!snapshot) return null;

  const { plan, forecast, report, selectedFestivalBasis, datasets, metrics } = snapshot;
  const safety = snapshot.safety.summary;
  const densityText =
    safety.peakDensity.status === "available"
      ? `${safety.peakDensity.value.toFixed(2)} 명/㎡`
      : "산출 불가";
  const evacuationText =
    safety.evacuationTime.status === "available"
      ? `${safety.evacuationTime.value.toFixed(1)}분`
      : "산출 불가";
  const expectedVisitors = forecast.expectedVisitors;
  const successPotential = metrics.summary.successPotential;
  const capacityPressure = metrics.summary.capacityPressure;
  const budgetKrw = metrics.economic.totalBudgetKrw;
  const avgSpend = metrics.economic.averageSpendPerVisitorKrw;
  const totalEconomicEffect = metrics.economic.expectedLocalSpendingKrw;
  const roi = metrics.economic.roiMultiplier.toFixed(1);
  const festivalTitle = selectedFestivalBasis?.title ?? plan.name;
  const peakVisitorCount =
    forecast.visitorsByHour.find((value) => value.hour === forecast.peakHour)?.visitors ?? 0;
  const overallRiskLevel =
    report.scores.find((score) => score.level === "critical" || score.level === "high")?.level ??
    report.scores[0]?.level ??
    "medium";
  const datasetEntries = Object.entries(datasets);

  return (
    <div
      className="b2g-print-report-wrapper"
      aria-label="B2G 행정 결재 및 감사 제출용 보고서"
      data-print-analysis-id={snapshot.analysisId}
    >
      {/* 1페이지: 행정 결재 개요, 핵심 지표 요약 및 4단계 산출 근거 */}
      <section className="b2g-print-page b2g-print-page-1">
        <header className="b2g-print-header">
          <div className="b2g-print-header__logo">
            <span className="b2g-print-logo-box">FT</span>
            <div className="b2g-print-header__org">
              <span className="b2g-org-name">행정안전부 및 지자체 감사 제출 서식</span>
              <span className="b2g-org-sub">Fest-Twin B2G SaaS Control Center</span>
            </div>
          </div>
          <div className="b2g-print-header__meta">
            <div><span className="meta-label">분석 ID:</span> {snapshot.analysisId}</div>
            <div><span className="meta-label">모델 버전:</span> {snapshot.modelVersion}</div>
            <div><span className="meta-label">생성 시각:</span> {snapshot.createdAt}</div>
            <div><span className="meta-label">검토 구분:</span> 사전 진단 및 수요 추정</div>
          </div>
        </header>

        <div className="b2g-print-doc-title">
          <h1>[Fest-Twin] 축제 사전 진단 및 수요 추정 보고서</h1>
          <p className="b2g-print-doc-sub">
            지자체 축제 예산 집행 사전 검토 | TourAPI 및 KTDB 공공데이터 기반 수요·안전·경제 파급효과 산출
          </p>
        </div>

        <div className="b2g-print-section">
          <h2 className="b2g-section-heading">1. 기본 개요 및 신청 축제 정보</h2>
          <table className="b2g-table">
            <tbody>
              <tr>
                <th>축제명</th>
                <td>{festivalTitle}</td>
                <th>개최 지역</th>
                <td>{plan.region} {plan.venueAddress}</td>
              </tr>
              <tr>
                <th>개최 기간</th>
                <td>{selectedFestivalBasis ? `${selectedFestivalBasis.startDate} ~ ${selectedFestivalBasis.endDate}` : `${plan.startDate} ~ ${plan.endDate}`}</td>
                <th>총 투입 예산</th>
                <td>{formatKrw(budgetKrw)} (안전 예산: {plan.safetyBudgetMillionKrw}백만원)</td>
              </tr>
              <tr>
                <th>축제 ID</th>
                <td>{snapshot.festivalId}</td>
                <th>분석 ID</th>
                <td>{snapshot.analysisId}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="b2g-print-section">
          <h2 className="b2g-section-heading">2. 핵심 지표 요약 (Key Executive Metrics)</h2>
          <div className="b2g-kpi-grid">
            <div className="b2g-kpi-card">
              <span className="b2g-kpi-title">총 예상 방문객</span>
              <strong className="b2g-kpi-val">{expectedVisitors.toLocaleString("ko-KR")} 명</strong>
              <span className="b2g-kpi-sub">피크 시간: {forecast.peakHour}:00 ({peakVisitorCount.toLocaleString("ko-KR")}명)</span>
            </div>
            <div className="b2g-kpi-card">
              <span className="b2g-kpi-title">피크 시간대 물리 밀도</span>
              <strong className="b2g-kpi-val">{densityText}</strong>
              <span className="b2g-kpi-sub">
                {safety.peakDensity.status === "unavailable"
                  ? safety.peakDensity.reason
                  : `수용 능력 한계비율: ${capacityPressure.displayPercent}%`}
              </span>
            </div>
            <div className="b2g-kpi-card">
              <span className="b2g-kpi-title">추정 상권 경제 파급효과</span>
              <strong className="b2g-kpi-val">{formatKrw(totalEconomicEffect)}</strong>
              <span className="b2g-kpi-sub">투입 예산 대비 ROI: {roi}배</span>
            </div>
          </div>
        </div>

        <div className="b2g-print-section">
          <h2 className="b2g-section-heading">3. 안전 위험 등급 및 종합 진단 소견</h2>
          <div className="b2g-safety-diagnosis-box">
            <div className="b2g-risk-grade-badge">
              <span>종합 안전 위험 등급</span>
              <strong className={`b2g-risk-level b2g-risk-level--${overallRiskLevel}`}>
                {overallRiskLevel === "low" ? "낮음 (양호)" : overallRiskLevel === "medium" ? "보통 (주의)" : overallRiskLevel === "high" ? "높음 (경고)" : "심각 (위험)"}
              </strong>
            </div>
            <div className="b2g-findings-area">
              <ul>
                {report.findings.map((finding, idx) => (
                  <li key={idx}>{finding}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="b2g-print-section">
          <h2 className="b2g-section-heading">4. 4단계 수치 산출 근거 상세 (Step 1 ~ 4 Breakdown)</h2>
          <div className="b2g-breakdown-grid">
            <div className="b2g-breakdown-step">
              <h3>Step 1. 수요 추정</h3>
              <p>TourAPI 4.0 및 KTDB 이동 데이터 합성 추산</p>
              <ul>
                <li>예상 방문객: {expectedVisitors.toLocaleString("ko-KR")}명</li>
                <li>흥행 가능성 점수: {successPotential.score}점</li>
                <li>예측 신뢰도: {forecast.confidence}</li>
              </ul>
            </div>
            <div className="b2g-breakdown-step">
              <h3>Step 2. 밀집도 & 안전인력</h3>
              <p>행정안전부 안전 관리 매뉴얼 수용 한계 검토</p>
              <ul>
                <li>물리 밀도: {densityText}</li>
                <li>안전 인력 권고: {safety.staffing.recommended}명</li>
                <li>대피 시간: {evacuationText}</li>
              </ul>
            </div>
            <div className="b2g-breakdown-step">
              <h3>Step 3. 상권 경제 효과</h3>
              <p>소상공인진흥공단 1인당 소비단가 모델 적용</p>
              <ul>
                <li>1인당 소비액: {avgSpend.toLocaleString("ko-KR")}원</li>
                <li>ROI 효과: {roi}배 ({formatKrw(totalEconomicEffect)})</li>
              </ul>
            </div>
            <div className="b2g-breakdown-step">
              <h3>Step 4. 수용성 & 리스크</h3>
              <p>행사장 면적 및 주차/편의시설 지수 산출</p>
              <ul>
                <li>수용 정원률: {capacityPressure.displayPercent}% ({capacityPressure.status})</li>
                <li>교통/주차 점수: {report.scores.find(s => s.label.includes("주차") || s.label.includes("교통"))?.score ?? "검토 필요"}점</li>
              </ul>
            </div>
          </div>
        </div>

        <footer className="b2g-print-footer">
          <span>Fest-Twin B2G Executive & Audit Print Report</span>
          <span>Page 1 of 2</span>
        </footer>
      </section>

      {/* 2페이지: 적용 데이터 출처 무결성 라벨, OpenAPI 증빙 및 행정 결재 서명 */}
      <section className="b2g-print-page b2g-print-page-2">
        <header className="b2g-print-header">
          <div className="b2g-print-header__logo">
            <span className="b2g-print-logo-box">FT</span>
            <span className="b2g-org-sub">Fest-Twin Audit & Compliance Sheet</span>
          </div>
          <div className="b2g-print-header__meta">
            <div><span className="meta-label">분석 ID:</span> {snapshot.analysisId}</div>
          </div>
        </header>

        <div className="b2g-print-section">
          <h2 className="b2g-section-heading">5. 적용 데이터 출처 및 무결성 라벨 (Data Provenance & Integrity)</h2>
          <table className="b2g-table">
            <thead>
              <tr>
                <th>데이터셋</th>
                <th>데이터 출처</th>
                <th>상태</th>
                <th>상태 설명</th>
              </tr>
            </thead>
            <tbody>
              {datasetEntries.map(([name, dataset]) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td>{dataset.sourceName}</td>
                  <td>
                    <span className="b2g-integrity-tag">{dataset.status}</span>
                  </td>
                  <td>{dataset.message ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="b2g-print-section">
          <h2 className="b2g-section-heading">6. OpenAPI 운영계정 및 시스템 활용 증빙</h2>
          <div className="b2g-openapi-proof-box">
            <table className="b2g-table">
              <tbody>
                <tr>
                  <th>활용 어플 URL</th>
                  <td>https://cwserver.tail97dbc3.ts.net/</td>
                  <th>서비스 유형</th>
                  <td>B2G SaaS Control Center</td>
                </tr>
                <tr>
                  <th>활용 목적</th>
                  <td colSpan={3}>축제 후보 조회, 행사장 위치 보강, 주변 관광지 기반 수요 예측 근거 산출 및 감사 제출 증빙</td>
                </tr>
                <tr>
                  <th>데이터 출처 및 동의</th>
                  <td colSpan={3}>한국관광공사 TourAPI 4.0 및 국토교통부 KTDB 공공데이터 출처 표기 동의 적용</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="b2g-sign-box">
          <h3 className="b2g-sign-title">행정 결재 및 감사 검토 서명란</h3>
          <div className="b2g-sign-grid">
            <div className="b2g-sign-cell">
              <span className="sign-role">작성자 (담당자)</span>
              <span className="sign-line">소속 / 성명: ____________________ (인)</span>
            </div>
            <div className="b2g-sign-cell">
              <span className="sign-role">검토자 (팀장)</span>
              <span className="sign-line">소속 / 성명: ____________________ (인)</span>
            </div>
            <div className="b2g-sign-cell">
              <span className="sign-role">승인자 (부서장)</span>
              <span className="sign-line">소속 / 성명: ____________________ (인)</span>
            </div>
          </div>
          <p className="b2g-sign-notice">
            본 보고서는 Fest-Twin 사전 진단 플랫폼에서 자동 산출된 B2G 행정 결재 및 감사 제출용 전용 서식입니다.
          </p>
        </div>

        <footer className="b2g-print-footer">
          <span>Fest-Twin B2G Executive & Audit Print Report</span>
          <span>Page 2 of 2</span>
        </footer>
      </section>
    </div>
  );
}
