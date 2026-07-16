import type { ForecastResult } from "../domain/types";

interface ForecastChartProps {
  forecast: ForecastResult;
}

export function ForecastChart({ forecast }: ForecastChartProps) {
  const maxVisitors = Math.max(
    ...forecast.visitorsByHour.map((item) => item.visitors),
  );

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>시간대별 수요 예측</h2>
        <span>예측 신뢰도 {forecast.confidence}</span>
      </div>
      <div className="bar-chart">
        {forecast.visitorsByHour.map((item) => (
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
    </section>
  );
}
