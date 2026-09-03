import { useState } from "react";
import type { DayType, ForecastResult, MetricEvidenceId } from "../domain/types";
import { EvidenceButton } from "./EvidenceButton";

type FlowMode = "occupancy" | "arrivals";

interface ForecastChartProps {
  forecast: ForecastResult;
  selectedHour?: number;
  onSelectHour?: (hour: number) => void;
  capacityLimit?: number;
  onOpenEvidence?: (metricId: MetricEvidenceId) => void;
}

export function ForecastChart({
  forecast,
  selectedHour,
  onSelectHour,
  capacityLimit,
  onOpenEvidence,
}: ForecastChartProps) {
  const [selectedDayType, setSelectedDayType] = useState<DayType>("summary");
  const [flowMode, setFlowMode] = useState<FlowMode>("occupancy");

  const profiles = forecast.dayTypeProfiles;
  const currentProfile = profiles?.[selectedDayType] ?? {
    dayType: "summary" as const,
    label: "전체 평균",
    expectedDailyVisitors: forecast.expectedVisitors,
    peakHour: forecast.peakHour,
    peakVisitors: Math.max(...forecast.visitorsByHour.map((i) => i.visitors)),
    visitorsByHour: forecast.visitorsByHour,
    dayRatio: 1.0,
  };

  const occupancyByHour = currentProfile.occupancyByHour ?? currentProfile.visitorsByHour;
  const arrivalsByHour = currentProfile.arrivalsByHour ?? currentProfile.visitorsByHour;
  const visitorsByHour = flowMode === "occupancy" ? occupancyByHour : arrivalsByHour;
  const maxVisitors = Math.max(1, ...visitorsByHour.map((item) => item.visitors));

  const dwellProfile = currentProfile.dwellProfile ?? forecast.dwellProfile;

  const dayTypeCounts = forecast.dayTypeCounts ?? {
    totalDays: 3,
    weekdayDays: 2,
    weekendDays: 1,
  };

  return (
    <section className="panel forecast-chart-panel">
      <div className="panel-heading">
        <div className="panel-heading-title">
          <h2>시간대별 수요 및 체류 예측</h2>
          <span className="source-tag">문체부·관광공사 모델</span>
        </div>
        <div className="panel-heading-actions">
          <span className="confidence-pill">예측 신뢰도 {forecast.confidence}</span>
          {onOpenEvidence && (
            <EvidenceButton onClick={() => onOpenEvidence("demand-index")} />
          )}
        </div>
      </div>

      <div className="day-type-tab-group" role="tablist" aria-label="수요 예측 구분">
        <button
          type="button"
          role="tab"
          aria-selected={selectedDayType === "summary"}
          className={`day-type-tab ${selectedDayType === "summary" ? "active" : ""}`}
          onClick={() => setSelectedDayType("summary")}
        >
          전체 요약 ({dayTypeCounts.totalDays}일간)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={selectedDayType === "weekday"}
          className={`day-type-tab ${selectedDayType === "weekday" ? "active" : ""}`}
          onClick={() => setSelectedDayType("weekday")}
        >
          평일 평균 ({dayTypeCounts.weekdayDays}일)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={selectedDayType === "weekend"}
          className={`day-type-tab ${selectedDayType === "weekend" ? "active" : ""}`}
          onClick={() => setSelectedDayType("weekend")}
        >
          주말 피크 ({dayTypeCounts.weekendDays}일)
        </button>
      </div>

      <div className="day-type-tab-group" role="tablist" aria-label="방문객 흐름 구분" style={{ marginTop: "4px" }}>
        <button
          type="button"
          role="tab"
          aria-selected={flowMode === "occupancy"}
          className={`day-type-tab ${flowMode === "occupancy" ? "active" : ""}`}
          onClick={() => setFlowMode("occupancy")}
        >
          동시 체류
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={flowMode === "arrivals"}
          className={`day-type-tab ${flowMode === "arrivals" ? "active" : ""}`}
          onClick={() => setFlowMode("arrivals")}
        >
          신규 유입
        </button>
      </div>

      {flowMode === "arrivals" && (
        <p className="forecast-flow-mode-note">시간대 신규 유입</p>
      )}

      {dwellProfile && (
        <div className="day-type-metric-summary" style={{ marginTop: "4px" }}>
          <div className="day-type-metric-item">
            <span className="metric-label">체류 프로필</span>
            <strong className="metric-value">{dwellProfile.label}</strong>
          </div>
          <div className="day-type-metric-item">
            <span className="metric-label">{`평균 체류 ${dwellProfile.averageMinutes}분`}</span>
          </div>
        </div>
      )}

      <div className="day-type-metric-summary">
        <div className="day-type-metric-item">
          <span className="metric-label">피크 동시 체류 (안전 기준)</span>
          <strong className="metric-value">
            {currentProfile.peakVisitors.toLocaleString("ko-KR")}명
          </strong>
        </div>
        <div className="day-type-metric-item">
          <span className="metric-label">피크 시간대</span>
          <strong className="metric-value">{currentProfile.peakHour}:00</strong>
        </div>
        {selectedHour !== undefined && (
          <div className="day-type-metric-item">
            <span className="metric-label">선택 시간 체류 ({selectedHour}:00)</span>
            <strong className="metric-value" style={{ color: "#2563eb" }}>
              {(visitorsByHour.find((v) => v.hour === selectedHour)?.visitors ?? 0).toLocaleString("ko-KR")}명
            </strong>
          </div>
        )}
        <div className="day-type-metric-item">
          <span className="metric-label">일평균 총 유입 (경제 참고)</span>
          <strong className="metric-value">
            {currentProfile.expectedDailyVisitors.toLocaleString("ko-KR")}명
          </strong>
        </div>
        {typeof capacityLimit === "number" && capacityLimit > 0 && (
          <div className="day-type-metric-item">
            <span className="metric-label">수용 한계 기준</span>
            <strong className="metric-value">
              {capacityLimit.toLocaleString("ko-KR")}명
            </strong>
          </div>
        )}
      </div>

      <div className="bar-chart" role="region" aria-label="시간대별 수요 차트">
        {visitorsByHour.map((item) => {
          const isSelected = selectedHour === item.hour;
          const isOverCapacity =
            typeof capacityLimit === "number" &&
            capacityLimit > 0 &&
            item.visitors > capacityLimit;

          return (
            <div
              className={`bar-row ${isSelected ? "bar-row--selected" : ""} ${isOverCapacity ? "bar-row--warning" : ""}`}
              key={item.hour}
              role={onSelectHour ? "button" : undefined}
              tabIndex={onSelectHour ? 0 : undefined}
              onClick={() => onSelectHour?.(item.hour)}
              onKeyDown={(e) => {
                if (onSelectHour && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onSelectHour(item.hour);
                }
              }}
              aria-label={`${item.hour}시 ${item.visitors.toLocaleString("ko-KR")}명 ${isSelected ? "(선택됨)" : ""}`}
            >
              <span>{item.hour}:00</span>
              <div className="bar-track" aria-hidden="true">
                <div
                  className="bar-fill"
                  style={{ width: `${(item.visitors / maxVisitors) * 100}%` }}
                />
              </div>
              <strong>{item.visitors.toLocaleString("ko-KR")}</strong>
            </div>
          );
        })}
      </div>
      <p className="forecast-method-note">
        지역축제 백데이터의 유형별 시간대 패턴과 평일/주말 보정 계수, 프로그램 시간표를 결합한 사전 시뮬레이션입니다. 시간대를 클릭하면 우측 혼잡도 지도와 연동됩니다.
      </p>
    </section>
  );
}

