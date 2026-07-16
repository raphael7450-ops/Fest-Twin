interface ScenarioControlsProps {
  hours: number[];
  selectedHour: number;
  onSelectedHourChange: (hour: number) => void;
}

export function ScenarioControls({
  hours,
  selectedHour,
  onSelectedHourChange,
}: ScenarioControlsProps) {
  return (
    <section className="scenario-panel" aria-label="시뮬레이션 제어">
      <label>
        진단 시간대
        <select
          value={selectedHour}
          onChange={(event) => onSelectedHourChange(Number(event.target.value))}
        >
          {hours.map((hour) => (
            <option key={hour} value={hour}>
              {hour}:00
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
