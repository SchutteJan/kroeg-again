import type { Route } from "./+types/map";
import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router";
import "leaflet/dist/leaflet.css";

import { labelMap, locationLabels } from "../lib/labels";
import { getPublishedLocations } from "../lib/queries.server";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const label = url.searchParams.get("label");
  const locations = await getPublishedLocations({ label });
  return { locations, label };
}

export default function MapView({ loaderData }: Route.ComponentProps) {
  const { locations, label } = loaderData;
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const liveMarkersRef = useRef<{ dot?: any; radius?: any }>({});
  const visibleLocations = useMemo(() => locations ?? [], [locations]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) {
      return;
    }

    let isMounted = true;

    import("leaflet").then((L) => {
      if (!isMounted || !mapRef.current) {
        return;
      }

      leafletRef.current = L;
      const map = L.map(mapRef.current).setView(
        [52.3694028, 4.9012861],
        13,
      );

      L.tileLayer("https://t2.data.amsterdam.nl/topo_wm_light/{z}/{x}/{y}.png", {
        maxZoom: 21,
        attribution: "&copy; Gemeente Amsterdam",
      }).addTo(map);

      map.on("locationfound", (event: any) => {
        const { dot, radius } = liveMarkersRef.current;
        if (dot) {
          map.removeLayer(dot);
        }
        if (radius) {
          map.removeLayer(radius);
        }

        liveMarkersRef.current.dot = L.circle(event.latlng, {
          radius: 3,
          color: "#0172AD",
          fillOpacity: 1,
          interactive: false,
        }).addTo(map);
        liveMarkersRef.current.radius = L.circle(event.latlng, {
          radius: event.accuracy,
          color: "#0172AD",
          fillOpacity: 0.1,
          interactive: false,
        }).addTo(map);
      });

      const LocateControl = L.Control.extend({
        onAdd() {
          const button = L.DomUtil.create("button");
          button.innerHTML = "🎯";
          button.setAttribute("type", "button");
          button.style.border = "none";
          button.style.backgroundColor = "white";
          button.style.fontSize = "20px";
          button.style.cursor = "pointer";
          button.style.margin = "10px";
          button.style.padding = "0.5rem 0.7rem";
          button.style.borderRadius = "9999px";
          button.style.boxShadow = "0 0 5px rgba(0,0,0,0.3)";
          button.onclick = () => {
            map.locate({ setView: true, maxZoom: 16 });
          };
          return button;
        },
      });

      new LocateControl({ position: "topright" }).addTo(map);
      mapInstanceRef.current = map;
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapInstanceRef.current;
    if (!L || !map) {
      return;
    }

    if (!markersLayerRef.current) {
      markersLayerRef.current = L.layerGroup().addTo(map);
    } else {
      markersLayerRef.current.clearLayers();
    }

    const toneColors: Record<string, string> = {
      amber: "#D97706",
      rose: "#E11D48",
      emerald: "#059669",
      sky: "#0284C7",
      orange: "#F97316",
      violet: "#7C3AED",
      fuchsia: "#C026D3",
      cyan: "#06B6D4",
      slate: "#475569",
    };

    const bounds = L.latLngBounds([]);
    visibleLocations.forEach((location: any) => {
      const coords = location.coordinates;
      if (!coords || typeof coords.lat !== "number" || typeof coords.lng !== "number") {
        return;
      }
      bounds.extend([coords.lat, coords.lng]);

      const labelInfo = labelMap[location.label as keyof typeof labelMap];
      const tone = labelInfo?.tone ?? "slate";
      const color = toneColors[tone] ?? toneColors.slate;
      const popupHtml = `
        <div style="font-family: 'Space Grotesk', sans-serif;">
          <strong>${location.name ?? "Unknown venue"}</strong><br/>
          <span>${location.address ?? "Address unknown"}</span><br/>
          <em>${labelInfo?.label ?? location.label}</em>
        </div>
      `;

      L.circle([coords.lat, coords.lng], {
        color,
        fillOpacity: 0.25,
        radius: 10,
      })
        .bindPopup(popupHtml)
        .addTo(markersLayerRef.current);
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }
  }, [visibleLocations]);
  return (
    <main className="min-h-screen bg-sand px-6 pb-16 pt-12 md:px-12">
      <header className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Map view
          </p>
          <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">
            The city, filtered by venue type.
          </h1>
        </div>
        <Link
          to="/list"
          className="text-sm font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4"
        >
          Switch to list
        </Link>
      </header>
      <section className="mx-auto mt-10 grid max-w-6xl gap-8 lg:grid-cols-[1.2fr_0.9fr]">
        <div className="rounded-[32px] border border-white/70 bg-white/70 p-6 shadow-[0_30px_120px_-80px_rgba(15,23,42,0.7)]">
          <div className="flex flex-wrap gap-2">
            <Link
              to="/map"
              className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em] ${
                !label
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600"
              }`}
            >
              All
            </Link>
            {locationLabels.map((item) => (
              <Link
                key={item.value}
                to={`/map?label=${item.value}`}
                className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em] ${
                  label === item.value
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="mt-6 grid gap-4">
            {locations.length === 0 ? (
              <p className="text-sm text-slate-500">
                No published locations yet. Check the admin dashboard to verify
                AI decisions.
              </p>
            ) : (
              locations.map((location: any) => (
                <Link
                  key={location.id}
                  to={`/location/${location.id}`}
                  className="rounded-3xl border border-slate-200/70 bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-base font-semibold text-slate-900">
                        {location.name}
                      </p>
                      <p className="text-sm text-slate-500">
                        {location.address ?? "Address unknown"}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                      {labelMap[location.label]?.label ?? location.label}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-slate-400">
                    {location.zaak_categorie ?? "Category pending"}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
        <aside className="overflow-hidden rounded-[32px] border border-white/70 bg-white/80 p-4 shadow-[0_40px_140px_-100px_rgba(15,23,42,0.8)]">
          <div className="mb-4 flex items-center justify-between px-2">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Live map
              </p>
              <h2 className="text-lg font-semibold text-slate-900">
                Verified venues in Amsterdam.
              </h2>
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              {visibleLocations.length} pins
            </span>
          </div>
          <div
            ref={mapRef}
            className="h-[70vh] w-full overflow-hidden rounded-[24px] border border-slate-200/70 shadow-inner"
          />
        </aside>
      </section>
    </main>
  );
}
