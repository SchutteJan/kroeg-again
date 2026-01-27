import type { Route } from "./+types/admin.licenses";
import { Form, Link, useActionData } from "react-router";

import { getLicenses, syncLicenses } from "../lib/queries.server";

export async function loader() {
  const licenses = await getLicenses({ limit: 200 });
  return { licenses };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const sourceUrl = formData.get("source_url")?.toString();
  if (!sourceUrl) {
    throw new Response("Missing source URL", { status: 400 });
  }
  const result = await syncLicenses(sourceUrl);
  return result;
}

export default function AdminLicenses({ loaderData }: Route.ComponentProps) {
  const actionData = useActionData<typeof action>();
  const { licenses } = loaderData;
  return (
    <main className="min-h-screen bg-sand px-6 pb-16 pt-12 md:px-12">
      <header className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Licenses
          </p>
          <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">
            Sync and inspect raw data.
          </h1>
        </div>
        <Link
          to="/admin"
          className="text-sm font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4"
        >
          Back to dashboard
        </Link>
      </header>
      <section className="mx-auto mt-8 max-w-6xl rounded-[32px] border border-white/70 bg-white/70 p-8 shadow-[0_40px_120px_-90px_rgba(15,23,42,0.6)]">
        <Form method="post" className="flex flex-col gap-4 md:flex-row">
          <input
            name="source_url"
            placeholder="https://api.data.amsterdam.nl/..."
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5"
          >
            Sync licenses
          </button>
        </Form>
        {actionData ? (
          <p className="mt-4 text-sm text-slate-600">
            Added {actionData.added}, updated {actionData.updated}, marked inactive{" "}
            {actionData.marked_inactive}.
          </p>
        ) : null}
      </section>
      <section className="mx-auto mt-8 max-w-6xl overflow-hidden rounded-[32px] border border-white/70 bg-white/70 shadow-[0_35px_120px_-90px_rgba(15,23,42,0.6)]">
        <div className="grid grid-cols-[2fr_1fr_1fr] gap-4 border-b border-slate-200/60 px-6 py-4 text-xs uppercase tracking-[0.3em] text-slate-500">
          <span>License</span>
          <span>Category</span>
          <span>Status</span>
        </div>
        {licenses.length === 0 ? (
          <p className="px-6 py-8 text-sm text-slate-500">
            No licenses synced yet.
          </p>
        ) : (
          licenses.map((license: any) => (
            <div
              key={license.id}
              id={`license-${license.id}`}
              className="grid grid-cols-[2fr_1fr_1fr] gap-4 border-b border-slate-100 px-6 py-5 text-sm text-slate-700"
            >
              <div>
                <p className="font-medium text-slate-900">
                  {license.zaaknaam ?? "Naam onbekend"}
                </p>
                <p className="text-xs text-slate-400">
                  {license.feature_id}
                </p>
              </div>
              <span>{license.zaak_categorie ?? "Pending"}</span>
              <span>{license.status_vergunning ?? "Unknown"}</span>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
