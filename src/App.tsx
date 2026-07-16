import { useMemo, useState } from "react";
import { DataBasisPanel } from "./components/DataBasisPanel";
import { ForecastChart } from "./components/ForecastChart";
import { GovernmentHeader } from "./components/GovernmentHeader";
import { GovernmentReadinessPanel } from "./components/GovernmentReadinessPanel";
import { Heatmap } from "./components/Heatmap";
import { PlanForm } from "./components/PlanForm";
import { ReportView } from "./components/ReportView";
import { RiskPanel } from "./components/RiskPanel";
import { ScenarioLibrary } from "./components/ScenarioLibrary";
import { ScenarioControls } from "./components/ScenarioControls";
import { SummaryCards } from "./components/SummaryCards";
import { sampleFestivalPlan } from "./data/sampleFestivalPlan";
import { sampleTourismContext } from "./data/sampleTourApi";
import { sampleTrendContext } from "./data/sampleTrends";
import { createForecast } from "./services/forecast";
import { createPlanningReport } from "./services/report";
import { createSimulation } from "./services/simulation";

export function App() {
  const [plan, setPlan] = useState(sampleFestivalPlan);
  const [selectedHour, setSelectedHour] = useState(20);

  const forecast = useMemo(
    () => createForecast(plan, sampleTourismContext, sampleTrendContext),
    [plan],
  );
  const simulation = useMemo(
    () => createSimulation(plan, forecast, selectedHour),
    [forecast, plan, selectedHour],
  );
  const report = useMemo(
    () => createPlanningReport(plan, forecast, simulation),
    [forecast, plan, simulation],
  );

  return (
    <main className="app-shell">
      <GovernmentHeader />
      <GovernmentReadinessPanel />
      <SummaryCards forecast={forecast} simulation={simulation} report={report} />
      <div className="workspace-grid">
        <aside className="left-column">
          <PlanForm plan={plan} onPlanChange={setPlan} />
          <ScenarioControls
            hours={plan.operatingHours}
            selectedHour={selectedHour}
            onSelectedHourChange={setSelectedHour}
          />
          <ScenarioLibrary
            plan={plan}
            selectedHour={selectedHour}
            onLoadScenario={(scenario) => {
              setPlan(scenario.plan);
              setSelectedHour(scenario.selectedHour);
            }}
          />
          <DataBasisPanel tourism={sampleTourismContext} trends={sampleTrendContext} />
        </aside>
        <section className="main-column">
          <ForecastChart forecast={forecast} />
          <Heatmap plan={plan} simulation={simulation} />
        </section>
        <aside className="right-column">
          <RiskPanel report={report} />
        </aside>
      </div>
      <ReportView report={report} />
    </main>
  );
}
