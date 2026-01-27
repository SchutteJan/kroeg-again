import type { Route } from "./+types/_index";
import { Link } from "react-router";

import { StatsCard } from "../components/stats-card";
import { getStats } from "../lib/queries.server";

export async function loader({}: Route.LoaderArgs) {
  const stats = await getStats();
  return { stats };
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Kroeg · Amsterdam License Curation" },
    {
      name: "description",
      content:
        "Curate Amsterdam alcohol license data with AI-assisted labeling and human verification.",
    },
  ];
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { stats } = loaderData;
  return (
    <main className="min-h-screen bg-sand">
      <section className="relative overflow-hidden px-6 pb-24 pt-16 md:px-12">
        <div className="absolute inset-0 -z-10">
          <div className="absolute -left-10 top-10 h-60 w-60 rounded-full bg-amber-200/50 blur-[80px]" />
          <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-sky-200/60 blur-[90px]" />
          <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-rose-200/40 blur-[100px]" />
        </div>
        <header className="mx-auto flex max-w-5xl flex-col gap-10">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-slate-300/70 bg-white/80 px-4 py-2 text-xs uppercase tracking-[0.3em] text-slate-600">
              Live registry
            </span>
          </div>
          <div className="grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-center">
            <div className="space-y-6">
              <h1 className="text-4xl font-semibold leading-tight text-slate-900 md:text-5xl">
                The living index of Amsterdam&apos;s licensed venues.
              </h1>
              <p className="text-base leading-relaxed text-slate-600 md:text-lg">
                Kroeg tracks every alcohol license, labels each venue with an AI
                agent, and routes the most interesting leads to human reviewers.
                Filter by label, explore on the map, and publish verified spots
                for the city.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  to="/map"
                  className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5"
                >
                  Explore map
                </Link>
                <Link
                  to="/admin/pending"
                  className="rounded-full border border-slate-300/70 bg-white/80 px-6 py-3 text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5"
                >
                  Review pending
                </Link>
              </div>
            </div>
            <div className="space-y-4 rounded-[32px] border border-white/70 bg-white/70 p-6 shadow-[0_40px_120px_-90px_rgba(15,23,42,0.6)]">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Live status
              </p>
              <p className="text-2xl font-semibold text-slate-900">
                {stats.curated} curated venues
              </p>
              <p className="text-sm text-slate-600">
                {stats.pending_verification} awaiting human verification ·{" "}
                {stats.uncurated} in queue
              </p>
              <div className="grid gap-3 text-sm text-slate-600">
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span>Total licenses</span>
                  <span className="font-semibold text-slate-800">
                    {stats.total_licenses}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span>Verified</span>
                  <span className="font-semibold text-slate-800">
                    {stats.verified}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Use <code className="rounded bg-slate-100 px-2 py-1">/api</code>{" "}
                for automated curation agents.
              </p>
            </div>
          </div>
        </header>
      </section>
      <section className="mx-auto grid max-w-5xl gap-6 px-6 pb-20 md:grid-cols-3 md:px-12">
        <StatsCard
          title="Queued"
          value={`${stats.uncurated}`}
          caption="Licenses waiting for a first pass."
          tone="amber"
        />
        <StatsCard
          title="Pending"
          value={`${stats.pending_verification}`}
          caption="AI decisions awaiting human eyes."
          tone="rose"
        />
        <StatsCard
          title="Published"
          value={`${stats.verified}`}
          caption="Approved venues visible in public views."
          tone="emerald"
        />
      </section>
    </main>
  );
}
