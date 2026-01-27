import type { Route } from "./+types/list";
import { Link } from "react-router";

import { labelMap, locationLabels } from "../lib/labels";
import { getPublishedLocations } from "../lib/queries.server";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const label = url.searchParams.get("label");
  const locations = await getPublishedLocations({ label });
  return { locations, label };
}

export default function ListView({ loaderData }: Route.ComponentProps) {
  const { locations, label } = loaderData;
  return (
    <main className="min-h-screen bg-sand px-6 pb-16 pt-12 md:px-12">
      <header className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            List view
          </p>
          <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">
            Published venues and their labels.
          </h1>
        </div>
        <Link
          to="/map"
          className="text-sm font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4"
        >
          Switch to map
        </Link>
      </header>
      <section className="mx-auto mt-8 flex max-w-6xl flex-wrap gap-3">
        <Link
          to="/list"
          className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em] ${
            !label ? "bg-slate-900 text-white" : "bg-white text-slate-600"
          }`}
        >
          All
        </Link>
        {locationLabels.map((item) => (
          <Link
            key={item.value}
            to={`/list?label=${item.value}`}
            className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em] ${
              label === item.value
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </section>
      <section className="mx-auto mt-8 max-w-6xl overflow-hidden rounded-[32px] border border-white/70 bg-white/70 shadow-[0_35px_120px_-90px_rgba(15,23,42,0.6)]">
        <div className="grid grid-cols-[2fr_1fr_1fr] gap-4 border-b border-slate-200/60 px-6 py-4 text-xs uppercase tracking-[0.3em] text-slate-500">
          <span>Venue</span>
          <span>Label</span>
          <span>License category</span>
        </div>
        {locations.length === 0 ? (
          <p className="px-6 py-8 text-sm text-slate-500">
            No venues published yet for this label.
          </p>
        ) : (
          locations.map((location: any) => (
            <Link
              key={location.id}
              to={`/location/${location.id}`}
              className="grid grid-cols-[2fr_1fr_1fr] gap-4 border-b border-slate-100 px-6 py-5 text-sm text-slate-700 transition hover:bg-white"
            >
              <span className="font-medium text-slate-900">
                {location.name}
              </span>
              <span>
                {labelMap[location.label]?.label ?? location.label}
              </span>
              <span>{location.zaak_categorie ?? "Pending"}</span>
            </Link>
          ))
        )}
      </section>
    </main>
  );
}

