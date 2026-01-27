import type { Route } from "./+types/location.$id";
import { Link } from "react-router";

import { labelMap } from "../lib/labels";
import { getLocationById } from "../lib/queries.server";

export async function loader({ params }: Route.LoaderArgs) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    throw new Response("Invalid id", { status: 400 });
  }
  const data = await getLocationById(id);
  if (!data) {
    throw new Response("Not found", { status: 404 });
  }
  return data;
}

export default function LocationDetail({ loaderData }: Route.ComponentProps) {
  const { location, decisions } = loaderData;
  return (
    <main className="min-h-screen bg-sand px-6 pb-16 pt-12 md:px-12">
      <Link
        to="/list"
        className="text-sm font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4"
      >
        Back to list
      </Link>
      <section className="mx-auto mt-6 max-w-4xl space-y-8">
        <header className="rounded-[32px] border border-white/70 bg-white/80 p-8 shadow-[0_40px_120px_-90px_rgba(15,23,42,0.6)]">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            {labelMap[location.label]?.label ?? location.label}
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">
            {location.name}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {location.address ?? "Address unknown"} ·{" "}
            {location.postcode ?? "Postcode pending"}
          </p>
          <div className="mt-6 grid gap-4 text-sm text-slate-600 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                License status
              </p>
              <p className="mt-2 font-semibold text-slate-800">
                {location.status_vergunning ?? "Unknown"}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Category
              </p>
              <p className="mt-2 font-semibold text-slate-800">
                {location.zaak_categorie ?? "Pending"}
              </p>
            </div>
          </div>
        </header>
        <section className="rounded-[32px] border border-white/70 bg-white/70 p-8 shadow-[0_35px_110px_-90px_rgba(15,23,42,0.5)]">
          <h2 className="text-xl font-semibold text-slate-900">
            Curation decisions
          </h2>
          {decisions.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              No decisions recorded yet.
            </p>
          ) : (
            <div className="mt-6 grid gap-4">
              {decisions.map((decision: any) => (
                <div
                  key={decision.id}
                  className="rounded-2xl border border-slate-200/70 bg-white p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">
                      {labelMap[decision.label]?.label ?? decision.label}
                    </p>
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      {decision.decisionType}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {decision.sanitizedName}
                  </p>
                  <p className="mt-3 text-sm text-slate-500">
                    {decision.reasoning ?? "No reasoning provided."}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

