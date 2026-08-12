import { useEffect, useRef, useState } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import XYZ from "ol/source/XYZ";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import Style from "ol/style/Style";
import IconStyle from "ol/style/Icon";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Text from "ol/style/Text";
import { fromLonLat } from "ol/proj";
import "ol/ol.css";
import type { FestivalPlan } from "../domain/types";

const vworldApiKey = import.meta.env.VITE_VWORLD_API_KEY?.trim();

type MapStatus = "missing-key" | "loading" | "ready" | "failed";

interface VenueMapPanelProps {
  plan: FestivalPlan;
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

export function VenueMapPanel({ plan }: VenueMapPanelProps) {
  const mapStageRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const [status, setStatus] = useState<MapStatus>(vworldApiKey ? "loading" : "missing-key");
  const [failReason, setFailReason] = useState<string>("");
  const coordinates = plan.venueCoordinates;
  const notes = buildVenueOperationalNotes(plan);

  useEffect(() => {
    if (!coordinates || !vworldApiKey || !mapStageRef.current) return;

    // cleanup previous map instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setTarget(undefined);
      mapInstanceRef.current = null;
    }
    mapStageRef.current.innerHTML = "";

    setStatus("loading");

    try {
      const position = fromLonLat([coordinates.longitude, coordinates.latitude]);

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

      const markerLayer = new VectorLayer({
        source: new VectorSource({ features: [marker] }),
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

      // trigger resize after mount to fix tile gaps
      window.setTimeout(() => {
        map.updateSize();
      }, 200);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("[VenueMapPanel] map init error:", msg);
      setFailReason(msg);
      setStatus("failed");
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setTarget(undefined);
        mapInstanceRef.current = null;
      }
    };
  }, [coordinates, plan.name]);

  const statusText =
    status === "ready"
      ? "VWorld 지도 표시 중"
      : status === "failed"
        ? `VWorld 지도 로드 실패${failReason ? `: ${failReason}` : ""}`
        : status === "loading"
          ? "VWorld 지도 로드 중..."
          : "VWorld 지도 API 키 미설정";

  return (
    <section className="panel venue-map-shell">
      <div className="panel-heading">
        <h2>실제 행사장 지도</h2>
        <span>TourAPI 좌표 + VWorld 2D 지도 API</span>
      </div>
      <div className="venue-map-canvas">
        {coordinates ? (
          <>
            <div className="venue-map-stage" ref={mapStageRef} />
            {status !== "ready" ? (
              <div className="venue-map-fallback">
                <strong>{statusText}</strong>
              </div>
            ) : null}
          </>
        ) : (
          <div className="venue-map-fallback">
            <strong>행사장 좌표 확인 필요</strong>
          </div>
        )}
      </div>
      <div className="venue-map-meta">
        <strong>{plan.name}</strong>
        <span>{plan.venueAddress}</span>
        {coordinates ? (
          <span>
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
