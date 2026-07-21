import { useEffect, useMemo, useState } from "react";
import { DataBasisPanel } from "./components/DataBasisPanel";
import { ForecastChart } from "./components/ForecastChart";
import { GovernmentHeader } from "./components/GovernmentHeader";
import { Heatmap } from "./components/Heatmap";
import { PlanForm } from "./components/PlanForm";
import { ReportView } from "./components/ReportView";
import { RiskPanel } from "./components/RiskPanel";
import { ScenarioLibrary } from "./components/ScenarioLibrary";
import { ScenarioControls } from "./components/ScenarioControls";
import { SummaryCards } from "./components/SummaryCards";
import { VenueMapPanel } from "./components/VenueMapPanel";
import { sampleFestivalPlan } from "./data/sampleFestivalPlan";
import { sampleTourismContext } from "./data/sampleTourApi";
import { sampleTrendContext } from "./data/sampleTrends";
import { createForecast } from "./services/forecast";
import { createPlanningReport } from "./services/report";
import { createSimulation } from "./services/simulation";
import { createFallbackTourismContext, getTourismContext } from "./services/tourApiAdapter";

export function App() {
  const [plan, setPlan] = useState(sampleFestivalPlan);
  const [selectedHour, setSelectedHour] = useState(20);
  const tourApiPlanKey = JSON.stringify({
    region: plan.region,
    venueAddress: plan.venueAddress,
    startDate: plan.startDate,
    endDate: plan.endDate,
    name: plan.name,
    keywords: plan.keywords,
  });
  const [tourismState, setTourismState] = useState(() => ({
    planKey: tourApiPlanKey,
    context: sampleTourismContext,
  }));
  const pendingTourism = useMemo(
    () =>
      createFallbackTourismContext(
        plan,
        "TourAPI 관련 기획 정보가 변경되어 최신 관광 데이터를 조회하는 동안 지역별 샘플 데이터를 사용합니다.",
      ),
    [tourApiPlanKey],
  );
  const tourism =
    tourismState.planKey === tourApiPlanKey ? tourismState.context : pendingTourism;

  useEffect(() => {
    const controller = new AbortController();
    const planSnapshot = plan;
    const timeoutId = window.setTimeout(() => {
      getTourismContext(planSnapshot, { signal: controller.signal })
        .then((nextTourism) => {
          if (!controller.signal.aborted) {
            setTourismState({ planKey: tourApiPlanKey, context: nextTourism });
          }
        })
        .catch((error: unknown) => {
          if (
            !controller.signal.aborted &&
            !(typeof error === "object" && error !== null && "name" in error && error.name === "AbortError")
          ) {
            console.error("TourAPI context loading failed", error);
          }
        });
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
    // The serialized key intentionally excludes budget, capacity, facilities, and programs.
  }, [tourApiPlanKey]);

  const forecast = useMemo(
    () => createForecast(plan, tourism, sampleTrendContext),
    [plan, tourism],
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
          <DataBasisPanel tourism={tourism} trends={sampleTrendContext} />
        </aside>
        <section className="main-column">
          <ForecastChart forecast={forecast} />
          <VenueMapPanel />
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
