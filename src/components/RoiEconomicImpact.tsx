/**
 * 파일 : src/components/RoiEconomicImpact.tsx
 * 내용 : 예상 방문객 소비 창출액 및 투입 예산 대비 경제적 파급효과(ROI) 시각화 패널
 * 수정 : 2026-07-24. 관광데이터랩 BC/신한카드 객단가 추정액 연동 및 ROI 배율 시각화
 */

// 핵심 도메인 인터페이스 및 타입 정의 불러오기
import type {
  FestivalPlan, // 축제 기획안 데이터 모델
  ForecastResult, // 수요 예측 산출 결과 모델
  MetricEvidenceId, // 지표 산출 근거 식별자 타입
  SpendingContext, // 관광데이터랩 소비지출 연동 맥락
} from "../domain/types";
// 경제적 파급효과 및 ROI 지표 계산 비즈니스 함수 불러오기
import { createEconomicImpactMetrics } from "../services/impactMetrics";
// 산출 근거 보기 공통 버튼 컴포넌트 불러오기
import { EvidenceButton } from "./EvidenceButton";

// 컴포넌트에 전달되는 입력 프로퍼티(Props) 타입 정의
interface RoiEconomicImpactProps {
  plan: FestivalPlan; // 기획안 (투입 예산 포함)
  forecast: ForecastResult; // 수요 예측 인원 수
  spending?: SpendingContext; // 소비 객단가 백데이터
  onOpenEvidence: (metricId: MetricEvidenceId) => void; // 근거 보기 모달 오픈 콜백
}

// 통화 수치(원)를 억 원 단위 또는 한국 표준 원화 포맷으로 변환하는 헬퍼 함수
function formatKrw(value: number) {
  if (value >= 100_000_000) {
    return `${(value / 100_000_000).toLocaleString("ko-KR", {
      maximumFractionDigits: 1,
    })}억원`;
  }

  return `${value.toLocaleString("ko-KR")}원`;
}

// 예산 대비 경제적 파급효과(ROI) 시각화 메인 컴포넌트
export function RoiEconomicImpact({
  plan,
  forecast,
  spending,
  onOpenEvidence,
}: RoiEconomicImpactProps) {
  // 1. 투입 예산과 예상 소비액을 기반으로 ROI 배율 및 객단가 지표 계산
  const metrics = createEconomicImpactMetrics(plan, forecast, spending);

  // 2. 차트 바 비례 비율 계산을 위한 최대 기준값 산출
  const maxValue = Math.max(
    metrics.totalBudgetKrw,
    metrics.expectedLocalSpendingKrw,
    1,
  );
  // 3. 그래프 바 너비 퍼센트 산출 (0 ~ 100%)
  const budgetWidth = Math.round((metrics.totalBudgetKrw / maxValue) * 100);
  const impactWidth = Math.round(
    (metrics.expectedLocalSpendingKrw / maxValue) * 100,
  );

  return (
    <section className="roi-impact" aria-label="예산 대비 경제적 파급효과">
      <div className="roi-impact-heading">
        <div>
          <h3>예산 대비 경제적 파급효과</h3>
          <p>
            방문객 1인당 평균 소비 단가{" "}
            {metrics.averageSpendPerVisitorKrw.toLocaleString("ko-KR")}원 기준 ·{" "}
            {metrics.spendingBasisLabel}
          </p>
        </div>
        <div className="metric-inline-heading">
          <EvidenceButton onClick={() => onOpenEvidence("economic-roi")} />
          <strong>{metrics.roiMultiplier.toFixed(1)}배 창출 예상</strong>
        </div>
      </div>

      <div className="roi-bars">
        <div className="roi-bar-row">
          <span>총 투입 예산</span>
          <div className="roi-bar-track">
            <div
              className="roi-bar-fill roi-bar-fill-budget"
              style={{ width: `${budgetWidth}%` }}
            />
          </div>
          <strong>{formatKrw(metrics.totalBudgetKrw)}</strong>
        </div>

        <div className="roi-bar-row">
          <span>예상 지역 상권 소비 창출액</span>
          <div className="roi-bar-track">
            <div
              className="roi-bar-fill roi-bar-fill-impact"
              style={{ width: `${impactWidth}%` }}
            />
          </div>
          <strong>{formatKrw(metrics.expectedLocalSpendingKrw)}</strong>
        </div>
      </div>
    </section>
  );
}
