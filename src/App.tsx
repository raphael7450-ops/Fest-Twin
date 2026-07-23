import { useEffect, useMemo, useState } from "react";
import { DataBasisPanel } from "./components/DataBasisPanel";
import { FestivalCandidatePanel } from "./components/FestivalCandidatePanel";
import { ForecastChart } from "./components/ForecastChart";
import { GovernmentHeader } from "./components/GovernmentHeader";
import { Heatmap } from "./components/Heatmap";
import { MetricEvidenceDrawer } from "./components/MetricEvidenceDrawer";
import { PlanForm } from "./components/PlanForm";
import { ReportView } from "./components/ReportView";
import { RiskPanel } from "./components/RiskPanel";
import { SafetyLogisticsPanel } from "./components/SafetyLogisticsPanel";
import { ScenarioLibrary } from "./components/ScenarioLibrary";
import { ScenarioControls } from "./components/ScenarioControls";
import { SummaryKpiCards } from "./components/SummaryKpiCards";
import { VenueMapPanel } from "./components/VenueMapPanel";
import { sampleFestivalPlan } from "./data/sampleFestivalPlan";
import { sampleSpendingContext } from "./data/sampleSpending";
import { sampleTourismContext } from "./data/sampleTourApi";
import { sampleTrafficContext } from "./data/sampleTraffic";
import { sampleTrendContext } from "./data/sampleTrends";
import type { MetricEvidenceId } from "./domain/types";
import { createForecast } from "./services/forecast";
import { createMetricEvidenceSet } from "./services/metricEvidence";
import { createPlanningReport } from "./services/report";
import { createSimulation } from "./services/simulation";
import { getTrafficContext } from "./services/trafficAdapter";
import {
  createFallbackTourismContext,
  getFestivalCandidates,
  getTourApiAreaCodes,
  getTourismContext,
  type FestivalCandidate,
  type TourApiAreaCode,
} from "./services/tourApiAdapter";

