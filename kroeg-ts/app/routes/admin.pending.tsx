import type { Route } from "./+types/admin.pending";
import { Form, Link, redirect } from "react-router";

import { LicenseCard } from "../components/license-card";
import { labelSet, locationLabels } from "../lib/labels";
import type { LocationLabel } from "../lib/labels";
import { getPendingVerifications, verifyLocation } from "../lib/queries.server";

export async function loader() {
  const items = await getPendingVerifications();
  return { items };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const locationId = Number(formData.get("location_id"));
  const intent = String(formData.get("intent") ?? "");
  if (!Number.isFinite(locationId)) {
    throw new Response("Invalid location id", { status: 400 });
  }

  if (intent === "approve") {
    await verifyLocation({ locationId, approved: true });
    return redirect("/admin/pending");
  }

  const overrideLabelRaw =
    formData.get("override_label")?.toString() ?? null;
  if (overrideLabelRaw && !labelSet.has(overrideLabelRaw)) {
    throw new Response("Invalid label override", { status: 400 });
  }
  const overrideLabel = overrideLabelRaw
    ? (overrideLabelRaw as LocationLabel)
    : null;
  const overrideName = formData.get("override_name")?.toString() ?? null;
  const overrideReasoning =
    formData.get("override_reasoning")?.toString() ?? null;

  await verifyLocation({
    locationId,
    approved: false,
    overrideLabel,
    overrideName,
    overrideReasoning,
  });
  return redirect("/admin/pending");
}

export default function PendingAdmin({ loaderData }: Route.ComponentProps) {
  const { items } = loaderData;
  return (
    <main className="min-h-screen bg-sand px-6 pb-16 pt-12 md:px-12">
      <header className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Pending verifications
          </p>
          <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">
            Review AI decisions before publishing.
          </h1>
        </div>
        <Link
          to="/admin"
          className="text-sm font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4"
        >
          Back to dashboard
        </Link>
      </header>
      <section className="mx-auto mt-10 max-w-6xl space-y-6">
        {items.length === 0 ? (
          <div className="rounded-[32px] border border-white/70 bg-white/70 p-8 text-sm text-slate-500">
            No pending decisions right now.
          </div>
        ) : (
          items.map((item: any) => (
            <div
              key={`${item.location_id}-${item.decision_id}`}
              className="grid gap-6 rounded-[32px] border border-white/70 bg-white/70 p-8 shadow-[0_30px_110px_-90px_rgba(15,23,42,0.6)] lg:grid-cols-[1.1fr_0.9fr]"
            >
              <LicenseCard license={item.license} />
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                    AI decision
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {item.ai_decision?.sanitized_name ??
                      item.location?.name ??
                      "Untitled"}
                  </p>
                  <p className="text-sm text-slate-600">
                    Label: {item.ai_decision?.label ?? item.location?.label}
                  </p>
                  <p className="mt-3 text-sm text-slate-500">
                    {item.ai_decision?.reasoning ?? "No reasoning provided."}
                  </p>
                </div>
                <Form method="post" className="space-y-4">
                  <input
                    type="hidden"
                    name="location_id"
                    value={item.location_id}
                  />
                  <button
                    type="submit"
                    name="intent"
                    value="approve"
                    className="w-full rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5"
                  >
                    Approve & publish
                  </button>
                  <div className="rounded-3xl border border-slate-200/70 bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                      Override
                    </p>
                    <div className="mt-3 space-y-3">
                      <input
                        name="override_name"
                        placeholder="Override name"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none"
                      />
                      <select
                        name="override_label"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none"
                      >
                        {locationLabels.map((label) => (
                          <option key={label.value} value={label.value}>
                            {label.label}
                          </option>
                        ))}
                      </select>
                      <textarea
                        name="override_reasoning"
                        rows={3}
                        placeholder="Why override?"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none"
                      />
                      <button
                        type="submit"
                        name="intent"
                        value="override"
                        className="w-full rounded-full border border-slate-300/70 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5"
                      >
                        Publish override
                      </button>
                    </div>
                  </div>
                </Form>
              </div>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
