/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NAVER_MAP_NCP_KEY_ID?: string;
}

interface Window {
  naver?: {
    maps: {
      LatLng: new (latitude: number, longitude: number) => unknown;
      Map: new (
        element: HTMLElement,
        options: { center: unknown; zoom: number },
      ) => unknown;
      Marker: new (options: { map: unknown; position: unknown; title: string }) => unknown;
    };
  };
}
