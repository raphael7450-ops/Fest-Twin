/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NAVER_MAP_NCP_KEY_ID?: string;
  readonly VITE_VWORLD_API_KEY?: string;
}

interface Window {
  vw?: {
    ol3: {
      MapOptions: Record<string, unknown>;
      BasemapType: {
        GRAPHIC: unknown;
      };
      DensityType: {
        BASIC: unknown;
        FULL: unknown;
      };
      CameraPosition: unknown;
      Map: new (mapId: string, options: Record<string, unknown>) => {
        getView: () => {
          setCenter: (position: unknown) => void;
          setZoom: (zoom: number) => void;
        };
        addLayer: (layer: unknown) => void;
      };
    };
  };
  ol?: {
    proj: {
      transform: (
        coordinate: [number, number],
        sourceProjection: string,
        targetProjection: string,
      ) => unknown;
    };
    Feature: new (options: Record<string, unknown>) => unknown;
    geom: {
      Point: new (position: unknown) => unknown;
    };
    layer: {
      Vector: new (options: Record<string, unknown>) => unknown;
    };
    source: {
      Vector: new (options: Record<string, unknown>) => unknown;
    };
  };
}
