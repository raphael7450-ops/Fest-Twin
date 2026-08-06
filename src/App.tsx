/**
 * 파일 : src/App.tsx
 * 내용 : Fest-Twin 사전 진단 대시보드 메인 컴포넌트
 * 수정 : 2026-08-03. TourAPI 후보 조회와 지역 fallback 표시 안정화
 */

import { useEffect, useMemo, useState } from "react";
import { BarChart3, BriefcaseBusiness, Clock3, FileText, Home, UsersRound } from "lucide-react";
import { B2gPrintReport } from "./components/B2gPrintReport";
import { DataBasisPanel } from "./components/DataBasisPanel";
import { FestivalCandidatePanel } from "./components/FestivalCandidatePanel";
import { ForecastChart } from "./components/ForecastChart";
import { GovernmentHeader } from "./components/GovernmentHeader";
import { Heatmap } from "./components/Heatmap";
import { InfrastructureCapacityPanel } from "./components/InfrastructureCapacityPanel";
import { MetricEvidenceDrawer } from "./components/MetricEvidenceDrawer";
import { PlanForm } from "./components/PlanForm";
import { ReportView } from "./components/ReportView";
import { RiskPanel } from "./components/RiskPanel";
import { SafetyGuardAllocationPanel } from "./components/SafetyGuardAllocationPanel";
import { SafetyLogisticsPanel } from "./components/SafetyLogisticsPanel";
import { ScenarioLibrary } from "./components/ScenarioLibrary";
import { ScenarioControls } from "./components/ScenarioControls";
import { SelectedFestivalCard } from "./components/SelectedFestivalCard";
import { SummaryKpiCards } from "./components/SummaryKpiCards";
import { VenueMapPanel } from "./components/VenueMapPanel";
import { loadScenarios, normalizeFestivalPlan } from "./services/scenarioStorage";
import { sampleFestivalPlan } from "./data/sampleFestivalPlan";
import { sampleSpendingContext } from "./data/sampleSpending";
import { sampleTourismContext } from "./data/sampleTourApi";
import { sampleTrafficContext } from "./data/sampleTraffic";
import { sampleTrendContext } from "./data/sampleTrends";
import type { MetricEvidenceId, SelectedFestivalBasis } from "./domain/types";
import {
  getDemandBackdataContext,
  getDemandBackdataContextFromApi,
} from "./services/demandBackdataAdapter";
import {
  applyFestivalCandidateToPlan,
  createSelectedFestivalBasis,
} from "./services/festivalSelection";
import { createForecast } from "./services/forecast";
import { getFallbackWeatherContext } from "./services/weatherAdapter";
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

type DashboardSection = "overview" | "planning" | "forecast" | "operations" | "evidence" | "report";

const DEFAULT_AREA_CODES: TourApiAreaCode[] = [
  { code: "1", name: "서울" },
  { code: "2", name: "인천" },
  { code: "3", name: "대전" },
  { code: "4", name: "대구" },
  { code: "5", name: "광주" },
  { code: "6", name: "부산" },
  { code: "7", name: "울산" },
  { code: "8", name: "세종특별자치시" },
  { code: "31", name: "경기도" },
  { code: "32", name: "강원특별자치도" },
  { code: "33", name: "충청북도" },
  { code: "34", name: "충청남도" },
  { code: "35", name: "경상북도" },
  { code: "36", name: "경상남도" },
  { code: "37", name: "전북특별자치도" },
  { code: "38", name: "전라남도" },
  { code: "39", name: "제주특별자치도" },
];

function candidateFromSelectedBasis(
  selectedFestivalBasis?: SelectedFestivalBasis | null,
): FestivalCandidate | null {
  if (!selectedFestivalBasis) return null;

  return {
    id: selectedFestivalBasis.contentId,
    title: selectedFestivalBasis.title,
    address: selectedFestivalBasis.address,
    startDate: selectedFestivalBasis.startDate,
    endDate: selectedFestivalBasis.endDate,
    mapX: selectedFestivalBasis.mapX,
    mapY: selectedFestivalBasis.mapY,
    searchScope: "exact-period",
  };
}

function isValidPlanDateRange(startDate: string, endDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return false;
  }

  const start = Date.parse(`${startDate}T00:00:00.000Z`);
  const end = Date.parse(`${endDate}T00:00:00.000Z`);

  return Number.isFinite(start) && Number.isFinite(end) && start <= end;
}

