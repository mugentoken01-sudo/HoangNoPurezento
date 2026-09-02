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
      <h3 className="text-sm font-serif font-bold text-[#182615] tracking-tight">
        {t("customer_detail.tasks_title")}
      </h3>

      <form onSubmit={onCreate} className="flex flex-wrap items-end gap-2.5 rounded-xl border border-[#dfd8c8] bg-[#faf8f3]/80 p-4">
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
        <div className="w-full sm:w-36">
          <FormField label={t("customer_detail.task_due_date")}>
            <Input
              type="date"
              value={due_date}
              onChange={(e) => setDue(e.target.value)}
              className="bg-white"
            />
          </FormField>
        </div>
        <Button type="submit" size="sm" disabled={submitting} className="h-9 text-xs font-semibold cursor-pointer w-full sm:w-auto">
          {submitting ? "…" : t("common.add")}
        </Button>
      </form>

      {err && (
        <p role="alert" className="rounded-xl bg-[#faedea] border border-[#f0c7be] p-3 text-xs font-semibold text-[#a13d28]">
          {err}
        </p>
      )}

      {tasks.length === 0 && (
        <p className="text-xs text-[#576750] py-3">{t("customer_detail.tasks_empty")}</p>
      )}

      <ul className="space-y-2">
        {tasks.map((tk) => (
          <li
            key={tk.id}
            className={`flex items-center justify-between gap-2.5 rounded-xl border p-3.5 transition-colors ${
              tk.status === "done" ? "border-[#dfd8c8] bg-[#faf8f3]/60" : "border-[#dfd8c8] bg-[#ffffff] shadow-2xs"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onStatusChange(tk, tk.status === "done" ? "todo" : "done")}
                disabled={updatingId === tk.id}
                className={`h-4 w-4 shrink-0 rounded border flex items-center justify-center text-[10px] font-bold transition-all cursor-pointer ${
                  tk.status === "done"
                    ? "bg-[#265e2b] border-[#265e2b] text-[#faf8f2]"
                    : "border-[#dfd8c8] bg-[#ffffff] hover:border-[#265e2b]"
                }`}
                title="Toggle status"
                aria-label={`Toggle task status for ${tk.title}`}
              >
                {tk.status === "done" ? "✓" : ""}
              </button>

              <span
                className={`text-xs font-medium truncate ${
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

              {tk.due_date && (
                <span className="text-[11px] text-[#576750] font-mono hidden sm:inline-block">
                  · {formatDate(tk.due_date)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <select
                value={tk.status}
                onChange={(e) => onStatusChange(tk, e.target.value)}
                disabled={updatingId === tk.id}
                aria-label={`Change status for ${tk.title}`}
                className="rounded-lg border border-[#dfd8c8] bg-[#ffffff] px-2.5 py-1 text-xs font-medium text-[#182615] focus:border-[#265e2b] focus:outline-none"
              >
                <option value="todo">Todo</option>
                <option value="doing">Doing</option>
                <option value="done">Done</option>
              </select>
              <button
                type="button"
                onClick={() => onDelete(tk)}
                className="rounded-lg border border-[#dfd8c8] bg-[#ffffff] px-2.5 py-1 text-xs font-semibold text-[#a13d28] hover:bg-[#faedea] hover:border-[#f0c7be] transition cursor-pointer"
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
