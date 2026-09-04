/**
 * 파일 : src/App.tsx
 * 내용 : Fest-Twin 사전 진단 대시보드 메인 컴포넌트
 * 수정 : 2026-08-03. TourAPI 후보 조회와 지역 fallback 표시 안정화
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, BriefcaseBusiness, Clock3, FileText, Home, UsersRound } from "lucide-react";
import { AnalysisStatusBanner } from "./components/AnalysisStatusBanner";
import { B2gPrintReport } from "./components/B2gPrintReport";
import { DataBasisPanel } from "./components/DataBasisPanel";
import { FestivalCandidatePanel } from "./components/FestivalCandidatePanel";
import { FestivalSearchModal } from "./components/FestivalSearchModal";
import type { FestivalPreset } from "./data/festivalPresets";
import { ForecastChart } from "./components/ForecastChart";
import { GovernmentHeader } from "./components/GovernmentHeader";
import { Heatmap } from "./components/Heatmap";
import { InfrastructureCapacityPanel } from "./components/InfrastructureCapacityPanel";
import { MetricEvidenceDrawer } from "./components/MetricEvidenceDrawer";
import { OperationalScoreHeader } from "./components/OperationalScoreHeader";
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
import type { MetricEvidenceId, SelectedFestivalBasis } from "./domain/types";
import { useFestivalAnalysis } from "./hooks/useFestivalAnalysis";
import { createAnalysisKey } from "./services/analysisSnapshot";
import {
  applyFestivalCandidateToPlan,
  createSelectedFestivalBasis,
} from "./services/festivalSelection";
import { createLogisticsMetrics } from "./services/impactMetrics";
import { selectDwellProfile } from "./services/visitorOccupancy";
import {
  getFestivalCandidates,
  getTourApiAreaCodes,
  resolveFestivalCoordinatesByKeyword,
  type FestivalCandidate,
  type TourApiAreaCode,
} from "./services/tourApiAdapter";
import { resolveVenueCoordinatesByVWorld } from "./services/vworldAdapter";

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
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [presetBasis, setPresetBasis] = useState<SelectedFestivalBasis | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<FestivalCandidate | null>(null);
  const [applyingCandidate, setApplyingCandidate] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const handleSelectPreset = (preset: FestivalPreset) => {
    setPlan(preset.plan);
    setPresetBasis(preset.basis);
    setSelectedCandidate(candidateFromSelectedBasis(preset.basis));
    if (
      preset.plan.operatingHours &&
      preset.plan.operatingHours.length > 0 &&
      !preset.plan.operatingHours.includes(selectedHour)
    ) {
      const middleOrPeak =
        preset.plan.operatingHours[Math.floor(preset.plan.operatingHours.length / 2)];
      setSelectedHour(middleOrPeak);
    }
    setIsSearchModalOpen(false);
  };
  const selectedFestivalBasis = useMemo(
    () => (selectedCandidate ? createSelectedFestivalBasis(selectedCandidate) : presetBasis),
    [selectedCandidate, presetBasis],
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
  const draftAnalysisInput = useMemo(
    () => ({
      plan,
      selectedFestivalBasis,
      selectedCandidate,
      selectedHour,
    }),
    [plan, selectedFestivalBasis, selectedCandidate, selectedHour],
  );
  const lastValidAnalysisInput = useRef(draftAnalysisInput);
  if (isValidPlanDateRange(plan.startDate, plan.endDate)) {
    lastValidAnalysisInput.current = draftAnalysisInput;
  }
  const analysisInput = isValidPlanDateRange(plan.startDate, plan.endDate)
    ? draftAnalysisInput
    : lastValidAnalysisInput.current;
  const analysis = useFestivalAnalysis(analysisInput);
  const committed = analysis.snapshot;

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

  const committedMatchesDraft =
    committed?.analysisKey === createAnalysisKey(analysisInput);
  const planningDemandBackdata = committedMatchesDraft
    ? committed?.datasets.demandBackdata.value
    : undefined;
  const logisticsMetrics = useMemo(
    () =>
      committed
        ? createLogisticsMetrics(
            committed.plan,
            committed.forecast,
            committed.simulation,
            committed.datasets.traffic.value,
          )
        : undefined,
    [committed],
  );

  const applySelectedCandidate = (candidate: FestivalCandidate) => {
    setSelectedCandidate(candidate);
    setPresetBasis(null);
    setPlan((currentPlan) => {
      const nextPlan = applyFestivalCandidateToPlan(currentPlan, candidate, {
        demandBackdata: planningDemandBackdata,
      });
      if (
        nextPlan.operatingHours &&
        nextPlan.operatingHours.length > 0 &&
        !nextPlan.operatingHours.includes(selectedHour)
      ) {
        const middleOrPeak =
          nextPlan.operatingHours[Math.floor(nextPlan.operatingHours.length / 2)];
        setSelectedHour(middleOrPeak);
      }
      return nextPlan;
    });
    setIsCandidatePanelOpen(false);
  };

  const handleSelectCandidate = (candidate: FestivalCandidate) => {
    setApplyingCandidate({ id: candidate.id, title: candidate.title });

    if (candidate.mapX && candidate.mapY) {
      applySelectedCandidate(candidate);
      setApplyingCandidate(null);
      return;
    }

    Promise.resolve()
      .then(async () => {
        const tourApiMatch = await resolveFestivalCoordinatesByKeyword({
          title: candidate.title,
          region: plan.region,
        }).catch(() => null);
        if (tourApiMatch) return { ...tourApiMatch, coordinateSource: "tourapi" as const };

        const vworldMatch = await resolveVenueCoordinatesByVWorld({
          title: candidate.title,
          address: candidate.address,
          region: plan.region,
        }).catch(() => null);
        return vworldMatch ? { ...vworldMatch, coordinateSource: "vworld" as const } : null;
      })
      .then((match) => {
        applySelectedCandidate(
          match
            ? {
                ...candidate,
                mapX: match.mapX,
                mapY: match.mapY,
                coordinateSource: match.coordinateSource,
                address:
                  candidate.address && candidate.address !== "주소 정보 미기재"
                    ? candidate.address
                    : match.address,
              }
            : candidate,
        );
      })
      .catch(() => {
        applySelectedCandidate(candidate);
      })
      .finally(() => {
        setApplyingCandidate(null);
      });
  };

  const [activeDashboardSection, setActiveDashboardSection] =
    useState<DashboardSection>("planning");
  const railItems = [
    { label: "요약", section: "overview", icon: Home },
    { label: "기획", section: "planning", icon: BriefcaseBusiness },
    { label: "예측", section: "forecast", icon: Clock3 },
    { label: "현장", section: "operations", icon: BarChart3 },
    { label: "근거", section: "evidence", icon: UsersRound },
    { label: "리포트", section: "report", icon: FileText },
  ];

  if (!committed || !logisticsMetrics) {
    return (
      <main className="app-shell">
        <div className="dashboard-canvas">
          <div className="dashboard-content">
            <GovernmentHeader />
            <AnalysisStatusBanner
              phase={analysis.phase}
              snapshot={analysis.snapshot}
              pendingFestivalTitle={analysis.pendingFestivalTitle}
              activityMessage={
                applyingCandidate
                  ? `선택한 축제 데이터를 반영 중입니다. (${applyingCandidate.title})`
                  : undefined
              }
              errorMessages={analysis.errorMessages}
            />
          </div>
        </div>
      </main>
    );
  }

  const analysisPlan = committed.plan;
  const analysisSelectedFestivalBasis = committed.selectedFestivalBasis;
  const tourism = committed.datasets.tourism.value!;
  const trends = committed.datasets.trends.value!;
  const traffic = committed.datasets.traffic.value;
  const spending = committed.datasets.spending.value;
  const demandBackdata = committed.datasets.demandBackdata.value;
  const weather = committed.datasets.weather.value;
  const forecast = committed.forecast;
  const simulation = committed.simulation;
  const safetyDecisionProfiles = committed.safety;
  const metricEvidence = committed.evidence;
  const report = committed.report;

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
            <GovernmentHeader onOpenFestivalSearch={() => setIsSearchModalOpen(true)} />
          <AnalysisStatusBanner
            phase={analysis.phase}
            snapshot={committed}
            pendingFestivalTitle={analysis.pendingFestivalTitle}
            activityMessage={
              applyingCandidate
                ? `선택한 축제 데이터를 반영 중입니다. (${applyingCandidate.title})`
                : undefined
            }
            errorMessages={analysis.errorMessages}
          />
          {!analysisSelectedFestivalBasis ? (
            <section className="festival-start-guide" role="status">
              <strong>먼저 지역과 기간을 선택해 축제를 불러오세요.</strong>
              <span>후보를 선택하면 요약 대시보드와 예측, 현장 진단이 선택 축제 기준으로 갱신됩니다.</span>
            </section>
          ) : null}
          <OperationalScoreHeader
            plan={analysisPlan}
            forecast={forecast}
            report={report}
            evidenceSet={metricEvidence}
            selectedFestivalBasis={analysisSelectedFestivalBasis}
            successPotential={committed.metrics.summary.successPotential}
          />
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
            selectedFestivalBasis={analysisSelectedFestivalBasis}
            onClearSelection={() => setSelectedCandidate(null)}
          />
          <SummaryKpiCards
            metrics={committed.metrics.summary}
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
                    <ForecastChart
                      forecast={forecast}
                      selectedHour={committed.selectedHour}
                      onSelectHour={setSelectedHour}
                      capacityLimit={analysisPlan.expectedCapacity}
                      onOpenEvidence={setSelectedEvidenceId}
                    />
                    <Heatmap
                      plan={analysisPlan}
                      simulation={simulation}
                      onSelectHour={setSelectedHour}
                      onOpenEvidence={setSelectedEvidenceId}
                    />
                    <VenueMapPanel
                      key={`overview-map-${analysisPlan.name}-${analysisPlan.venueCoordinates?.latitude}-${analysisPlan.venueCoordinates?.longitude}`}
                      plan={analysisPlan}
                      onPlanChange={setPlan}
                    />
                  </div>
                  <aside className="right-column">
                    <SafetyLogisticsPanel
                      metrics={safetyDecisionProfiles.summary}
                      logistics={logisticsMetrics}
                      hour={simulation.hour}
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
                          setPresetBasis(null);
                        }
                      }}
                      areaCodes={areaCodes}
                      isAreaLoading={isAreaLoading}
                      isCandidateLoading={isCandidateLoading}
                      candidateCount={candidates.length}
                      selectedCandidateTitle={selectedCandidate?.title ?? presetBasis?.title}
                      onOpenCandidates={() => setIsCandidatePanelOpen(true)}
                      onOpenOverview={() => setActiveDashboardSection("overview")}
                      dwellProfile={committed.forecast.dwellProfile ?? selectDwellProfile(plan, planningDemandBackdata)}
                    />
                  </aside>
                  <section className="main-column">
                    <VenueMapPanel
                      key={`planning-map-${plan.name}-${plan.venueCoordinates?.latitude}-${plan.venueCoordinates?.longitude}`}
                      plan={plan}
                      onPlanChange={setPlan}
                    />
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
                      hours={analysisPlan.operatingHours}
                      selectedHour={committed.selectedHour}
                      onSelectedHourChange={setSelectedHour}
                    />
                    <ForecastChart
                      forecast={forecast}
                      selectedHour={committed.selectedHour}
                      onSelectHour={setSelectedHour}
                      capacityLimit={analysisPlan.expectedCapacity}
                      onOpenEvidence={setSelectedEvidenceId}
                    />
                    <Heatmap
                      plan={analysisPlan}
                      simulation={simulation}
                      onSelectHour={setSelectedHour}
                      onOpenEvidence={setSelectedEvidenceId}
                    />
                    <InfrastructureCapacityPanel plan={analysisPlan} forecast={forecast} onOpenEvidence={setSelectedEvidenceId} />
                  </div>
                </div>
              </section>
            )}

            {activeDashboardSection === "operations" && (
              <section className="dashboard-section-panel active">
                <div className="workspace-grid workspace-grid--dashboard">
                  <div className="main-column">
                    <SafetyLogisticsPanel
                      metrics={safetyDecisionProfiles.summary}
                      logistics={logisticsMetrics}
                      hour={simulation.hour}
                      onOpenEvidence={setSelectedEvidenceId}
                    />
                    <SafetyGuardAllocationPanel
                      profiles={safetyDecisionProfiles}
                      dayTypeCounts={forecast.dayTypeCounts}
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
                  selectedFestivalBasis={analysisSelectedFestivalBasis}
                />
              </section>
            )}

            {activeDashboardSection === "report" && (
              <section className="dashboard-section-panel active">
                <ReportView
                  snapshot={committed}
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
        applyingCandidateId={applyingCandidate?.id}
        onClose={() => setIsCandidatePanelOpen(false)}
        onSelectCandidate={handleSelectCandidate}
      />
      <FestivalSearchModal
        isOpen={isSearchModalOpen}
        plan={analysisPlan}
        onClose={() => setIsSearchModalOpen(false)}
        onSelectPreset={handleSelectPreset}
      />
      <MetricEvidenceDrawer
        evidence={selectedEvidenceId ? metricEvidence[selectedEvidenceId] : undefined}
        isOpen={selectedEvidenceId !== null}
        onClose={() => setSelectedEvidenceId(null)}
      />
    </main>
    <B2gPrintReport
      snapshot={committed}
    />
  </>
  );
}
