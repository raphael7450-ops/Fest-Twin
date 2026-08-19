import { useState } from "react";
import type { DayType, ForecastResult } from "../domain/types";

type FlowMode = "occupancy" | "arrivals";

interface ForecastChartProps {
  forecast: ForecastResult;
}

export function ForecastChart({ forecast }: ForecastChartProps) {
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
        <h2>시간대별 수요 예측</h2>
        <span>예측 신뢰도 {forecast.confidence}</span>
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
          <span className="metric-label">일평균 예상 방문객</span>
          <strong className="metric-value">
            {currentProfile.expectedDailyVisitors.toLocaleString("ko-KR")}명
          </strong>
        </div>
        <div className="day-type-metric-item">
          <span className="metric-label">피크 시간대</span>
          <strong className="metric-value">{currentProfile.peakHour}:00</strong>
        </div>
        <div className="day-type-metric-item">
          <span className="metric-label">피크 방문객 수</span>
          <strong className="metric-value">
            {currentProfile.peakVisitors.toLocaleString("ko-KR")}명
          </strong>
        </div>
        <div className="day-type-metric-item">
          <span className="metric-label">평균 대비 비율</span>
          <strong className="metric-value">
            {Math.round(currentProfile.dayRatio * 100)}%
          </strong>
        </div>
      </div>

      <div className="bar-chart">
        {visitorsByHour.map((item) => (
          <div className="bar-row" key={item.hour}>
            <span>{item.hour}:00</span>
            <div className="bar-track" aria-hidden="true">
              <div
                className="bar-fill"
                style={{ width: `${(item.visitors / maxVisitors) * 100}%` }}
              />
            </div>
            <strong>{item.visitors.toLocaleString("ko-KR")}</strong>
          </div>
        ))}
      </div>
      <p className="forecast-method-note">
        지역축제 백데이터의 유형별 시간대 패턴과 평일/주말 보정 계수, 프로그램 시간표를 결합한 사전 시뮬레이션입니다.
      </p>
    </section>
  );
}
