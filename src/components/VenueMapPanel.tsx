import { useEffect, useMemo, useRef, useState } from "react";
import type { FestivalPlan } from "../domain/types";
import type { FestivalCandidate } from "../services/tourApiAdapter";

type MapStatus = "missing-key" | "loading" | "ready" | "failed";

interface VenueMapPanelProps {
  plan: FestivalPlan;
  selectedCandidate?: FestivalCandidate | null;
}

const defaultVenue = {
  latitude: 37.5103955843,
  longitude: 127.0610512042,
};

const naverMapKeyId = import.meta.env.VITE_NAVER_MAP_NCP_KEY_ID?.trim();

function loadNaverMaps(keyId: string) {
  if (window.naver?.maps) {
    return Promise.resolve();
  }

  const existingScript = document.querySelector<HTMLScriptElement>(
    "script[data-fest-twin-naver-map]",
  );
  if (existingScript) {
    return new Promise<void>((resolve, reject) => {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("NAVER Maps load failed")), {
        once: true,
      });
    });
  }

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.dataset.festTwinNaverMap = "true";
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(
      keyId,
    )}`;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("NAVER Maps load failed")), {
      once: true,
    });
    document.head.appendChild(script);
  });
}

export function VenueMapPanel({ plan, selectedCandidate }: VenueMapPanelProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<MapStatus>(naverMapKeyId ? "loading" : "missing-key");
  const venue = useMemo(() => {
    const latitude = Number(selectedCandidate?.mapY);
    const longitude = Number(selectedCandidate?.mapX);

    return {
      name: plan.name,
      address: plan.venueAddress,
      latitude: Number.isFinite(latitude) ? latitude : defaultVenue.latitude,
      longitude: Number.isFinite(longitude) ? longitude : defaultVenue.longitude,
      hasCandidateCoordinates: Number.isFinite(latitude) && Number.isFinite(longitude),
    };
  }, [plan.name, plan.venueAddress, selectedCandidate?.mapX, selectedCandidate?.mapY]);

  useEffect(() => {
    if (!naverMapKeyId) return;

    let cancelled = false;

    setStatus("loading");
    loadNaverMaps(naverMapKeyId)
      .then(() => {
        if (cancelled || !mapContainerRef.current || !window.naver?.maps) return;

        const maps = window.naver.maps;
        const position = new maps.LatLng(venue.latitude, venue.longitude);
        const map = new maps.Map(mapContainerRef.current, {
          center: position,
          zoom: 16,
        });

        new maps.Marker({
          map,
          position,
          title: venue.name,
        });

        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("failed");
      });

    return () => {
      cancelled = true;
    };
  }, [venue.latitude, venue.longitude, venue.name]);

  const statusText =
    status === "ready"
      ? "네이버 지도 표시 중"
      : status === "failed"
        ? "네이버 지도 로드 실패"
        : status === "loading"
          ? "네이버 지도 로드 중"
          : "네이버 지도 API 키 미설정";

  return (
    <section className="panel venue-map-shell">
      <div className="panel-heading">
        <h2>실제 행사장 지도</h2>
        <span>TourAPI 좌표 + 네이버 지도 API</span>
      </div>
      <div className="venue-map-canvas" ref={mapContainerRef}>
        {status !== "ready" ? (
          <div className="venue-map-fallback">
            <strong>{statusText}</strong>
            <span>지도 키가 없거나 로드에 실패하면 TourAPI 좌표 기준 위치 정보를 표시합니다.</span>
          </div>
        ) : null}
      </div>
      <div className="venue-map-meta">
        <strong>{venue.name}</strong>
        <span>{venue.address}</span>
        <span>
          좌표는 {venue.hasCandidateCoordinates ? "선택 후보" : "기본 예시"} 기준:{" "}
          {venue.longitude}, {venue.latitude}
        </span>
      </div>
      <ul className="venue-map-points">
        <li>📍 행사장 중심 구역: {venue.name}</li>
        <li>🚨 주요 진출입 병목: 삼성역 5·6번 출입구 및 영동대로 진입로</li>
        <li>🔥 피크 밀집 예상: COEX 동문 광장 & K-POP 미디어월 관람 구역</li>
        <li>🛍️ 상권 연계 분산: 먹거리 부스 & 주변 상업 시설 연계 동선</li>
      </ul>
    </section>
  );
}
