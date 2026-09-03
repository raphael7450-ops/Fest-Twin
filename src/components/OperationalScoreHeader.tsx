import type {
  FestivalPlan,
  ForecastResult,
  MetricEvidence,
  MetricEvidenceId,
  PlanningReport,
  SelectedFestivalBasis,
} from "../domain/types";
import type { SuccessPotentialMetric } from "../services/impactMetrics";

interface OperationalScoreHeaderProps {
  plan: FestivalPlan;
  forecast: ForecastResult;
  report: PlanningReport;
  evidenceSet: Record<MetricEvidenceId, MetricEvidence>;
  selectedFestivalBasis?: SelectedFestivalBasis | null;
  successPotential: SuccessPotentialMetric;
}

function formatNumber(value: number) {
  return value.toLocaleString("ko-KR");
}

function getScoreTone(score: number) {
  if (score >= 85) return "ready";
  if (score >= 70) return "caution";
  return "risk";
}

function getActionStatus(count: number) {
  if (count === 0) return "모니터링";
  if (count <= 2) return "조치 필요";
  return "집중 관리";
}

export function OperationalScoreHeader({
  plan,
  forecast,
  report,
  evidenceSet,
  selectedFestivalBasis,
  successPotential,
}: OperationalScoreHeaderProps) {
  const peakVisitors =
    forecast.visitorsByHour.find((item) => item.hour === forecast.peakHour)?.visitors ??
    Math.max(...forecast.visitorsByHour.map((item) => item.visitors));
  const actionCount = report.recommendations.length;
  const evidenceCount = Object.keys(evidenceSet).length;
  const scoreTone = getScoreTone(successPotential.score);
  const actionStatus = getActionStatus(actionCount);
  const festivalTitle = selectedFestivalBasis?.title ?? plan.name;
  const region = selectedFestivalBasis?.address ?? plan.venueAddress;
  const startDate = selectedFestivalBasis?.startDate ?? plan.startDate;
  const endDate = selectedFestivalBasis?.endDate ?? plan.endDate;

  return (
    <section className="operational-score-header" aria-label="B2G 운영 분석 요약">
      <div className="ops-score-card ops-score-card--hero">
        <span className="ops-card-label">흥행 가능성 점수</span>
        <strong className={`ops-score-value ops-score-value--${scoreTone}`}>
          {successPotential.score}점
        </strong>
        <small>공공 검토용 사전 진단 기준</small>
      </div>

      <div className="ops-score-card">
        <span className="ops-card-label">예상 방문</span>
        <strong data-testid="dashboard-expected-visitors">
          {formatNumber(forecast.expectedVisitors)}명
        </strong>
        <small>축제 총 누적 (경제·행정 기준)</small>
      </div>

      <div className="ops-score-card">
        <span className="ops-card-label">피크 혼잡</span>
        <strong>{formatNumber(peakVisitors)}명</strong>
        <small>{forecast.peakHour}:00 최대 동시 체류 (안전 기준)</small>
      </div>

      <div className="ops-score-card">
        <span className="ops-card-label">{actionStatus}</span>
        <strong>{actionCount}건</strong>
        <small>근거 {evidenceCount}개 연결</small>
      </div>

      <aside className="ops-context-card" aria-label="현재 분석 대상">
        <span>{selectedFestivalBasis ? "선택 축제 기준" : "기획안 기준"}</span>
        <strong>{festivalTitle}</strong>
        <dl>
          <div>
            <dt>기간</dt>
            <dd>
              {startDate} ~ {endDate}
            </dd>
          </div>
          <div>
            <dt>위치</dt>
            <dd>{region}</dd>
          </div>
        </dl>
      </aside>
    </section>
  );
}
