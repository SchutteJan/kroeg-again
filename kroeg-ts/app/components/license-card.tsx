import { Link } from "react-router";

type LicenseCardProps = {
  license: {
    id: number;
    zaaknaam?: string | null;
    adres?: string | null;
    postcode?: string | null;
    zaak_categorie?: string | null;
    zaak_specificatie?: string | null;
    status_vergunning?: string | null;
    opening_hours?: any;
  };
  actionSlot?: React.ReactNode;
};

export function LicenseCard({ license, actionSlot }: LicenseCardProps) {
  return (
    <article className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-[0_24px_80px_-60px_rgba(15,23,42,0.6)]">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-lg font-semibold text-slate-900">
            {license.zaaknaam ?? "Naam onbekend"}
          </p>
          <p className="text-sm text-slate-500">
            {license.adres ?? "Adres onbekend"}
            {license.postcode ? ` · ${license.postcode}` : ""}
          </p>
        </div>
        {actionSlot ? <div>{actionSlot}</div> : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
        <span className="rounded-full bg-slate-100 px-3 py-1">
          {license.zaak_categorie ?? "Onbekend"}
        </span>
        {license.zaak_specificatie ? (
          <span className="rounded-full bg-slate-100 px-3 py-1">
            {license.zaak_specificatie}
          </span>
        ) : null}
        {license.status_vergunning ? (
          <span className="rounded-full bg-slate-100 px-3 py-1">
            {license.status_vergunning}
          </span>
        ) : null}
      </div>
      <div className="mt-4 text-sm text-slate-600">
        <p className="font-medium text-slate-700">Opening hours</p>
        <pre className="mt-2 whitespace-pre-wrap rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">
          {license.opening_hours
            ? JSON.stringify(license.opening_hours, null, 2)
            : "Geen openingstijden beschikbaar."}
        </pre>
      </div>
      <div className="mt-4">
        <Link
          to={`/admin/licenses#license-${license.id}`}
          className="text-sm font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4"
        >
          View license details
        </Link>
      </div>
    </article>
  );
}

