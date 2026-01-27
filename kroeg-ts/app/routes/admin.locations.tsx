import type { Route } from "./+types/admin.locations";
import { Link } from "react-router";

import { labelMap } from "../lib/labels";
import { getAdminLocations } from "../lib/queries.server";

export async function loader() {
  const locations = await getAdminLocations();
  return { locations };
}

export default function AdminLocations({ loaderData }: Route.ComponentProps) {
  const { locations } = loaderData;
  return (
    <main className="min-h-screen bg-sand px-6 pb-16 pt-12 md:px-12">
      <header className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Locations
          </p>
          <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">
            Curated venues overview.
          </h1>
        </div>
        <Link
          to="/admin"
          className="text-sm font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4"
        >
          Back to dashboard
        </Link>
      </header>
      <section className="mx-auto mt-10 max-w-6xl overflow-hidden rounded-[32px] border border-white/70 bg-white/70 shadow-[0_40px_120px_-90px_rgba(15,23,42,0.6)]">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 border-b border-slate-200/60 px-6 py-4 text-xs uppercase tracking-[0.3em] text-slate-500">
          <span>Venue</span>
          <span>Label</span>
          <span>Status</span>
          <span>License</span>
        </div>
        {locations.length === 0 ? (
          <p className="px-6 py-8 text-sm text-slate-500">
            No locations curated yet.
          </p>
        ) : (
          locations.map((location: any) => (
            <Link
              key={location.id}
              to={`/location/${location.id}`}
              className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 border-b border-slate-100 px-6 py-5 text-sm text-slate-700 transition hover:bg-white"
            >
              <span className="font-medium text-slate-900">
                {location.name}
              </span>
              <span>
                {labelMap[location.label]?.label ?? location.label}
              </span>
              <span>
                {location.is_published ? "Published" : "Unverified"}
              </span>
              <span>{location.zaak_categorie ?? "Pending"}</span>
            </Link>
          ))
        )}
      </section>
    </main>
  );
}

