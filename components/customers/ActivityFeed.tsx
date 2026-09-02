"use client";
import { mergeFeed } from "@/lib/feed";
import type { Note, Task, PipelineHistory } from "@/lib/api-client";
import { Badge } from "@/components/ui/Badge";
import { useI18n } from "@/lib/i18n";

export function ActivityFeed({
  notes,
  tasks,
  history,
}: {
  notes: Note[];
  tasks: Task[];
  history: PipelineHistory[];
}) {
  const { t, formatDateTime, formatDate, dict } = useI18n();
  const items = mergeFeed(notes, tasks, history);

  if (items.length === 0) {
    return (
      <p className="text-xs text-slate-500 py-4 text-center">
        {t("customer_detail.feed_empty")}
      </p>
    );
  }

  return (
    <ul className="space-y-2.5">
      {items.map((it) => {
        if (it.kind === "note") {
          const n = it.data as Note;
          return (
            <li
              key={`note-${n.id}`}
              className="rounded-lg border border-slate-200/90 bg-white p-3.5 shadow-2xs transition-colors"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 uppercase">
                  {t("common.notes")}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {formatDateTime(n.created_at)}
                </span>
                {n.next_action_type && <Badge value={n.next_action_type} />}
                {n.next_action_date && (
                  <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                    → {formatDate(n.next_action_date)}
                  </span>
                )}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-800">
                {n.content}
              </p>
            </li>
          );
        }

        if (it.kind === "task") {
          const tk = it.data as Task;
          return (
            <li
              key={`task-${tk.id}`}
              className="flex gap-2.5 rounded-lg border border-slate-200/90 bg-white p-3.5 shadow-2xs"
            >
              <span
                className={`mt-0.5 h-4 w-4 shrink-0 rounded border flex items-center justify-center text-[10px] font-bold ${
                  tk.status === "done"
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "border-slate-300 bg-white"
                }`}
              >
                {tk.status === "done" ? "✓" : ""}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-xs font-semibold ${
                      tk.status === "done" ? "line-through text-slate-400" : "text-slate-900"
                    }`}
                  >
                    {tk.title}
                  </span>
                  <Badge
                    value={tk.source}
                    label={tk.source === "auto_template" ? "Auto" : "Manual"}
                    showDot={false}
                  />
                  <Badge value={tk.status} />
                </div>
                <div className="mt-1 text-[11px] text-slate-400 font-mono">
                  {formatDateTime(tk.created_at)}
                  {tk.due_date ? ` · Hạn: ${formatDate(tk.due_date)}` : ""}
                </div>
              </div>
            </li>
          );
        }

        const h = it.data as PipelineHistory;
        const fromName = h.from_stage ? dict.stages[h.from_stage] ?? h.from_stage : "Khởi tạo";
        const toName = dict.stages[h.to_stage] ?? h.to_stage;

        return (
          <li
            key={`stage-${h.id}`}
            className="rounded-lg border border-slate-200 border-dashed bg-slate-50/70 px-3.5 py-2.5 text-xs text-slate-600"
          >
            <div className="flex flex-wrap items-center justify-between gap-1">
              <div>
                <span className="font-semibold text-slate-700">Chuyển giai đoạn:</span>{" "}
                <span className="font-mono text-slate-500">{fromName}</span> →{" "}
                <strong className="text-slate-900 font-semibold">{toName}</strong>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {formatDateTime(h.changed_at)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
