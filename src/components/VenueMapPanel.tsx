import { useEffect, useRef, useState, useCallback } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import XYZ from "ol/source/XYZ";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import Polygon from "ol/geom/Polygon";
import Style from "ol/style/Style";
import IconStyle from "ol/style/Icon";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Text from "ol/style/Text";
import Draw from "ol/interaction/Draw";
import { getArea } from "ol/sphere";
import { fromLonLat } from "ol/proj";
import "ol/ol.css";
import type { FestivalPlan } from "../domain/types";

const DEFAULT_VWORLD_KEY = "2BEE395D-834A-3F75-BC64-CAC185A7A442";
const vworldApiKey = import.meta.env.VITE_VWORLD_API_KEY?.trim() || DEFAULT_VWORLD_KEY;

type MapStatus = "missing-key" | "loading" | "ready" | "failed";

interface VenueMapPanelProps {
  plan: FestivalPlan;
  onPlanChange?: (plan: FestivalPlan) => void;
}

export function buildVWorldTileUrl(apiKey: string): string {
  return `https://api.vworld.kr/req/wmts/1.0.0/${apiKey}/Base/{z}/{y}/{x}.png`;
}

export function buildVenueOperationalNotes(plan: FestivalPlan): string[] {
  const entrances = plan.facilities.filter((item) => item.type === "entrance");
  const stages = plan.facilities.filter((item) => item.type === "stage");
  const booths = plan.facilities.filter((item) => item.type === "booth");

  return [
    `행사장 중심 구역: ${plan.name}`,
    entrances.length > 0
      ? `주요 진출입 후보: ${entrances.map((item) => item.name).join(", ")}`
      : "주요 진출입 후보: 기획안 입력 필요",
    stages.length > 0
      ? `관람 집중 후보: ${stages.map((item) => item.name).join(", ")}`
      : "관람 집중 후보: 기획안 입력 필요",
    booths.length > 0
      ? `분산 운영 후보: ${booths.map((item) => item.name).join(", ")}`
      : "분산 운영 후보: 기획안 입력 필요",
  ];
}

