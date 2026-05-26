import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: "teal" | "amber" | "red" | "green";
}

const toneClasses = {
  teal: "border-teal-200 bg-teal-50 text-teal-800",
  amber: "border-amber-200 bg-amber-50 text-amber-900",
  red: "border-red-200 bg-red-50 text-red-900",
  green: "border-emerald-200 bg-emerald-50 text-emerald-900",
};

export function MetricCard({ label, value, detail, icon: Icon, tone = "teal" }: MetricCardProps) {
  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-normal text-stone-950">{value}</p>
        </div>
        <span className={`rounded-md border p-2 ${toneClasses[tone]}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-sm leading-5 text-stone-600">{detail}</p>
    </article>
  );
}