export function App() {
  const [plan, setPlan] = useState(sampleFestivalPlan);
  const [selectedHour, setSelectedHour] = useState(20);
  const [areaCodes, setAreaCodes] = useState<TourApiAreaCode[]>(DEFAULT_AREA_CODES);
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
        "TourAPI 관련 기획 정보가 변경되어 최신 관광 데이터를 조회하는 동안 지역계획 샘플 데이터를 사용합니다.",
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
    endDate: plan.endDate,
    selectedHour,
    selectedContentId: selectedFestivalBasis?.contentId,
    selectedTitle: selectedFestivalBasis?.title,
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
    name: plan.name,
    startDate: plan.startDate,
    endDate: plan.endDate,
    selectedContentId: selectedFestivalBasis?.contentId,
    selectedTitle: selectedFestivalBasis?.title,
  });
  const [spendingState, setSpendingState] = useState(() => ({
    planKey: spendingPlanKey,
    context: sampleSpendingContext,
  }));
  const spending =
    spendingState.planKey === spendingPlanKey ? spendingState.context : sampleSpendingContext;
  const demandBackdataPlanKey = JSON.stringify({
    region: plan.region,
    name: plan.name,
    startDate: plan.startDate,
    endDate: plan.endDate,
    totalBudgetMillionKrw: plan.totalBudgetMillionKrw,
    keywords: plan.keywords,
    selectedContentId: selectedFestivalBasis?.contentId,
    selectedTitle: selectedFestivalBasis?.title,
  });
  const pendingDemandBackdata = useMemo(
    () => getDemandBackdataContext(plan),
    [demandBackdataPlanKey],
  );
  const [demandBackdataState, setDemandBackdataState] = useState(() => ({
    planKey: demandBackdataPlanKey,
    context: getDemandBackdataContext(plan),
  }));
  const demandBackdata =
    demandBackdataState.planKey === demandBackdataPlanKey
      ? demandBackdataState.context
      : pendingDemandBackdata;
  const trendPlanKey = JSON.stringify({
    region: plan.region,
    name: plan.name,
    startDate: plan.startDate,
    endDate: plan.endDate,
    keywords: plan.keywords,
    selectedContentId: selectedFestivalBasis?.contentId,
    selectedTitle: selectedFestivalBasis?.title,
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
            setSelectedCandidate(candidateFromSelectedBasis(data.parameters.selectedFestivalBasis));
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
            setSelectedCandidate(candidateFromSelectedBasis(data.parameters.selectedFestivalBasis));
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
              setSelectedCandidate(candidateFromSelectedBasis(found.selectedFestivalBasis));
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
            setSelectedCandidate(candidateFromSelectedBasis(found.selectedFestivalBasis));
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
      if (!isValidPlanDateRange(planSnapshot.startDate, planSnapshot.endDate)) {
        setCandidateState({
          planKey: candidatePlanKey,
          candidates: [],
          isLoading: false,
        });
        return;
      }

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
      if (!isValidPlanDateRange(planSnapshot.startDate, planSnapshot.endDate)) {
        return;
      }

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
      if (!isValidPlanDateRange(planSnapshot.startDate, planSnapshot.endDate)) {
        return;
      }

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
      if (!isValidPlanDateRange(planSnapshot.startDate, planSnapshot.endDate)) {
        return;
      }

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
      if (!isValidPlanDateRange(planSnapshot.startDate, planSnapshot.endDate)) {
        return;
      }

      getDemandBackdataContextFromApi(planSnapshot, { signal: controller.signal })
        .then((nextDemandBackdata) => {
          if (!controller.signal.aborted) {
            setDemandBackdataState({ planKey: demandBackdataPlanKey, context: nextDemandBackdata });
          }
        })
        .catch((error: unknown) => {
          if (
            !controller.signal.aborted &&
            !(typeof error === "object" && error !== null && "name" in error && error.name === "AbortError")
          ) {
            console.error("Regional festival backdata loading failed", error);
          }
        });
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [demandBackdataPlanKey]);
  useEffect(() => {
    const controller = new AbortController();
    const planSnapshot = plan;
    const timeoutId = window.setTimeout(() => {
      if (!isValidPlanDateRange(planSnapshot.startDate, planSnapshot.endDate)) {
        return;
      }

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

  const weather = useMemo(() => getFallbackWeatherContext(), []);
  const forecast = useMemo(
    () => createForecast(plan, tourism, trends, demandBackdata, weather),
    [plan, tourism, trends, demandBackdata, weather],
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
      weather,
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
      weather,
    ],
  );
  const report = useMemo(
    () => createPlanningReport(plan, forecast, simulation),
    [forecast, plan, simulation],
  );
  const handleSelectCandidate = (candidate: FestivalCandidate) => {
    setSelectedCandidate(candidate);
    setPlan((currentPlan) =>
      applyFestivalCandidateToPlan(currentPlan, candidate, { demandBackdata }),
    );
    setIsCandidatePanelOpen(false);
  };

  const [activeDashboardSection, setActiveDashboardSection] =
    useState<DashboardSection>("overview");
  const railItems = [
    { label: "요약", section: "overview", icon: Home },
    { label: "기획", section: "planning", icon: BriefcaseBusiness },
    { label: "예측", section: "forecast", icon: Clock3 },
    { label: "현장", section: "operations", icon: BarChart3 },
    { label: "근거", section: "evidence", icon: UsersRound },
    { label: "리포트", section: "report", icon: FileText },
  ];

  return (
    <>
      <main className="app-shell">
      <div className="dashboard-canvas">
        <aside className="dashboard-rail" aria-label="대시보드 섹션">
          <div className="dashboard-rail__curve" aria-hidden="true" />
          <nav className="dashboard-rail__nav">
            {railItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  aria-label={`대시보드 섹션: ${item.label}`}
                  aria-pressed={activeDashboardSection === item.section}
                  className={`dashboard-rail__button${activeDashboardSection === item.section ? " dashboard-rail__button--active" : ""}`}
                  key={item.label}
                  onClick={() => setActiveDashboardSection(item.section as DashboardSection)}
                  type="button"
                >
                  <Icon size={17} strokeWidth={2.2} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>
        <div className="dashboard-content">
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
                닫기
              </button>
            </div>
          )}
          <SelectedFestivalCard
            selectedFestivalBasis={selectedFestivalBasis}
            onClearSelection={() => setSelectedCandidate(null)}
          />
          <SummaryKpiCards
            plan={plan}
            forecast={forecast}
            simulation={simulation}
            tourism={tourism}
            demandBackdata={demandBackdata}
            onOpenEvidence={setSelectedEvidenceId}
          />
          <div className="dashboard-section-tabs" aria-label="대시보드 섹션">
            {railItems.map((item) => (
              <button
                className={`dashboard-section-tab${activeDashboardSection === item.section ? " dashboard-section-tab--active" : ""}`}
                key={item.label}
                onClick={() => setActiveDashboardSection(item.section as DashboardSection)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="dashboard-section-stack">
            {activeDashboardSection === "overview" && (
              <section className="dashboard-section-panel dashboard-section-panel--overview active">
                <div className="workspace-grid workspace-grid--dashboard">
                  <div className="main-column">
                    <ForecastChart forecast={forecast} />
                    <VenueMapPanel plan={plan} selectedCandidate={selectedCandidate} />
                  </div>
                  <aside className="right-column">
                    <SafetyLogisticsPanel
                      plan={plan}
                      forecast={forecast}
                      simulation={simulation}
                      traffic={traffic}
                      onOpenEvidence={setSelectedEvidenceId}
                    />
                    <RiskPanel report={report} />
                  </aside>
                </div>
              </section>
            )}

            {activeDashboardSection === "planning" && (
              <section className="dashboard-section-panel active">
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
                  </aside>
                  <section className="main-column">
                    <VenueMapPanel plan={plan} selectedCandidate={selectedCandidate} />
                    <ScenarioLibrary
                      plan={plan}
                      selectedHour={selectedHour}
                      selectedFestivalBasis={selectedFestivalBasis}
                      onLoadScenario={(scenario) => {
                        setPlan(normalizeFestivalPlan(scenario.plan));
                        setSelectedCandidate(candidateFromSelectedBasis(scenario.selectedFestivalBasis));
                        setSelectedHour(scenario.selectedHour ?? 20);
                      }}
                    />
                  </section>
                </div>
              </section>
            )}

            {activeDashboardSection === "forecast" && (
              <section className="dashboard-section-panel active">
                <div className="workspace-grid workspace-grid--dashboard">
                  <div className="main-column">
                    <ScenarioControls
                      hours={plan.operatingHours}
                      selectedHour={selectedHour}
                      onSelectedHourChange={setSelectedHour}
                    />
                    <ForecastChart forecast={forecast} />
                    <Heatmap plan={plan} simulation={simulation} />
                    <InfrastructureCapacityPanel plan={plan} forecast={forecast} onOpenEvidence={setSelectedEvidenceId} />
                  </div>
                </div>
              </section>
            )}

            {activeDashboardSection === "operations" && (
              <section className="dashboard-section-panel active">
                <div className="workspace-grid workspace-grid--dashboard">
                  <div className="main-column">
                    <SafetyLogisticsPanel
                      plan={plan}
                      forecast={forecast}
                      simulation={simulation}
                      traffic={traffic}
                      onOpenEvidence={setSelectedEvidenceId}
                    />
                    <SafetyGuardAllocationPanel
                      plan={plan}
                      forecast={forecast}
                      simulation={simulation}
                      onOpenEvidence={setSelectedEvidenceId}
                    />
                  </div>
                  <aside className="right-column">
                    <RiskPanel report={report} />
                  </aside>
                </div>
              </section>
            )}

            {activeDashboardSection === "evidence" && (
              <section className="dashboard-section-panel active">
                <DataBasisPanel
                  tourism={tourism}
                  trends={trends}
                  traffic={traffic}
                  spending={spending}
                  demandBackdata={demandBackdata}
                  weather={weather}
                  selectedFestivalBasis={selectedFestivalBasis}
                />
              </section>
            )}

            {activeDashboardSection === "report" && (
              <section className="dashboard-section-panel active">
                <ReportView
                  report={report}
                  plan={plan}
                  forecast={forecast}
                  spending={spending}
                  selectedFestivalBasis={selectedFestivalBasis}
                  evidenceSet={metricEvidence}
                  onOpenEvidence={setSelectedEvidenceId}
                />
              </section>
            )}

          </div>
        </div>
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
    </main>
    <B2gPrintReport
      report={report}
      plan={plan}
      forecast={forecast}
      selectedFestivalBasis={selectedFestivalBasis}
      spending={spending}
      evidenceSet={metricEvidence}
    />
  </>
  );
}