export function App() {
  const [plan, setPlan] = useState(sampleFestivalPlan);
  const [selectedHour, setSelectedHour] = useState(20);
  const [areaCodes, setAreaCodes] = useState<TourApiAreaCode[]>([]);
  const [isAreaLoading, setIsAreaLoading] = useState(true);
  const [isCandidatePanelOpen, setIsCandidatePanelOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<FestivalCandidate | null>(null);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<MetricEvidenceId | null>(null);
  const candidatePlanKey = JSON.stringify({
    region: plan.region,
    startDate: plan.startDate,
    endDate: plan.endDate,
  });
  const [candidateState, setCandidateState] = useState<{
    planKey: string;
    candidates: FestivalCandidate[];
    isLoading: boolean;
    errorMessage?: string;
  }>(() => ({
    planKey: candidatePlanKey,
    candidates: [],
    isLoading: true,
  }));
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
  const trafficPlanKey = JSON.stringify({
    region: plan.region,
    venueAddress: plan.venueAddress,
    name: plan.name,
    startDate: plan.startDate,
    selectedHour,
  });
  const [trafficState, setTrafficState] = useState(() => ({
    planKey: trafficPlanKey,
    context: sampleTrafficContext,
  }));
  const traffic =
    trafficState.planKey === trafficPlanKey ? trafficState.context : sampleTrafficContext;

  const candidates =
    candidateState.planKey === candidatePlanKey ? candidateState.candidates : [];
  const isCandidateLoading =
    candidateState.planKey !== candidatePlanKey || candidateState.isLoading;

  useEffect(() => {
    const controller = new AbortController();

    getTourApiAreaCodes({ signal: controller.signal })
      .then((nextAreaCodes) => {
        if (!controller.signal.aborted) {
          setAreaCodes(nextAreaCodes);
          setIsAreaLoading(false);
        }
      })
      .catch((error: unknown) => {
        if (
          !controller.signal.aborted &&
          !(typeof error === "object" && error !== null && "name" in error && error.name === "AbortError")
        ) {
          setIsAreaLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const planSnapshot = plan;
    const timeoutId = window.setTimeout(() => {
      setCandidateState((current) => ({
        planKey: candidatePlanKey,
        candidates: current.planKey === candidatePlanKey ? current.candidates : [],
        isLoading: true,
      }));

      getFestivalCandidates(planSnapshot, { signal: controller.signal })
        .then((nextCandidates) => {
          if (!controller.signal.aborted) {
            setCandidateState({
              planKey: candidatePlanKey,
              candidates: nextCandidates,
              isLoading: false,
            });
          }
        })
        .catch((error: unknown) => {
          if (
            !controller.signal.aborted &&
            !(typeof error === "object" && error !== null && "name" in error && error.name === "AbortError")
          ) {
            setCandidateState({
              planKey: candidatePlanKey,
              candidates: [],
              isLoading: false,
              errorMessage: "TourAPI 후보 조회에 실패해 신규 기획안 입력을 유지합니다.",
            });
          }
        });
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [candidatePlanKey]);

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

  useEffect(() => {
    const controller = new AbortController();
    const planSnapshot = plan;
    const timeoutId = window.setTimeout(() => {
      getTrafficContext(planSnapshot, {
        signal: controller.signal,
        hour: selectedHour,
      })
        .then((nextTraffic) => {
          if (!controller.signal.aborted) {
            setTrafficState({ planKey: trafficPlanKey, context: nextTraffic });
          }
        })
        .catch((error: unknown) => {
          if (
            !controller.signal.aborted &&
            !(typeof error === "object" && error !== null && "name" in error && error.name === "AbortError")
          ) {
            console.error("Traffic context loading failed", error);
          }
        });
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [trafficPlanKey]);

  const forecast = useMemo(
    () => createForecast(plan, tourism, sampleTrendContext),
    [plan, tourism],
  );
  const simulation = useMemo(
    () => createSimulation(plan, forecast, selectedHour),
    [forecast, plan, selectedHour],
  );
  const metricEvidence = useMemo(
    () => createMetricEvidenceSet(
      plan,
      forecast,
      simulation,
      tourism,
      sampleTrendContext,
      traffic,
      sampleSpendingContext,
    ),
    [forecast, plan, simulation, tourism, traffic],
  );
  const report = useMemo(
    () => createPlanningReport(plan, forecast, simulation),
    [forecast, plan, simulation],
  );
  const handleSelectCandidate = (candidate: FestivalCandidate) => {
    setSelectedCandidate(candidate);
    setPlan((currentPlan) => ({
      ...currentPlan,
      name: candidate.title,
      venueAddress: candidate.address,
      startDate: candidate.startDate || currentPlan.startDate,
      endDate: candidate.endDate || currentPlan.endDate,
      keywords: Array.from(new Set([candidate.title, ...currentPlan.keywords])).slice(0, 6),
    }));
    setIsCandidatePanelOpen(false);
  };

  return (
    <main className="app-shell">
      <GovernmentHeader />
      <SummaryKpiCards
        plan={plan}
        forecast={forecast}
        simulation={simulation}
        tourism={tourism}
        onOpenEvidence={setSelectedEvidenceId}
      />
      <div className="workspace-grid">
        <aside className="left-column">
          <PlanForm
            plan={plan}
            onPlanChange={(nextPlan) => {
              setPlan(nextPlan);
              if (
                nextPlan.region !== plan.region ||
                nextPlan.startDate !== plan.startDate ||
                nextPlan.endDate !== plan.endDate
              ) {
                setSelectedCandidate(null);
              }
            }}
            areaCodes={areaCodes}
            isAreaLoading={isAreaLoading}
            isCandidateLoading={isCandidateLoading}
            candidateCount={candidates.length}
            selectedCandidateTitle={selectedCandidate?.title}
            onOpenCandidates={() => setIsCandidatePanelOpen(true)}
          />
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
          <VenueMapPanel plan={plan} selectedCandidate={selectedCandidate} />
          <Heatmap plan={plan} simulation={simulation} />
          <SafetyLogisticsPanel
            plan={plan}
            forecast={forecast}
            simulation={simulation}
            traffic={traffic}
            onOpenEvidence={setSelectedEvidenceId}
          />
        </section>
        <aside className="right-column">
          <RiskPanel report={report} />
        </aside>
      </div>
      <FestivalCandidatePanel
        isOpen={isCandidatePanelOpen}
        candidates={candidates}
        isLoading={isCandidateLoading}
        errorMessage={candidateState.errorMessage}
        selectedCandidateId={selectedCandidate?.id}
        onClose={() => setIsCandidatePanelOpen(false)}
        onSelectCandidate={handleSelectCandidate}
      />
      <MetricEvidenceDrawer
        evidence={selectedEvidenceId ? metricEvidence[selectedEvidenceId] : undefined}
        isOpen={selectedEvidenceId !== null}
        onClose={() => setSelectedEvidenceId(null)}
      />
      <ReportView
        report={report}
        plan={plan}
        forecast={forecast}
        spending={sampleSpendingContext}
        evidenceSet={metricEvidence}
        onOpenEvidence={setSelectedEvidenceId}
      />
    </main>
  );
}
