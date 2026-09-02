"use client";
import { useI18n } from "@/lib/i18n";

const styles: Record<string, { bg: string; dot: string }> = {
  lead: { bg: "bg-slate-50 text-slate-700 border-slate-200", dot: "bg-slate-400" },
  contacted: { bg: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  qualified: { bg: "bg-purple-50 text-purple-700 border-purple-200", dot: "bg-purple-500" },
  meeting: { bg: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  credit: { bg: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
  approved: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  disbursed: { bg: "bg-teal-50 text-teal-700 border-teal-200", dot: "bg-teal-500" },
  active: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  inactive: { bg: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" },
  lost: { bg: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
  won: { bg: "bg-emerald-50 text-emerald-800 border-emerald-300", dot: "bg-emerald-600" },
  todo: { bg: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400" },
  doing: { bg: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-500" },
  done: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  manual: { bg: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400" },
  auto_template: { bg: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  high: { bg: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
  medium: { bg: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  low: { bg: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
};

export function Badge({ value, label, showDot = true }: { value: string; label?: string; showDot?: boolean }) {
  const { t, dict } = useI18n();
  const theme = styles[value] ?? { bg: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400" };
  
  // Auto localized label if label is not explicitly provided
  let displayLabel = label;
  if (!displayLabel) {
    if (dict.stages[value]) displayLabel = dict.stages[value];
    else if (dict.action_types[value]) displayLabel = dict.action_types[value];
    else if (value === "active") displayLabel = t("customers.form_status_active");
    else if (value === "inactive") displayLabel = t("customers.form_status_inactive");
    else if (value === "todo") displayLabel = "Todo";
    else if (value === "doing") displayLabel = "Doing";
    else if (value === "done") displayLabel = "Done";
    else if (value === "auto_template") displayLabel = "Auto Checklist";
    else if (value === "manual") displayLabel = "RM Manual";
    else if (value === "high") displayLabel = t("credit.severity_high");
    else if (value === "medium") displayLabel = t("credit.severity_medium");
    else if (value === "low") displayLabel = t("credit.severity_low");
    else displayLabel = value;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-tight ${theme.bg}`}>
      {showDot && <span className={`h-1.5 w-1.5 rounded-full ${theme.dot}`} aria-hidden="true" />}
      {displayLabel}
    </span>
  );
}
