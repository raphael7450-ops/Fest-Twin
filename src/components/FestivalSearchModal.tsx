import { useState, useMemo, useEffect, useRef } from "react";
import { FESTIVAL_PRESETS, type FestivalPreset } from "../data/festivalPresets";
import type { FestivalPlan } from "../domain/types";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { resolveFestivalCoordinatesByKeyword } from "../services/tourApiAdapter";
import { resolveVenueCoordinatesByVWorld } from "../services/vworldAdapter";
import { lookupCityParkCandidates } from "../services/cityParkAdapter";

interface FestivalSearchModalProps {
  isOpen: boolean;
  plan?: FestivalPlan;
  onClose: () => void;
  onSelectPreset: (preset: FestivalPreset) => void;
}

interface ApiRecord {
  id: string;
  name: string;
  region: string;
  localGovernment?: string;
  type?: string;
  venue?: string;
  startDate?: string;
  endDate?: string;
  periodLabel?: string;
  budgetMillionKrw?: number;
  visitors?: number;
  sourceName?: string;
}

function dbRecordToPreset(record: ApiRecord): FestivalPreset {
  const visitors = record.visitors || 80000;
  const budget = record.budgetMillionKrw || 500;
  const venueAddr = record.venue
    ? `${record.region} ${record.localGovernment || ""} ${record.venue}`.trim()
    : `${record.region} ${record.localGovernment || ""}`.trim();
  const startDate = record.startDate || "2026-05-01";
  const endDate = record.endDate || "2026-05-05";

  const estimatedArea =
    visitors >= 800000
      ? 100000
      : visitors >= 300000
        ? 70000
        : visitors >= 100000
          ? 50000
          : visitors >= 50000
            ? 35000
            : 20000;

  const venueDisplayName = record.venue || `${record.region} 행사장`;

  return {
    id: `db_${record.id}`,
    badgeLabel: `${record.region} ${record.type || "지역축제"}`,
    name: record.name,
    tagline: `${record.localGovernment || record.region} ${record.venue || "행사장"} 축제`,
    description: `${record.region} ${record.localGovernment || ""} ${record.venue || ""}에서 개최되는 축제 (예산 ${budget.toLocaleString()}백만원, 예상 방문객 ${visitors.toLocaleString()}명)`,
    areaSqm: estimatedArea,
    totalBudgetMillionKrw: budget,
    targetVisitors: visitors,
    region: record.region,
    plan: {
      name: `${record.name} (사전진단 시뮬레이션)`,
      region: record.region,
      venueAddress: venueAddr,
      startDate,
      endDate,
      operatingHours: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
      totalBudgetMillionKrw: budget,
      promotionBudgetMillionKrw: Math.round(budget * 0.15),
      safetyBudgetMillionKrw: Math.round(budget * 0.12),
      targetGroups: ["youth", "families", "locals"],
      keywords: [record.name, record.region, record.localGovernment || "", record.type || "지역축제"].filter(Boolean),
      expectedCapacity: Math.max(1000, Math.round(visitors / 8)),
      venueAreaSquareMeters: estimatedArea,
      gridWidth: 30,
      gridHeight: 20,
      programs: [
        { id: `prog_${record.id}_01`, name: `${record.name} 개막식 & 메인 행사`, startHour: 18, endHour: 21, expectedDraw: Math.round(visitors * 0.4) },
        { id: `prog_${record.id}_02`, name: `지역 특산물 & 문화 체험 존`, startHour: 10, endHour: 18, expectedDraw: Math.round(visitors * 0.3) },
      ],
      facilities: [
        { id: `fac_${record.id}_01`, type: "entrance", name: `${venueDisplayName} 메인 진입 게이트`, x: 3, y: 10, weight: 1.8 },
        { id: `fac_${record.id}_02`, type: "stage", name: `${record.name} 특설 무대`, x: 15, y: 10, weight: 2.5 },
        { id: `fac_${record.id}_03`, type: "booth", name: `${record.name} 홍보 및 체험 부스군`, x: 10, y: 5, weight: 1.4 },
        { id: `fac_${record.id}_04`, type: "medical", name: "현장 응급 구급 센터", x: 25, y: 15, weight: 1.0 },
      ],
    },
    basis: {
      contentId: String(record.id),
      title: record.name,
      address: venueAddr,
      startDate,
      endDate,
      sourceName: record.sourceName || "문화체육관광부 전국 지역축제 DB",
      operatingTimeText: "10:00 ~ 21:00",
      operatingTimeSource: "official",
      scheduleProfileLabel: "주야간 문화형",
    },
  };
}

function formatLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isOngoingOrUpcomingFestival(preset: FestivalPreset, today: string) {
  return preset.plan.endDate >= today;
}

export function FestivalSearchModal({
  isOpen,
  plan,
  onClose,
  onSelectPreset,
}: FestivalSearchModalProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [apiPresets, setApiPresets] = useState<FestivalPreset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [resolvingPresetId, setResolvingPresetId] = useState<string | null>(null);
  const coordinateRequestRef = useRef<AbortController | null>(null);
  const today = useMemo(() => formatLocalDate(), []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;

    const controller = new AbortController();
    setIsLoading(true);

    const params = new URLSearchParams({
      limit: debouncedQuery.trim() ? "30" : "20",
      minEndDate: today,
    });
    if (plan?.region) params.set("region", plan.region);
    if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim());
    const url = `/api/regional-festivals?${params.toString()}`;

    fetch(url, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!controller.signal.aborted) {
          if (Array.isArray(data?.records)) {
            const presets = data.records
              .map(dbRecordToPreset)
              .filter((preset: FestivalPreset) => isOngoingOrUpcomingFestival(preset, today));
            setApiPresets(presets);
          }
          setIsLoading(false);
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [debouncedQuery, isOpen, today, plan?.region]);

  function getNormalizedBaseName(name: string): string {
    return name
      .replace(/\b20\d{2}년?\s*/gi, "")
      .replace(/제\s*\d+\s*회\s*/gi, "")
      .replace(/\d+\s*회\s*/gi, "")
      .replace(/\s+/g, "")
      .toLowerCase();
  }

  function isInactivePlanningFestivalPreset(preset: FestivalPreset) {
    const titleKey = getNormalizedBaseName(`${preset.name} ${preset.basis.title}`);
    const regionKey = getNormalizedBaseName(preset.region);

    return titleKey.includes("대전0시축제") && regionKey.includes("대전");
  }

  const combinedPresets = useMemo(() => {
    const q = query.trim().toLowerCase();
    const activePlanningPresets = FESTIVAL_PRESETS.filter((preset) =>
      isOngoingOrUpcomingFestival(preset, today) && !isInactivePlanningFestivalPreset(preset)
    );
    const presetMatches = q
      ? activePlanningPresets.filter((preset) => {
          const titleMatch = preset.name.toLowerCase().includes(q) || preset.basis.title.toLowerCase().includes(q);
          const regionMatch = preset.region.toLowerCase().includes(q) || preset.plan.venueAddress.toLowerCase().includes(q);
          const keywordMatch = preset.plan.keywords.some((kw) => kw.toLowerCase().includes(q));
          const descriptionMatch = preset.description.toLowerCase().includes(q);
          return titleMatch || regionMatch || keywordMatch || descriptionMatch;
        })
      : activePlanningPresets;

    const presetBaseKeys = new Set(presetMatches.map((p) => getNormalizedBaseName(p.name)));
    const nonDuplicateApi = apiPresets.filter((p) => !presetBaseKeys.has(getNormalizedBaseName(p.name)));

    return [...presetMatches, ...nonDuplicateApi];
  }, [query, apiPresets, today]);

  useBodyScrollLock(isOpen);

  useEffect(
    () => () => {
      coordinateRequestRef.current?.abort();
    },
    [],
  );

  const closeModal = () => {
    coordinateRequestRef.current?.abort();
    coordinateRequestRef.current = null;
    setResolvingPresetId(null);
    onClose();
  };

  const selectPreset = async (preset: FestivalPreset) => {
    if (preset.plan.venueCoordinates) {
      onSelectPreset(preset);
      closeModal();
      return;
    }

    const controller = new AbortController();
    coordinateRequestRef.current?.abort();
    coordinateRequestRef.current = controller;
    setResolvingPresetId(preset.id);

    try {
      const tourApiMatch = await resolveFestivalCoordinatesByKeyword(
        { title: preset.name, region: preset.region },
        { signal: controller.signal },
      ).catch(() => null);
      const match =
        tourApiMatch ??
        (await resolveVenueCoordinatesByVWorld(
          {
            title: preset.name,
            address: preset.plan.venueAddress,
            region: preset.region,
          },
          { signal: controller.signal },
        ).catch(() => null));
      if (controller.signal.aborted) return;

      let matchedParkArea: number | undefined;
      let matchedParkName: string | undefined;
      if (match?.mapX && match?.mapY) {
        const parkCandidates = await lookupCityParkCandidates(
          {
            venueName: preset.name,
            venueAddress: preset.plan.venueAddress,
            region: preset.region,
            coordinates: {
              latitude: Number(match.mapY),
              longitude: Number(match.mapX),
            },
          },
          { signal: controller.signal },
        ).catch(() => []);
        if (parkCandidates.length > 0 && parkCandidates[0].areaSquareMeters > 0) {
          matchedParkArea = parkCandidates[0].areaSquareMeters;
          matchedParkName = parkCandidates[0].name;
        }
      }

      const coordinates = match
        ? {
            longitude: Number(match.mapX),
            latitude: Number(match.mapY),
            source: tourApiMatch ? ("tourapi" as const) : ("vworld" as const),
          }
        : preset.plan.venueCoordinates;

      const venueAreaSquareMeters = matchedParkArea ?? preset.plan.venueAreaSquareMeters;
      const venueAreaProvenance = matchedParkArea
        ? {
            origin: "public-data" as const,
            sourceDataset: "전국도시공원정보표준데이터" as const,
            sourceParkName: matchedParkName,
            referenceAreaSquareMeters: matchedParkArea,
            appliedAt: new Date().toISOString(),
          }
        : preset.plan.venueAreaProvenance;

      const enrichedPreset: FestivalPreset = {
        ...preset,
        areaSqm: venueAreaSquareMeters ?? preset.areaSqm,
        plan: {
          ...preset.plan,
          venueCoordinates: coordinates,
          venueAreaSquareMeters,
          venueAreaProvenance,
        },
        basis: {
          ...preset.basis,
          mapX: match ? match.mapX : preset.basis.mapX,
          mapY: match ? match.mapY : preset.basis.mapY,
          sourceName: match
            ? `${preset.basis.sourceName} + ${tourApiMatch ? "TourAPI" : "VWorld"} 좌표`
            : preset.basis.sourceName,
        },
      };

      onSelectPreset(enrichedPreset);
      closeModal();
    } catch (error) {
      if (controller.signal.aborted) return;
      onSelectPreset(preset);
      closeModal();
    } finally {
      if (coordinateRequestRef.current === controller) {
        coordinateRequestRef.current = null;
        setResolvingPresetId(null);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="candidate-drawer-layer">
      <button
        aria-label="축제 검색 창 닫기"
        className="candidate-drawer-backdrop"
        type="button"
        onClick={closeModal}
      />
      <div
        aria-label="전체 축제 실시간 검색"
        aria-modal="true"
        className="candidate-drawer"
        role="dialog"
        style={{ width: "min(640px, 92vw)" }}
      >
        <div className="candidate-drawer-heading">
          <div>
            <p className="eyebrow">ALL FESTIVAL DATABASE (5,700+)</p>
            <h2 style={{ fontSize: "1.25rem", margin: 0 }}>전체 축제 실시간 검색</h2>
          </div>
          <button className="text-button" type="button" onClick={closeModal}>
            닫기
          </button>
        </div>

        <div style={{ padding: "0 0 16px 0" }}>
          <div style={{ position: "relative" }}>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="전국 5,700여 개 모든 축제명, 지역(논산, 화천, 제주, 안동...), 키워드 검색"
              aria-label="축제 검색어 입력"
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #94a3b8",
                fontSize: "0.95rem",
                background: "#f8fafc",
                color: "#0f172a",
              }}
              autoFocus
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
          <span style={{ fontSize: "0.78rem", color: "#64748b", alignSelf: "center" }}>추천 검색어:</span>
          {["논산 딸기", "보령 머드", "부산 불꽃", "진주 유등", "대전 0시", "화천 산천어", "수원 화성", "제주 들불", "안동 탈춤", "전주 야행", "송도 맥주"].map((kw) => (
            <button
              key={kw}
              type="button"
              className="text-button"
              style={{ fontSize: "0.76rem", padding: "3px 10px", borderRadius: "20px", minHeight: "28px" }}
              onClick={() => setQuery(kw)}
            >
              #{kw}
            </button>
          ))}
        </div>

        <div className="candidate-list" style={{ maxHeight: "calc(100vh - 230px)", overflowY: "auto" }}>
          {isLoading && combinedPresets.length === 0 ? (
            <div className="candidate-drawer-state">
              <strong>전국 축제 DB를 검색하고 있습니다...</strong>
              <span>문체부 지역축제 공공 DB 5,700여 건에서 매칭되는 축제를 조회 중입니다.</span>
            </div>
          ) : combinedPresets.length === 0 ? (
            <div className="candidate-drawer-state">
              <strong>검색 결과가 없습니다.</strong>
              <span>'{query}' 검색어와 일치하는 축제가 없습니다. 상단 주소 및 지역 입력으로 기획을 계속할 수 있습니다.</span>
            </div>
          ) : (
            combinedPresets.map((preset) => {
              const displayArea = preset.plan.venueAreaSquareMeters || preset.areaSqm;
              return (
                <article
                  key={preset.id}
                  className="candidate-card"
                  style={{
                    display: "flex",
                    gap: "14px",
                    alignItems: "flex-start",
                    padding: "14px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    marginBottom: "10px",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                      <span className="badge badge-primary" style={{ fontSize: "0.72rem" }}>
                        {preset.badgeLabel}
                      </span>
                      <span style={{ fontSize: "0.78rem", color: "#64748b" }}>{preset.region}</span>
                    </div>

                    <h3 style={{ margin: "0 0 4px 0", fontSize: "1.05rem", color: "#0f172a" }}>
                      {preset.name}
                    </h3>
                    <p style={{ margin: "0 0 6px 0", fontSize: "0.82rem", color: "#475569" }}>
                      {preset.tagline}
                    </p>
                    <div style={{ fontSize: "0.78rem", color: "#64748b", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      <span>목표 방문객: {(preset.targetVisitors / 10000).toLocaleString()}만 명</span>
                      <span>|</span>
                      <span>예산: {(preset.totalBudgetMillionKrw / 10).toLocaleString()}억 원</span>
                      <span>|</span>
                      <span>
                        면적: {displayArea > 0 ? `${displayArea.toLocaleString()}m²` : "VWorld 실측 권장"}
                      </span>
                    </div>
                  </div>

                  <button
                    className="secondary-button"
                    type="button"
                    data-testid="apply-preset-btn"
                    disabled={resolvingPresetId !== null}
                    style={{ alignSelf: "center", flexShrink: 0, whiteSpace: "nowrap" }}
                    onClick={(e) => {
                      e.preventDefault();
                      void selectPreset(preset);
                    }}
                  >
                    {resolvingPresetId === preset.id ? "위치 확인 중" : "이 축제로 기획 적용"}
                  </button>
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
