import { useEffect, useRef, useState } from "react";
import type { FestivalPlan } from "../domain/types";

type MapStatus = "missing-key" | "loading" | "ready" | "failed" | "key-rejected";

interface VenueMapPanelProps {
  plan: FestivalPlan;
}

const vworldApiKey = import.meta.env.VITE_VWORLD_API_KEY?.trim();

interface VenueMarkerStyleOl {
  style: {
    Style: new (options: Record<string, unknown>) => unknown;
    Icon: new (options: Record<string, unknown>) => unknown;
    Fill: new (options: Record<string, unknown>) => unknown;
    Stroke: new (options: Record<string, unknown>) => unknown;
    Text: new (options: Record<string, unknown>) => unknown;
  };
}

export function buildVWorldScriptUrl(apiKey: string) {
  return `https://map.vworld.kr/js/vworldMapInit.js.do?version=2.0&apiKey=${encodeURIComponent(apiKey)}`;
}

export function isVWorldKeyRejected(scriptText: string) {
  return /vworldIsValid\s*=\s*["']false["']/.test(scriptText);
}

export function resetVenueMapContainer(container: HTMLDivElement) {
  container.replaceChildren();
}

export function buildVenueMarkerStyle(ol: VenueMarkerStyleOl, label: string) {
  const arrowSvg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 42 42">
      <path d="M21 39 8 14h8V4h10v10h8L21 39Z" fill="#ef4444" stroke="#ffffff" stroke-width="3" stroke-linejoin="round"/>
      <path d="M21 34 12 17h7V7h4v10h7L21 34Z" fill="#dc2626"/>
    </svg>
  `);

  return new ol.style.Style({
    image: new ol.style.Icon({
      anchor: [0.5, 1],
      anchorXUnits: "fraction",
      anchorYUnits: "fraction",
      src: `data:image/svg+xml;charset=UTF-8,${arrowSvg}`,
    }),
    text: new ol.style.Text({
      text: label,
      offsetY: -44,
      font: "700 13px system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      fill: new ol.style.Fill({ color: "#111827" }),
      stroke: new ol.style.Stroke({ color: "#ffffff", width: 4 }),
    }),
  });
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
      ? `관객 집중 후보: ${stages.map((item) => item.name).join(", ")}`
      : "관객 집중 후보: 기획안 입력 필요",
    booths.length > 0
      ? `분산 운영 후보: ${booths.map((item) => item.name).join(", ")}`
      : "분산 운영 후보: 기획안 입력 필요",
  ];
}

function loadVWorldMap(apiKey: string) {
  if (window.vw?.ol3 && window.ol) {
    return Promise.resolve();
  }

  const existingScript = document.querySelector<HTMLScriptElement>(
    "script[data-fest-twin-vworld-map]",
  );
  if (!existingScript) {
    const script = document.createElement("script");
    script.async = true;
    script.dataset.festTwinVworldMap = "true";
    script.src = buildVWorldScriptUrl(apiKey);
    document.head.appendChild(script);
  }

  return waitForVWorldMap();
}

function waitForVWorldMap() {
  if (window.vw?.ol3 && window.ol) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const startedAt = window.performance.now();
    const poll = () => {
      if (window.vworldIsValid === "false") {
        reject(new Error("VWORLD_KEY_REJECTED"));
        return;
      }
      if (window.vw?.ol3 && window.ol) {
        resolve();
        return;
      }
      if (window.performance.now() - startedAt > 8000) {
        reject(new Error("VWorld map load timed out"));
        return;
      }
      window.setTimeout(poll, 100);
    };
    poll();
  });
}

export function VenueMapPanel({ plan }: VenueMapPanelProps) {
  const mapStageRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<MapStatus>(vworldApiKey ? "loading" : "missing-key");
  const coordinates = plan.venueCoordinates;
  const notes = buildVenueOperationalNotes(plan);

  useEffect(() => {
    if (!coordinates || !vworldApiKey) return;

    let cancelled = false;

    if (mapStageRef.current) {
      resetVenueMapContainer(mapStageRef.current);
    }
    setStatus("loading");
    loadVWorldMap(vworldApiKey)
      .then(() => {
        if (cancelled || !mapStageRef.current || !window.vw?.ol3 || !window.ol) return;

        const mapId = mapStageRef.current.id || "fest-twin-vworld-map";
        resetVenueMapContainer(mapStageRef.current);
        mapStageRef.current.id = mapId;

        window.vw.ol3.MapOptions = {
          basemapType: window.vw.ol3.BasemapType.GRAPHIC,
          controlDensity: window.vw.ol3.DensityType.BASIC,
          interactionDensity: window.vw.ol3.DensityType.FULL,
          controlsAutoArrange: true,
          homePosition: window.vw.ol3.CameraPosition,
          initPosition: window.vw.ol3.CameraPosition,
        };

        const map = new window.vw.ol3.Map(mapId, window.vw.ol3.MapOptions);
        const position = window.ol.proj.transform(
          [coordinates.longitude, coordinates.latitude],
          "EPSG:4326",
          "EPSG:900913",
        );
        map.getView().setCenter(position);
        map.getView().setZoom(16);

        const marker = new window.ol.Feature({
          geometry: new window.ol.geom.Point(position),
          name: plan.name,
        });
        marker.setStyle(buildVenueMarkerStyle(window.ol, plan.name));
        const markerLayer = new window.ol.layer.Vector({
          source: new window.ol.source.Vector({
            features: [marker],
          }),
        });
        map.addLayer(markerLayer);

        setStatus("ready");
        window.setTimeout(() => {
          if (!cancelled && mapStageRef.current) {
            window.dispatchEvent(new Event("resize"));
          }
        }, 300);
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setStatus(error.message === "VWORLD_KEY_REJECTED" ? "key-rejected" : "failed");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [coordinates, plan.name]);

  const statusText =
    status === "ready"
      ? "VWorld 지도 표시 중"
      : status === "key-rejected"
        ? "VWorld API 키와 등록 도메인이 일치하지 않습니다"
        : status === "failed"
          ? "VWorld 지도 로드 실패"
          : status === "loading"
            ? "VWorld 지도 로드 중"
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
