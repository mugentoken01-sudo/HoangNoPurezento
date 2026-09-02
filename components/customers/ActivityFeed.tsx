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
      <p className="text-xs text-[#576750] py-4 text-center">
        {t("customer_detail.feed_empty")}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((it) => {
        if (it.kind === "note") {
          const n = it.data as Note;
          return (
            <li
              key={`note-${n.id}`}
              className="rounded-xl border border-[#dfd8c8] bg-[#ffffff] p-4 shadow-2xs transition-colors"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#f2efe6] border border-[#d4ccb8] px-2.5 py-0.5 text-[10px] font-bold text-[#4a5944] uppercase font-mono">
                  {t("common.notes")}
                </span>
                <span className="text-xs text-[#7d8c76] font-mono">
                  {formatDateTime(n.created_at)}
                </span>
                {n.next_action_type && <Badge value={n.next_action_type} />}
                {n.next_action_date && (
                  <span className="text-xs font-semibold text-[#965a12] bg-[#fdf5e6] border border-[#f2dcba] rounded px-1.5 py-0.5 font-mono">
                    → {formatDate(n.next_action_date)}
                  </span>
                )}
              </div>
              <p className="mt-2.5 whitespace-pre-wrap text-xs leading-relaxed text-[#182615]">
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
              className="flex gap-3 rounded-xl border border-[#dfd8c8] bg-[#ffffff] p-4 shadow-2xs"
            >
              <span
                className={`mt-0.5 h-4 w-4 shrink-0 rounded border flex items-center justify-center text-[10px] font-bold ${
                  tk.status === "done"
                    ? "bg-[#265e2b] border-[#265e2b] text-[#faf8f2]"
                    : "border-[#dfd8c8] bg-[#ffffff]"
                }`}
                aria-hidden="true"
              >
                {tk.status === "done" ? "✓" : ""}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-xs font-semibold ${
                      tk.status === "done" ? "line-through text-[#7d8c76]" : "text-[#182615]"
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
                <div className="mt-1.5 text-[11px] text-[#7d8c76] font-mono">
                  {formatDateTime(tk.created_at)}
                  {tk.due_date ? ` · ${t("customer_detail.task_due_date")}: ${formatDate(tk.due_date)}` : ""}
                </div>
              </div>
            </li>
          );
        }

        const h = it.data as PipelineHistory;
        const fromName = h.from_stage ? dict.stages[h.from_stage] ?? h.from_stage : t("credit.feed_stage_initial");
        const toName = dict.stages[h.to_stage] ?? h.to_stage;

        return (
          <li
            key={`stage-${h.id}`}
            className="rounded-xl border border-[#dfd8c8] border-dashed bg-[#faf8f3]/60 px-4 py-3 text-xs text-[#576750]"
          >
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div>
                <span className="font-semibold text-[#2d3e29]">{t("credit.feed_stage_change")}:</span>{" "}
                <span className="font-mono text-[#576750]">{fromName}</span> →{" "}
                <strong className="text-[#182615] font-semibold">{toName}</strong>
              </div>
              <span className="text-[11px] text-[#7d8c76] font-mono">
                {formatDateTime(h.changed_at)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