function buildMarkerStyle(label: string): Style {
  const arrowSvg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 42 42">
      <path d="M21 39 8 14h8V4h10v10h8L21 39Z" fill="#ef4444" stroke="#ffffff" stroke-width="3" stroke-linejoin="round"/>
      <path d="M21 34 12 17h7V7h4v10h7L21 34Z" fill="#dc2626"/>
    </svg>
  `);

  return new Style({
    image: new IconStyle({
      anchor: [0.5, 1],
      anchorXUnits: "fraction",
      anchorYUnits: "fraction",
      src: `data:image/svg+xml;charset=UTF-8,${arrowSvg}`,
    }),
    text: new Text({
      text: label,
      offsetY: -44,
      font: "700 13px system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      fill: new Fill({ color: "#111827" }),
      stroke: new Stroke({ color: "#ffffff", width: 4 }),
    }),
  });
}

const polygonStyle = new Style({
  fill: new Fill({
    color: "rgba(59, 130, 246, 0.25)",
  }),
  stroke: new Stroke({
    color: "#2563eb",
    width: 2.5,
  }),
});

export function VenueMapPanel({ plan, onPlanChange }: VenueMapPanelProps) {
  const mapStageRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const vectorSourceRef = useRef<VectorSource | null>(null);
  const drawInteractionRef = useRef<Draw | null>(null);
  const polygonFeatureRef = useRef<Feature | null>(null);

  const [status, setStatus] = useState<MapStatus>(vworldApiKey ? "loading" : "missing-key");
  const [failReason, setFailReason] = useState<string>("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [measuredArea, setMeasuredArea] = useState<number | null>(null);
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);

  const coordinates = plan.venueCoordinates;
  const notes = buildVenueOperationalNotes(plan);

  const stopDrawing = useCallback(() => {
    if (mapInstanceRef.current && drawInteractionRef.current) {
      mapInstanceRef.current.removeInteraction(drawInteractionRef.current);
      drawInteractionRef.current = null;
    }
    setIsDrawing(false);
  }, []);

  const startDrawing = useCallback(() => {
    const map = mapInstanceRef.current;
    const source = vectorSourceRef.current;
    if (!map || !source) return;

    if (drawInteractionRef.current) {
      map.removeInteraction(drawInteractionRef.current);
    }

    if (polygonFeatureRef.current) {
      source.removeFeature(polygonFeatureRef.current);
      polygonFeatureRef.current = null;
    }
    setMeasuredArea(null);
    setAppliedNotice(null);

    const draw = new Draw({
      source,
      type: "Polygon",
    });

    draw.on("drawend", (event) => {
      const feature = event.feature;
      feature.setStyle(polygonStyle);
      polygonFeatureRef.current = feature;
      const geom = feature.getGeometry();
      if (geom instanceof Polygon) {
        const area = Math.round(getArea(geom));
        setMeasuredArea(area);
      }
      setTimeout(() => {
        stopDrawing();
      }, 50);
    });

    map.addInteraction(draw);
    drawInteractionRef.current = draw;
    setIsDrawing(true);
  }, [stopDrawing]);

  const handleApplyMeasuredArea = () => {
    if (measuredArea === null || !onPlanChange) return;
    onPlanChange({
      ...plan,
      venueAreaSquareMeters: measuredArea,
      venueAreaProvenance: {
        origin: "user-adjusted",
        sourceDataset: "VWorld 지도 실측 폴리곤",
        referenceAreaSquareMeters: measuredArea,
        appliedAt: new Date().toISOString(),
      },
    });
    setAppliedNotice(`실측 면적 ${measuredArea.toLocaleString()}m²이 기획안에 적용되었습니다.`);
  };

  const handleClearPolygon = () => {
    stopDrawing();
    if (polygonFeatureRef.current && vectorSourceRef.current) {
      vectorSourceRef.current.removeFeature(polygonFeatureRef.current);
      polygonFeatureRef.current = null;
    }
    setMeasuredArea(null);
    setAppliedNotice(null);
  };

  useEffect(() => {
    if (!coordinates || !vworldApiKey || !mapStageRef.current) return;

    if (typeof window !== "undefined" && !("ResizeObserver" in window)) {
      (window as unknown as Record<string, unknown>).ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      };
    }

    const lat = coordinates.latitude;
    const lon = coordinates.longitude;
    const position = fromLonLat([lon, lat]);

    if (mapInstanceRef.current && mapStageRef.current) {
      try {
        const map = mapInstanceRef.current;
        map.setTarget(mapStageRef.current);
        const view = map.getView();
        view.setCenter(position);
        view.setZoom(15);

        if (vectorSourceRef.current) {
          vectorSourceRef.current.clear();
          const newMarker = new Feature({
            geometry: new Point(position),
            name: plan.name,
          });
          newMarker.setStyle(buildMarkerStyle(plan.name));
          vectorSourceRef.current.addFeature(newMarker);
        }
        setStatus("ready");
        map.updateSize();
        return;
      } catch {
        // Fallback to recreation if reuse fails
      }
    }

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setTarget(undefined);
      mapInstanceRef.current = null;
    }
    mapStageRef.current.innerHTML = "";

    setStatus("loading");

    try {
      const tileLayer = new TileLayer({
        source: new XYZ({
          url: buildVWorldTileUrl(vworldApiKey),
          maxZoom: 19,
          crossOrigin: "anonymous",
        }),
      });

      const marker = new Feature({
        geometry: new Point(position),
        name: plan.name,
      });
      marker.setStyle(buildMarkerStyle(plan.name));

      const vectorSource = new VectorSource({ features: [marker] });
      vectorSourceRef.current = vectorSource;

      const markerLayer = new VectorLayer({
        source: vectorSource,
      });

      const mapEl = mapStageRef.current;
      const map = new Map({
        target: mapEl,
        layers: [tileLayer, markerLayer],
        view: new View({
          center: position,
          zoom: 15,
          minZoom: 6,
          maxZoom: 19,
        }),
      });

      mapInstanceRef.current = map;
      setStatus("ready");

      map.updateSize();
      const timeoutId = window.setTimeout(() => {
        map.updateSize();
      }, 100);

      const observer = new ResizeObserver(() => {
        map.updateSize();
      });
      observer.observe(mapEl);

      return () => {
        window.clearTimeout(timeoutId);
        observer.disconnect();
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("[VenueMapPanel] map init error:", msg);
      setFailReason(msg);
      setStatus("failed");
    }
  }, [coordinates?.latitude, coordinates?.longitude, plan.name]);

  const statusText =
    status === "ready"
      ? "VWorld 지도 표시 중"
      : status === "failed"
        ? `VWorld 지도 로드 실패${failReason ? `: ${failReason}` : ""}`
        : status === "loading"
          ? "VWorld 지도 로드 중..."
          : "VWorld 지도 API 키 미설정";

  const currentArea = plan.venueAreaSquareMeters;

  return (
    <section className="panel venue-map-shell">
      <div className="panel-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2>실제 행사장 지도</h2>
          <span>VWorld 2D 지도 + 공간 다각형 면적(m²) 측정 도구</span>
        </div>
        {onPlanChange ? (
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {!isDrawing ? (
              <button
                type="button"
                onClick={startDrawing}
                className="btn btn-secondary"
                style={{ fontSize: "0.85rem", padding: "6px 12px", background: "#3b82f6", color: "#ffffff", border: "none", borderRadius: "6px", cursor: "pointer" }}
              >
                행사 구역 실측 시작
              </button>
            ) : (
              <button
                type="button"
                onClick={stopDrawing}
                className="btn btn-secondary"
                style={{ fontSize: "0.85rem", padding: "6px 12px", background: "#ef4444", color: "#ffffff", border: "none", borderRadius: "6px", cursor: "pointer" }}
              >
                실측 취소
              </button>
            )}
            {measuredArea !== null && (
              <button
                type="button"
                onClick={handleClearPolygon}
                className="btn btn-secondary"
                style={{ fontSize: "0.85rem", padding: "6px 10px", background: "#6b7280", color: "#ffffff", border: "none", borderRadius: "6px", cursor: "pointer" }}
              >
                초기화
              </button>
            )}
          </div>
        ) : null}
      </div>

      {isDrawing && (
        <div style={{ background: "#dbeafe", border: "1px solid #93c5fd", padding: "8px 14px", borderRadius: "6px", marginBottom: "8px", fontSize: "0.85rem", color: "#1e40af" }}>
          지도 위를 마우스로 클릭하여 행사 통제 구역(펜스 내부, 도로 등) 다각형 경계를 그리세요. 마지막 지점을 더블클릭하면 실측이 완료됩니다.
        </div>
      )}

      {measuredArea !== null && (
        <div style={{ background: "#ecfdf5", border: "1px solid #6ee7b7", padding: "10px 14px", borderRadius: "6px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#065f46", fontSize: "0.9rem", fontWeight: 600 }}>
            실측된 행사장 면적: {measuredArea.toLocaleString()} m²
          </span>
          {onPlanChange && (
            <button
              type="button"
              onClick={handleApplyMeasuredArea}
              style={{ background: "#059669", color: "#ffffff", border: "none", padding: "5px 12px", borderRadius: "5px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}
            >
              기획안에 반영하기
            </button>
          )}
        </div>
      )}

      {appliedNotice && (
        <div style={{ background: "#f0fdf4", border: "1px solid #86efac", padding: "8px 14px", borderRadius: "6px", marginBottom: "8px", color: "#15803d", fontSize: "0.85rem" }}>
          {appliedNotice}
        </div>
      )}

      <div className="venue-map-canvas" style={{ position: "relative", width: "100%", height: "380px", borderRadius: "12px", overflow: "hidden", background: "#f1f5f9" }}>
        {coordinates ? (
          <>
            <div className="venue-map-stage" ref={mapStageRef} style={{ width: "100%", height: "380px" }} />
            {status !== "ready" ? (
              <div className="venue-map-fallback" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(241, 245, 249, 0.85)", zIndex: 10 }}>
                <strong>{statusText}</strong>
              </div>
            ) : null}
          </>
        ) : (
          <div className="venue-map-fallback" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9" }}>
            <strong>행사장 좌표 확인 필요</strong>
          </div>
        )}
      </div>
      <div className="venue-map-meta" style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
        <strong>{plan.name}</strong>
        <span>{plan.venueAddress}</span>
        {currentArea ? (
          <span style={{ color: "#2563eb", fontWeight: 600 }}>
            현재 등록 면적: {currentArea.toLocaleString()} m² ({plan.venueAreaProvenance?.sourceDataset || "기준 면적"})
          </span>
        ) : (
          <span style={{ color: "#d97706", fontWeight: 500 }}>
            현재 면적: 미입력 (위 실측 도구로 산출 권장)
          </span>
        )}
        {coordinates ? (
          <span style={{ color: "#6b7280", fontSize: "0.8rem" }}>
            좌표 기준: {coordinates.longitude}, {coordinates.latitude}
          </span>
        ) : null}
      </div>
      <ul className="venue-map-points">
        {notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </section>
  );
}
