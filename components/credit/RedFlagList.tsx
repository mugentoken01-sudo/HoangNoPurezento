"use client";
import type { RedFlag } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n";
import { Badge } from "@/components/ui/Badge";

export function RedFlagList({
  flags,
  periodFilter,
  onFilterChange,
}: {
  flags: RedFlag[];
  periodFilter: string;
  onFilterChange: (v: string) => void;
}) {
  const { t, formatDateTime } = useI18n();
  const periods = Array.from(new Set(flags.map((f) => f.period).filter(Boolean))).sort();
  const filtered = periodFilter ? flags.filter((f) => f.period === periodFilter) : flags;

  if (!flags.length) {
    return (
      <p className="text-xs text-slate-500 py-3 text-center">
        {t("credit.no_red_flags")}
      </p>
    );
  }

  return (
    <div className="space-y-3.5">
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-slate-700">{t("credit.period")}:</label>
        <select
          value={periodFilter}
          onChange={(e) => onFilterChange(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-800 font-medium focus:border-blue-600 focus:outline-none"
        >
          <option value="">{t("common.all")}</option>
          {periods.map((p) => (
            <option key={p} value={p!}>
              {p}
            </option>
          ))}
        </select>
        {periodFilter && (
          <button
            onClick={() => onFilterChange("")}
            className="text-xs font-medium text-slate-500 hover:text-slate-800 underline"
          >
            {t("customers.clear_filters")}
          </button>
        )}
      </div>

      <ul className="space-y-2.5">
        {filtered.map((f) => (
          <li
            key={f.id}
            className={`rounded-lg border p-3.5 transition-colors ${
              f.severity === "high"
                ? "border-red-200/90 bg-red-50/40"
                : f.severity === "medium"
                ? "border-amber-200/90 bg-amber-50/40"
                : "border-slate-200/90 bg-white"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge value={f.severity} />
              <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-mono text-slate-700">
                {f.rule_triggered}
              </span>
              <span className="rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                {f.source === "manual" ? t("credit.source_manual") : t("credit.source_rule_engine")}
              </span>
              {f.period && (
                <span className="text-xs font-bold text-slate-800 font-mono">
                  {f.period}
                </span>
              )}
            </div>

            <p className="mt-2 text-xs leading-relaxed text-slate-800 font-medium">
              {f.description}
            </p>

            <p className="mt-1.5 text-[11px] text-slate-400 font-mono">
              {formatDateTime(f.created_at)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
