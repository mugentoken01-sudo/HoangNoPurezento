"use client";
const styles: Record<string, string> = {
  lead: "bg-zinc-100 text-zinc-700 border-zinc-200",
  contacted: "bg-sky-50 text-sky-700 border-sky-200",
  qualified: "bg-violet-50 text-violet-700 border-violet-200",
  meeting: "bg-amber-50 text-amber-700 border-amber-200",
  credit: "bg-orange-50 text-orange-700 border-orange-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  disbursed: "bg-teal-50 text-teal-700 border-teal-200",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  lost: "bg-red-50 text-red-600 border-red-200",
  won: "bg-emerald-50 text-emerald-800 border-emerald-300",
  todo: "bg-zinc-100 text-zinc-600 border-zinc-200",
  doing: "bg-sky-50 text-sky-700 border-sky-200",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
  manual: "bg-zinc-100 text-zinc-600 border-zinc-200",
  auto_template: "bg-orange-50 text-orange-700 border-orange-200",
};
export function Badge({ value, label }: { value: string; label?: string }) {
  const cls = styles[value] ?? "bg-zinc-100 text-zinc-600 border-zinc-200";
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>{label ?? value}</span>;
}
