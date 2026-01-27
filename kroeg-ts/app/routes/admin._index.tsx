import type { Route } from "./+types/admin._index";
import { Link } from "react-router";

import { StatsCard } from "../components/stats-card";
import { getStats } from "../lib/queries.server";

export async function loader() {
  const stats = await getStats();
  return { stats };
}

export default function AdminDashboard({ loaderData }: Route.ComponentProps) {
  const { stats } = loaderData;
  return (
    <main className="min-h-screen bg-sand px-6 pb-16 pt-12 md:px-12">
      <header className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Admin
          </p>
          <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">
            Curation control room.
          </h1>
        </div>
        <div className="flex flex-wrap gap-3 text-sm font-semibold text-slate-700">
          <Link to="/admin/pending" className="hover:text-slate-900">
            Pending
          </Link>
          <Link to="/admin/locations" className="hover:text-slate-900">
            Locations
          </Link>
          <Link to="/admin/licenses" className="hover:text-slate-900">
            Licenses
          </Link>
        </div>
      </header>
      <section className="mx-auto mt-10 grid max-w-6xl gap-6 md:grid-cols-3">
        <StatsCard
          title="Total licenses"
          value={stats.total_licenses}
          caption="Raw data synced from Amsterdam."
          tone="slate"
        />
        <StatsCard
          title="Curated"
          value={stats.curated}
          caption="AI decisions recorded."
          tone="emerald"
        />
        <StatsCard
          title="Pending review"
          value={stats.pending_verification}
          caption="Awaiting human verification."
          tone="rose"
        />
      </section>
      <section className="mx-auto mt-10 max-w-6xl rounded-[32px] border border-white/70 bg-white/70 p-8 shadow-[0_40px_120px_-90px_rgba(15,23,42,0.6)]">
        <h2 className="text-xl font-semibold text-slate-900">
          Quick actions
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Link
            to="/admin/pending"
            className="rounded-3xl border border-slate-200/70 bg-white p-5 text-sm text-slate-600 shadow-sm transition hover:-translate-y-1"
          >
            <p className="font-semibold text-slate-900">Review queue</p>
            <p className="mt-2">
              {stats.pending_verification} decisions ready for verification.
            </p>
          </Link>
          <Link
            to="/admin/locations"
            className="rounded-3xl border border-slate-200/70 bg-white p-5 text-sm text-slate-600 shadow-sm transition hover:-translate-y-1"
          >
            <p className="font-semibold text-slate-900">Manage locations</p>
            <p className="mt-2">
              Browse curated venues and status.
            </p>
          </Link>
          <Link
            to="/admin/licenses"
            className="rounded-3xl border border-slate-200/70 bg-white p-5 text-sm text-slate-600 shadow-sm transition hover:-translate-y-1"
          >
            <p className="font-semibold text-slate-900">Sync licenses</p>
            <p className="mt-2">
              Pull the latest dataset updates.
            </p>
          </Link>
        </div>
      </section>
    </main>
  );
}

