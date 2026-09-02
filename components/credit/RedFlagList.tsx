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
      <p className="text-xs text-[#576750] py-4 text-center">
        {t("credit.no_red_flags")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-[#2d3e29]">{t("credit.period")}:</label>
        <select
          value={periodFilter}
          onChange={(e) => onFilterChange(e.target.value)}
          aria-label="Lọc theo niên độ báo cáo"
          className="rounded-lg border border-[#dfd8c8] bg-[#ffffff] px-3 py-1 text-xs text-[#182615] font-medium focus:border-[#265e2b] focus:outline-none"
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
            type="button"
            onClick={() => onFilterChange("")}
            className="text-xs font-semibold text-[#265e2b] hover:text-[#1d4821] hover:underline ml-2 cursor-pointer"
          >
            {t("customers.clear_filters")}
          </button>
        )}
      </div>

      <ul className="space-y-3">
        {filtered.map((f) => (
          <li
            key={f.id}
            className={`rounded-xl border p-4 transition-all shadow-2xs ${
              f.severity === "high"
                ? "border-[#f0c7be] bg-[#faedea]/70"
                : f.severity === "medium"
                ? "border-[#f2dcba] bg-[#fdf5e6]/70"
                : "border-[#dfd8c8] bg-[#ffffff]"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge value={f.severity} />
              <span className="rounded-full bg-[#f2efe6] border border-[#d4ccb8] px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#4a5944]">
                {f.rule_triggered}
              </span>
              <span className="rounded-full bg-[#f7f4ed] border border-[#dfd8c8] px-2.5 py-0.5 text-[10px] font-semibold text-[#576750]">
                {f.source === "manual" ? t("credit.source_manual") : t("credit.source_rule_engine")}
              </span>
              {f.period && (
                <span className="text-xs font-bold text-[#182615] font-mono">
                  {f.period}
                </span>
              )}
            </div>

            <p className="mt-2.5 text-xs leading-relaxed text-[#182615] font-medium">
              {f.description}
            </p>

            <p className="mt-1.5 text-[11px] text-[#7d8c76] font-mono">
              {formatDateTime(f.created_at)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
