"use client";
import { mergeFeed } from "@/lib/feed";
import type { Note, Task, PipelineHistory } from "@/lib/api-client";
import { Badge } from "@/components/ui/Badge";

function fmt(iso: string) {
  try { return new Date(iso).toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" }); } catch { return iso; }
}

export function ActivityFeed({ notes, tasks, history }: { notes: Note[]; tasks: Task[]; history: PipelineHistory[] }) {
  const items = mergeFeed(notes, tasks, history);
  if (items.length === 0) return <p className="text-sm text-zinc-500">No activity yet — add a note, create a task, or change stage to see the timeline.</p>;

  return (
    <ul className="space-y-2">
      {items.map((it) => {
        if (it.kind === "note") {
          const n = it.data as Note;
          return (
            <li key={`note-${n.id}`} className="rounded-lg border bg-white px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-violet-100 border border-violet-200 px-2 py-0.5 text-[11px] font-medium text-violet-700">Note</span>
                <span className="text-xs text-zinc-400">{fmt(n.created_at)}</span>
                {n.next_action_type && <Badge value={n.next_action_type} />}
                {n.next_action_date && <span className="text-xs text-amber-700">→ {n.next_action_date}</span>}
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">{n.content}</p>
            </li>
          );
        }
        if (it.kind === "task") {
          const t = it.data as Task;
          return (
            <li key={`task-${t.id}`} className="flex gap-2 rounded-lg border bg-white px-3 py-2.5">
              <span className={`mt-0.5 h-4 w-4 shrink-0 rounded border flex items-center justify-center text-[10px] ${t.status === "done" ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white"}`}>
                {t.status === "done" ? "✓" : ""}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-sm ${t.status === "done" ? "line-through text-zinc-400" : ""}`}>{t.title}</span>
                  <Badge value={t.source} label={t.source === "auto_template" ? "auto" : "manual"} />
                  <Badge value={t.status} />
                </div>
                <div className="text-xs text-zinc-400">{fmt(t.created_at)}{t.due_date ? ` · due ${t.due_date}` : ""}</div>
              </div>
            </li>
          );
        }
        const h = it.data as PipelineHistory;
        return (
          <li key={`stage-${h.id}`} className="rounded-lg border border-dashed bg-zinc-50 px-3 py-2">
            <span className="text-xs font-medium text-zinc-600">Stage changed</span>{" "}
            <span className="text-xs text-zinc-500">{h.from_stage ?? "∅"} → <strong className="text-zinc-700">{h.to_stage}</strong></span>
            <span className="ml-2 text-xs text-zinc-400">{fmt(h.changed_at)}</span>
          </li>
        );
      })}
    </ul>
  );
}
