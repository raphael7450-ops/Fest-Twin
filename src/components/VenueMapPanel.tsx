import { useEffect, useRef, useState } from "react";

const venue = {
  name: "강남 미디어 윈터페스타",
  address: "서울특별시 강남구 영동대로 511 (삼성동)",
  latitude: 37.5103955843,
  longitude: 127.0610512042,
  points: [
    { name: "행사장 중심", latitude: 37.5103955843, longitude: 127.0610512042 },
    { name: "삼성역 출입구", latitude: 37.508844, longitude: 127.06316 },
    { name: "코엑스 동문", latitude: 37.51152, longitude: 127.05945 },
    { name: "미디어월 관람 구역", latitude: 37.51098, longitude: 127.06142 },
  ],
};

type MapStatus = "missing-key" | "loading" | "ready" | "failed";

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

export function VenueMapPanel() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<MapStatus>(naverMapKeyId ? "loading" : "missing-key");

  useEffect(() => {
    if (!naverMapKeyId) return;

    let cancelled = false;

    loadNaverMaps(naverMapKeyId)
      .then(() => {
        if (cancelled || !mapContainerRef.current || !window.naver?.maps) return;

        const maps = window.naver.maps;
        const position = new maps.LatLng(venue.latitude, venue.longitude);
        const map = new maps.Map(mapContainerRef.current, {
          center: position,
          zoom: 16,
        });

        venue.points.forEach((point) => {
          new maps.Marker({
            map,
            position: new maps.LatLng(point.latitude, point.longitude),
            title: point.name,
          });
        });

        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("failed");
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
            <span>지도 키가 없거나 로드에 실패해 TourAPI 좌표 기준 위치 정보를 표시합니다.</span>
          </div>
        ) : null}
      </div>
      <div className="venue-map-meta">
        <strong>{venue.name}</strong>
        <span>{venue.address}</span>
        <span>
          좌표는 TourAPI 조회값 기준: {venue.longitude}, {venue.latitude}
        </span>
      </div>
      <ul className="venue-map-points">
        {venue.points.map((point) => (
          <li key={point.name}>{point.name}</li>
        ))}
      </ul>
    </section>
  );
}
