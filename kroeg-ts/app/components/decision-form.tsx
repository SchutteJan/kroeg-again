import { Form } from "react-router";

import { locationLabels } from "../lib/labels";

type DecisionFormProps = {
  licenseId: number;
  defaultName?: string | null;
};

export function DecisionForm({ licenseId, defaultName }: DecisionFormProps) {
  return (
    <Form method="post" className="space-y-4">
      <input type="hidden" name="license_id" value={licenseId} />
      <div>
        <label className="text-xs uppercase tracking-[0.3em] text-slate-500">
          Sanitized name
        </label>
        <input
          name="sanitized_name"
          defaultValue={defaultName ?? ""}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none"
        />
      </div>
      <div>
        <label className="text-xs uppercase tracking-[0.3em] text-slate-500">
          Label
        </label>
        <select
          name="label"
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none"
        >
          {locationLabels.map((label) => (
            <option key={label.value} value={label.value}>
              {label.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs uppercase tracking-[0.3em] text-slate-500">
          Reasoning
        </label>
        <textarea
          name="reasoning"
          rows={4}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5"
      >
        Submit decision
      </button>
    </Form>
  );
}

