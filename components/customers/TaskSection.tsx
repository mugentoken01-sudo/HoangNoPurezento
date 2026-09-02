"use client";
import { useState } from "react";
import { createTask, patchTask, removeTask, type Task } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Input, FormField, Select } from "@/components/ui/FormField";
import { Badge } from "@/components/ui/Badge";

export function TaskSection({ customerId, tasks, onReload }: { customerId: string; tasks: Task[]; onReload: () => void }) {
  const [title, setTitle] = useState("");
  const [due_date, setDue] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setErr("Title is required"); return; }
    setSubmitting(true); setErr(null);
    try {
      await createTask({ customer_id: customerId, title: title.trim(), due_date: due_date || null, status: "todo", source: "manual" });
      setTitle(""); setDue(""); onReload();
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : (ex as { error?: string })?.error ?? "Failed");
    } finally { setSubmitting(false); }
  }

  async function onStatusChange(t: Task, next: string) {
    setUpdatingId(t.id);
    // optimistic: call API then reload — no full page reload required
    try {
      await patchTask(t.id, { status: next });
      onReload();
    } catch (ex: unknown) {
      alert((ex as { error?: string })?.error ?? "Update failed");
    } finally { setUpdatingId(null); }
  }

  async function onDelete(t: Task) {
    if (!confirm(`Delete task "${t.title}"?`)) return;
    try { await removeTask(t.id); onReload(); } catch (ex: unknown) { alert((ex as { error?: string })?.error ?? "Delete failed"); }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Tasks</h3>

      <form onSubmit={onCreate} className="flex flex-wrap items-end gap-2 rounded-lg border bg-white p-3">
        <FormField label="New manual task" required>
          <Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Follow up call…" className="w-64" />
        </FormField>
        <FormField label="Due date">
          <Input type="date" value={due_date} onChange={e=>setDue(e.target.value)} />
        </FormField>
        <Button type="submit" size="sm" disabled={submitting}>{submitting ? "…" : "+ Add"}</Button>
        {err && <span className="text-xs text-red-600">{err}</span>}
      </form>

      {tasks.length === 0 && <p className="text-sm text-zinc-500">No tasks yet. Create one manually or change stage to <code className="rounded bg-zinc-100 px-1 py-0.5">credit</code> to auto-generate 4.</p>}

      <ul className="space-y-2">
        {tasks.map(t => (
          <li key={t.id} className="flex items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className={`h-4 w-4 shrink-0 rounded border flex items-center justify-center text-[10px] ${t.status === "done" ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white"}`}>
                {t.status === "done" ? "✓" : ""}
              </span>
              <span className={`text-sm truncate ${t.status === "done" ? "line-through text-zinc-400" : ""}`}>{t.title}</span>
              <Badge value={t.source} label={t.source === "auto_template" ? "auto" : "manual"} />
              {t.due_date && <span className="text-xs text-zinc-400">due {t.due_date}</span>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <select
                value={t.status}
                onChange={e=>onStatusChange(t, e.target.value)}
                disabled={updatingId === t.id}
                className="rounded-md border px-2 py-1 text-xs bg-white disabled:opacity-50"
              >
                <option value="todo">todo</option>
                <option value="doing">doing</option>
                <option value="done">done</option>
              </select>
              <button onClick={()=>onDelete(t)} className="rounded-md border px-2 py-1 text-xs text-red-600 hover:bg-red-50">Delete</button>
            </div>
          </li>
        ))}
      </ul>

      {tasks.some(t=>t.source==="auto_template") && (
        <p className="text-[11px] text-zinc-400"><span className="rounded-full bg-orange-50 border border-orange-200 px-1.5 py-0.5 text-orange-700">auto</span> = system-generated on stage → credit (idempotent — re-entering credit creates 0 extra).</p>
      )}
    </div>
  );
}
