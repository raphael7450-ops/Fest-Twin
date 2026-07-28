/**
 * 파일 : src/App.tsx
 * 내용 : Fest-Twin 사전 진단 대시보드 메인 컴포넌트 (상태 관리, 계산 연동, 레이아웃 조립)
 * 수정 : 2026-07-24. OpenAPI 데이터 연동, 지표 근거 드로어 및 시뮬레이션 통합
 */

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
import { loadScenarios, normalizeFestivalPlan } from "./services/scenarioStorage";
import { sampleFestivalPlan } from "./data/sampleFestivalPlan";
import { sampleSpendingContext } from "./data/sampleSpending";
import { sampleTourismContext } from "./data/sampleTourApi";
import { sampleTrafficContext } from "./data/sampleTraffic";
import { sampleTrendContext } from "./data/sampleTrends";
import type { MetricEvidenceId } from "./domain/types";
import { getDemandBackdataContext } from "./services/demandBackdataAdapter";
import {
  applyFestivalCandidateToPlan,
  createSelectedFestivalBasis,
} from "./services/festivalSelection";
import { createForecast } from "./services/forecast";
import { createMetricEvidenceSet } from "./services/metricEvidence";
import { createPlanningReport } from "./services/report";
import { createSimulation } from "./services/simulation";
import { getSpendingContext } from "./services/spendingAdapter";
import { getTrafficContext } from "./services/trafficAdapter";
import { getTrendContext } from "./services/trendAdapter";
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
  const selectedFestivalBasis = useMemo(
    () => (selectedCandidate ? createSelectedFestivalBasis(selectedCandidate) : null),
    [selectedCandidate],
  );
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
    selectedContentId: selectedFestivalBasis?.contentId,
    selectedMapX: selectedFestivalBasis?.mapX,
    selectedMapY: selectedFestivalBasis?.mapY,
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
    selectedContentId: selectedFestivalBasis?.contentId,
    selectedMapX: selectedFestivalBasis?.mapX,
    selectedMapY: selectedFestivalBasis?.mapY,
  });
  const [trafficState, setTrafficState] = useState(() => ({
    planKey: trafficPlanKey,
    context: sampleTrafficContext,
  }));
  const traffic =
    trafficState.planKey === trafficPlanKey ? trafficState.context : sampleTrafficContext;
  const spendingPlanKey = JSON.stringify({
    region: plan.region,
    venueAddress: plan.venueAddress,
    name: plan.name,
    startDate: plan.startDate,
    endDate: plan.endDate,
    selectedContentId: selectedFestivalBasis?.contentId,
  });
  const [spendingState, setSpendingState] = useState(() => ({
    planKey: spendingPlanKey,
    context: sampleSpendingContext,
  }));
  const spending =
    spendingState.planKey === spendingPlanKey ? spendingState.context : sampleSpendingContext;
  const demandBackdata = useMemo(
    () => getDemandBackdataContext(plan),
    [plan.region, plan.name, plan.startDate, plan.totalBudgetMillionKrw, plan.keywords],
  );
  const trendPlanKey = JSON.stringify({
    region: plan.region,
    name: plan.name,
    startDate: plan.startDate,
    endDate: plan.endDate,
    keywords: plan.keywords,
    selectedContentId: selectedFestivalBasis?.contentId,
  });
  const [trendState, setTrendState] = useState(() => ({
    planKey: trendPlanKey,
    context: sampleTrendContext,
  }));
  const trends =
    trendState.planKey === trendPlanKey ? trendState.context : sampleTrendContext;

  const candidates =
    candidateState.planKey === candidatePlanKey ? candidateState.candidates : [];
  const isCandidateLoading =
    candidateState.planKey !== candidatePlanKey || candidateState.isLoading;

  const [restoredNotice, setRestoredNotice] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    // B2G 공유 링크 URL 파라미터(share_token 또는 scenario_id) 자동 복원 처리
    const urlParams = new URLSearchParams(window.location.search);
    const shareToken = urlParams.get("share_token");
    const scenarioId = urlParams.get("scenario_id");

    if (shareToken) {
      fetch(`/api/scenarios/share/${shareToken}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.parameters?.plan) {
            const restoredPlan = normalizeFestivalPlan(data.parameters.plan);
            setPlan(restoredPlan);
            if (data.parameters.selectedHour !== undefined) {
              setSelectedHour(data.parameters.selectedHour);
            }
            setRestoredNotice(`[공유 시나리오] [${restoredPlan.name}] 기획안이 복원되었습니다.`);
          }
        })
        .catch(() => {});
    } else if (scenarioId) {
      // 로컬/서버 scenarioId 기반 복원 fallback
      fetch(`/api/scenarios/${scenarioId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.parameters?.plan) {
            const restoredPlan = normalizeFestivalPlan(data.parameters.plan);
            setPlan(restoredPlan);
            if (data.parameters.selectedHour !== undefined) {
              setSelectedHour(data.parameters.selectedHour);
            }
            setRestoredNotice(`[공유 시나리오] [${restoredPlan.name}] 기획안이 복원되었습니다.`);
          } else {
            // LocalStorage fallback
            const localScenarios = loadScenarios();
            const found = localScenarios.find((item) => item.id === scenarioId);
            if (found) {
              setPlan(normalizeFestivalPlan(found.plan));
              setSelectedHour(found.selectedHour ?? 20);
              setRestoredNotice(`[저장 시나리오] [${found.name}] 기획안이 복원되었습니다.`);
            }
          }
        })
        .catch(() => {
          const localScenarios = loadScenarios();
          const found = localScenarios.find((item) => item.id === scenarioId);
          if (found) {
            setPlan(normalizeFestivalPlan(found.plan));
            setSelectedHour(found.selectedHour ?? 20);
            setRestoredNotice(`[저장 시나리오] [${found.name}] 기획안이 복원되었습니다.`);
          }
        });
    }

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
      getTourismContext(planSnapshot, {
        signal: controller.signal,
        selectedCandidate,
      })
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

  useEffect(() => {
    const controller = new AbortController();
    const planSnapshot = plan;
    const timeoutId = window.setTimeout(() => {
      getSpendingContext(planSnapshot, { signal: controller.signal })
        .then((nextSpending) => {
          if (!controller.signal.aborted) {
            setSpendingState({ planKey: spendingPlanKey, context: nextSpending });
          }
        })
        .catch((error: unknown) => {
          if (
            !controller.signal.aborted &&
            !(typeof error === "object" && error !== null && "name" in error && error.name === "AbortError")
          ) {
            console.error("Spending context loading failed", error);
          }
        });
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [spendingPlanKey]);

  useEffect(() => {
    const controller = new AbortController();
    const planSnapshot = plan;
    const timeoutId = window.setTimeout(() => {
      getTrendContext(planSnapshot, { signal: controller.signal })
        .then((nextTrends) => {
          if (!controller.signal.aborted) {
            setTrendState({ planKey: trendPlanKey, context: nextTrends });
          }
        })
        .catch((error: unknown) => {
          if (
            !controller.signal.aborted &&
            !(typeof error === "object" && error !== null && "name" in error && error.name === "AbortError")
          ) {
            console.error("Trend context loading failed", error);
          }
        });
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [trendPlanKey]);

  const forecast = useMemo(
    () => createForecast(plan, tourism, trends, demandBackdata),
    [plan, tourism, trends, demandBackdata],
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
      trends,
      traffic,
      spending,
      demandBackdata,
      selectedFestivalBasis,
    ),
    [
      forecast,
      plan,
      simulation,
      tourism,
      trends,
      traffic,
      spending,
      demandBackdata,
      selectedFestivalBasis,
    ],
  );
  const report = useMemo(
    () => createPlanningReport(plan, forecast, simulation),
    [forecast, plan, simulation],
  );
  const handleSelectCandidate = (candidate: FestivalCandidate) => {
    setSelectedCandidate(candidate);
    setPlan((currentPlan) => applyFestivalCandidateToPlan(currentPlan, candidate));
    setIsCandidatePanelOpen(false);
  };

  const [layoutMode, setLayoutMode] = useState<"mainFlow" | "balanced3">("mainFlow");

  return (
    <main className="app-shell">
      <GovernmentHeader />
      {restoredNotice && (
        <div
          style={{
            margin: "12px 24px 0 24px",
            padding: "12px 16px",
            background: "#eff6ff",
            border: "1px solid #93c5fd",
            borderRadius: "8px",
            color: "#1e40af",
            fontWeight: 600,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{restoredNotice}</span>
          <button
            type="button"
            onClick={() => setRestoredNotice(null)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "1rem",
              color: "#1e40af",
            }}
          >
            ✕
          </button>
        </div>
      )}
      <SummaryKpiCards
        plan={plan}
        forecast={forecast}
        simulation={simulation}
        tourism={tourism}
        onOpenEvidence={setSelectedEvidenceId}
      />
      <div className="layout-control-bar">
        <span className="layout-control-label">대시보드 정렬 방식:</span>
        <div className="layout-toggle-group">
          <button
            type="button"
            className={`layout-toggle-btn ${layoutMode === "mainFlow" ? "active" : ""}`}
            onClick={() => setLayoutMode("mainFlow")}
          >
            2컬럼 와이드 뷰 (4열 카드 유지)
          </button>
          <button
            type="button"
            className={`layout-toggle-btn ${layoutMode === "balanced3" ? "active" : ""}`}
            onClick={() => setLayoutMode("balanced3")}
          >
            3컬럼 분할 뷰 (우측 패널 통합)
          </button>
        </div>
      </div>

      {layoutMode === "mainFlow" ? (
        <div className="workspace-grid workspace-grid--2col">
          <aside className="left-column">
            <PlanForm
              plan={plan}
              onPlanChange={(nextPlan) => {
                setPlan(nextPlan);
                if (
                  nextPlan.region !== plan.region ||
                  nextPlan.name !== plan.name ||
                  nextPlan.venueAddress !== plan.venueAddress ||
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
                setPlan(normalizeFestivalPlan(scenario.plan));
                setSelectedHour(scenario.selectedHour ?? 20);
              }}
            />
            <DataBasisPanel
              tourism={tourism}
              trends={trends}
              traffic={traffic}
              spending={spending}
              demandBackdata={demandBackdata}
              selectedFestivalBasis={selectedFestivalBasis}
            />
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
            <RiskPanel report={report} />
          </section>
        </div>
      ) : (
        <div className="workspace-grid workspace-grid--3col">
          <aside className="left-column">
            <PlanForm
              plan={plan}
              onPlanChange={(nextPlan) => {
                setPlan(nextPlan);
                if (
                  nextPlan.region !== plan.region ||
                  nextPlan.name !== plan.name ||
                  nextPlan.venueAddress !== plan.venueAddress ||
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
                setPlan(normalizeFestivalPlan(scenario.plan));
                setSelectedHour(scenario.selectedHour ?? 20);
              }}
            />
          </aside>
          <section className="main-column">
            <ForecastChart forecast={forecast} />
            <VenueMapPanel plan={plan} selectedCandidate={selectedCandidate} />
            <Heatmap plan={plan} simulation={simulation} />
          </section>
          <aside className="right-column">
            <RiskPanel report={report} />
            <SafetyLogisticsPanel
              plan={plan}
              forecast={forecast}
              simulation={simulation}
              traffic={traffic}
              onOpenEvidence={setSelectedEvidenceId}
            />
            <DataBasisPanel
              tourism={tourism}
              trends={trends}
              traffic={traffic}
              spending={spending}
              demandBackdata={demandBackdata}
              selectedFestivalBasis={selectedFestivalBasis}
            />
          </aside>
        </div>
      )}
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
        spending={spending}
        selectedFestivalBasis={selectedFestivalBasis}
        evidenceSet={metricEvidence}
        onOpenEvidence={setSelectedEvidenceId}
      />
    </main>
  );
}
