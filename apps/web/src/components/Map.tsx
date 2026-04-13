import maplibregl from "maplibre-gl";
import { LocateFixed } from "lucide-solid";
import { createSignal, onCleanup, onMount } from "solid-js";
import { showToast } from "~/components/Toast";

const TILE_URL = "https://t2.data.amsterdam.nl/topo_wm_light/{z}/{x}/{y}.png";

const AMSTERDAM_CENTER: [number, number] = [4.9041, 52.3676]; // [lng, lat]
const DEFAULT_ZOOM = 14;
const LOCATE_ZOOM = 16;

const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    amsterdam: {
      type: "raster",
      tiles: [TILE_URL],
      tileSize: 256,
      attribution: "&copy; Gemeente Amsterdam",
    },
  },
  layers: [
    {
      id: "amsterdam-tiles",
      type: "raster",
      source: "amsterdam",
    },
  ],
};

export type MapProps = {
  class?: string;
  center?: [number, number];
  zoom?: number;
};

export function Map(props: MapProps) {
  let containerRef: HTMLDivElement | undefined = undefined;
  let map: maplibregl.Map | undefined;
  let marker: maplibregl.Marker | undefined;
  const [locating, setLocating] = createSignal(false);

  onMount(async () => {
    if (!containerRef) {
      return;
    }

    map = new maplibregl.Map({
      container: containerRef,
      style: MAP_STYLE,
      center: props.center ?? AMSTERDAM_CENTER,
      zoom: props.zoom ?? DEFAULT_ZOOM,
    });
  });

  onCleanup(() => {
    map?.remove();
  });

  function locate() {
    if (!map || locating()) {
      return;
    }
    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lngLat: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        map!.flyTo({ center: lngLat, zoom: LOCATE_ZOOM });

        marker?.remove();
        marker = new maplibregl.Marker().setLngLat(lngLat).addTo(map!);

        setLocating(false);
      },
      (err) => {
        const messages: Record<number, string> = {
          1: "Location access denied.",
          2: "Location unavailable.",
          3: "Location request timed out.",
        };
        showToast(messages[err.code] ?? "Could not determine your location.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div class={`relative ${props.class ?? ""}`}>
      <div ref={containerRef!} class="h-full w-full" />
      <button
        type="button"
        class="absolute top-3 right-3 rounded-full bg-white p-2 shadow-md hover:bg-gray-100 disabled:opacity-50"
        onClick={locate}
        disabled={locating()}
        aria-label="Locate me"
      >
        <LocateFixed class={`size-5 ${locating() ? "animate-pulse" : ""}`} />
      </button>
    </div>
  );
}
