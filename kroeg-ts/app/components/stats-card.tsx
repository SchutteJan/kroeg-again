import type { ReactNode } from "react";

type StatsCardProps = {
  title: string;
  value: ReactNode;
  caption?: string;
  tone?: "amber" | "sky" | "emerald" | "rose" | "violet" | "slate";
};

const toneStyles: Record<NonNullable<StatsCardProps["tone"]>, string> = {
  amber: "from-amber-200/60 via-amber-100/40 to-white",
  sky: "from-sky-200/60 via-sky-100/40 to-white",
  emerald: "from-emerald-200/60 via-emerald-100/40 to-white",
  rose: "from-rose-200/60 via-rose-100/40 to-white",
  violet: "from-violet-200/60 via-violet-100/40 to-white",
  slate: "from-slate-200/60 via-slate-100/40 to-white",
};

export function StatsCard({ title, value, caption, tone = "slate" }: StatsCardProps) {
  return (
    <div
      className={`rounded-3xl border border-white/60 bg-gradient-to-br ${toneStyles[tone]} p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.4)]`}
    >
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
        {title}
      </p>
      <p className="mt-4 text-3xl font-semibold text-slate-900">{value}</p>
      {caption ? (
        <p className="mt-3 text-sm text-slate-600">{caption}</p>
      ) : null}
    </div>
  );
}

