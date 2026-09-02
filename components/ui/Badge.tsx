"use client";
import { useI18n } from "@/lib/i18n";

const styles: Record<string, { bg: string; dot: string }> = {
  lead: { bg: "bg-[#f2efe6] text-[#4a5944] border-[#d4ccb8]", dot: "bg-[#7d8c76]" },
  contacted: { bg: "bg-[#eaf1e8] text-[#245b29] border-[#c4d9c2]", dot: "bg-[#387e3f]" },
  qualified: { bg: "bg-[#f3ecf7] text-[#5f3378] border-[#dac5e6]", dot: "bg-[#7d489b]" },
  meeting: { bg: "bg-[#fdf5e6] text-[#965a12] border-[#f2dcba]", dot: "bg-[#b8731d]" },
  credit: { bg: "bg-[#faedea] text-[#a13d28] border-[#f0c7be]", dot: "bg-[#b84b34]" },
  approved: { bg: "bg-[#eaf5eb] text-[#1b6325] border-[#bde0c1]", dot: "bg-[#288536]" },
  disbursed: { bg: "bg-[#e6f3eb] text-[#135223] border-[#b3dac0]", dot: "bg-[#1e6f32]" },
  active: { bg: "bg-[#eaf5eb] text-[#1b6325] border-[#bde0c1]", dot: "bg-[#288536]" },
  inactive: { bg: "bg-[#f0ebe0] text-[#576750] border-[#dfd8c8]", dot: "bg-[#7d8c76]" },
  lost: { bg: "bg-[#faedea] text-[#a13d28] border-[#f0c7be]", dot: "bg-[#b84b34]" },
  won: { bg: "bg-[#eaf5eb] text-[#135223] border-[#bde0c1]", dot: "bg-[#1e6f32]" },
  todo: { bg: "bg-[#f0ebe0] text-[#576750] border-[#dfd8c8]", dot: "bg-[#7d8c76]" },
  doing: { bg: "bg-[#eaf1e8] text-[#245b29] border-[#c4d9c2]", dot: "bg-[#387e3f]" },
  done: { bg: "bg-[#eaf5eb] text-[#1b6325] border-[#bde0c1]", dot: "bg-[#288536]" },
  manual: { bg: "bg-[#f0ebe0] text-[#576750] border-[#dfd8c8]", dot: "bg-[#7d8c76]" },
  auto_template: { bg: "bg-[#fdf5e6] text-[#965a12] border-[#f2dcba]", dot: "bg-[#b8731d]" },
  high: { bg: "bg-[#faedea] text-[#a13d28] border-[#f0c7be]", dot: "bg-[#b84b34]" },
  medium: { bg: "bg-[#fdf5e6] text-[#965a12] border-[#f2dcba]", dot: "bg-[#b8731d]" },
  low: { bg: "bg-[#eaf1e8] text-[#245b29] border-[#c4d9c2]", dot: "bg-[#387e3f]" },
};

export function Badge({ value, label, showDot = true }: { value: string; label?: string; showDot?: boolean }) {
  const { t, dict } = useI18n();
  const theme = styles[value] ?? { bg: "bg-[#f0ebe0] text-[#576750] border-[#dfd8c8]", dot: "bg-[#7d8c76]" };

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
