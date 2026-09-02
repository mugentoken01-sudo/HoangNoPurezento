"use client";
import { Badge } from "@/components/ui/Badge";
import type { RedFlag } from "@/lib/api-client";

const severityColor: Record<string, string> = {
  low: "bg-zinc-100 text-zinc-600 border-zinc-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-red-50 text-red-600 border-red-200",
};

export function RedFlagList({ flags, periodFilter, onFilterChange }: {
  flags: RedFlag[];
  periodFilter: string;
  onFilterChange: (v: string) => void;
}) {
  const periods = Array.from(new Set(flags.map(f => f.period).filter(Boolean))).sort();
  const filtered = periodFilter ? flags.filter(f => f.period === periodFilter) : flags;

  if (!flags.length) return <p className="text-sm text-zinc-500">No red flags — ratios look clean for the loaded periods.</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-xs text-zinc-500">Filter period</label>
        <select value={periodFilter} onChange={e => onFilterChange(e.target.value)} className="rounded-md border px-2 py-1 text-xs bg-white">
          <option value="">All periods</option>
          {periods.map(p => <option key={p} value={p!}>{p}</option>)}
        </select>
        {periodFilter && <button onClick={() => onFilterChange("")} className="text-xs text-zinc-500 underline">Clear</button>}
      </div>
      <ul className="space-y-2">
        {filtered.map(f => (
          <li key={f.id} className="rounded-lg border bg-white px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${severityColor[f.severity] ?? severityColor.medium}`}>
                {f.severity}
              </span>
              <span className="rounded-full bg-zinc-100 border px-2 py-0.5 text-xs font-mono">{f.rule_triggered}</span>
              <span className={`rounded-full border px-2 py-0.5 text-xs ${f.source === "manual" ? "bg-violet-50 text-violet-700 border-violet-200" : "bg-sky-50 text-sky-700 border-sky-200"}`}>
                {f.source}
              </span>
              {f.period && <span className="text-xs text-zinc-500">{f.period}</span>}
            </div>
            <p className="mt-1.5 text-sm leading-relaxed">{f.description}</p>
            <p className="mt-1 text-[11px] text-zinc-400">{new Date(f.created_at).toLocaleString("vi-VN")}</p>
          </li>
        ))}
      </ul>
      {filtered.length === 0 && periodFilter && <p className="text-xs text-zinc-400">No flags for period {periodFilter}.</p>}
    </div>
  );
}
