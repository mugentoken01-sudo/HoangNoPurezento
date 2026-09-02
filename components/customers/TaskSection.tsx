"use client";
import { useState } from "react";
import { createTask, patchTask, removeTask, type Task } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Input, FormField } from "@/components/ui/FormField";
import { Badge } from "@/components/ui/Badge";
import { useI18n } from "@/lib/i18n";

export function TaskSection({
  customerId,
  tasks,
  onReload,
}: {
  customerId: string;
  tasks: Task[];
  onReload: () => void;
}) {
  const { t, formatDate } = useI18n();
  const [title, setTitle] = useState("");
  const [due_date, setDue] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setErr(t("customer_detail.task_title") + " is required");
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      await createTask({
        customer_id: customerId,
        title: title.trim(),
        due_date: due_date || null,
        status: "todo",
        source: "manual",
      });
      setTitle("");
      setDue("");
      onReload();
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : (ex as { error?: string })?.error ?? t("common.error"));
    } finally {
      setSubmitting(false);
    }
  }

  async function onStatusChange(tk: Task, next: string) {
    setUpdatingId(tk.id);
    try {
      await patchTask(tk.id, { status: next });
      onReload();
    } catch (ex: unknown) {
      alert((ex as { error?: string })?.error ?? t("common.error"));
    } finally {
      setUpdatingId(null);
    }
  }

  async function onDelete(tk: Task) {
    if (!confirm(`${t("common.confirm_delete")} "${tk.title}"?`)) return;
    try {
      await removeTask(tk.id);
      onReload();
    } catch (ex: unknown) {
      alert((ex as { error?: string })?.error ?? t("common.error"));
    }
  }

  return (
    <div className="space-y-3.5">
      <h3 className="text-sm font-bold text-slate-900 tracking-tight">
        {t("customer_detail.tasks_title")}
      </h3>

      <form onSubmit={onCreate} className="flex flex-wrap items-end gap-2.5 rounded-lg border border-slate-200/80 bg-slate-50/50 p-3.5">
        <div className="flex-1 min-w-[200px]">
          <FormField label={t("customer_detail.add_task")} required>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Thu thập BCTC 3 năm gần nhất…"
              className="bg-white"
            />
          </FormField>
        </div>
        <div className="w-36">
          <FormField label={t("customer_detail.task_due_date")}>
            <Input
              type="date"
              value={due_date}
              onChange={(e) => setDue(e.target.value)}
              className="bg-white"
            />
          </FormField>
        </div>
        <Button type="submit" size="sm" disabled={submitting} className="h-9 text-xs font-semibold">
          {submitting ? "…" : t("common.add")}
        </Button>
      </form>

      {err && (
        <p className="rounded-md bg-red-50 border border-red-200 p-2 text-xs font-medium text-red-700">
          {err}
        </p>
      )}

      {tasks.length === 0 && (
        <p className="text-xs text-slate-500 py-3">{t("customer_detail.tasks_empty")}</p>
      )}

      <ul className="space-y-2">
        {tasks.map((tk) => (
          <li
            key={tk.id}
            className={`flex items-center justify-between gap-2.5 rounded-lg border p-3 transition-colors ${
              tk.status === "done" ? "border-slate-200 bg-slate-50/70" : "border-slate-200/90 bg-white"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onStatusChange(tk, tk.status === "done" ? "todo" : "done")}
                disabled={updatingId === tk.id}
                className={`h-4 w-4 shrink-0 rounded border flex items-center justify-center text-[10px] font-bold transition-all ${
                  tk.status === "done"
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "border-slate-300 bg-white hover:border-slate-500"
                }`}
                title="Toggle status"
              >
                {tk.status === "done" ? "✓" : ""}
              </button>

              <span
                className={`text-xs font-medium truncate ${
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

              {tk.due_date && (
                <span className="text-[11px] text-slate-500 font-mono hidden sm:inline-block">
                  · {formatDate(tk.due_date)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <select
                value={tk.status}
                onChange={(e) => onStatusChange(tk, e.target.value)}
                disabled={updatingId === tk.id}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 focus:border-blue-600 focus:outline-none"
              >
                <option value="todo">Todo</option>
                <option value="doing">Doing</option>
                <option value="done">Done</option>
              </select>
              <button
                onClick={() => onDelete(tk)}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 hover:border-red-200 transition"
              >
                {t("common.delete")}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
