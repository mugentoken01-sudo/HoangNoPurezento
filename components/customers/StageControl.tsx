"use client";
import { useState } from "react";
import { changeStage } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/FormField";
import { Toast } from "@/components/ui/Toast";

const STAGES = ["lead","contacted","qualified","meeting","credit","approved","disbursed"] as const;

export function StageControl({ customerId, currentStage, onChanged }: { customerId: string; currentStage: string; onChanged: () => void }) {
  const [next, setNext] = useState<string>(currentStage);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; kind: "success"|"error"|"info" } | null>(null);

  async function onConfirm() {
    if (next === currentStage) { setToast({ message: "Already in stage — no change.", kind: "info" }); return; }
    if (!confirm(`Change stage: ${currentStage} → ${next}?`)) return;
    setLoading(true);
    try {
      const res = await changeStage(customerId, next);
      if (!res.ok) throw new Error((res.json as { error?: string }).error ?? "Stage change failed");
      const tasksCreated = (res.json as { tasks_created?: number }).tasks_created ?? 0;
      if (tasksCreated > 0) setToast({ message: `Stage → ${next} ✓  — ${tasksCreated} tasks created`, kind: "success" });
      else if (next === "credit" && tasksCreated === 0) setToast({ message: `Stage → ${next} — already in credit, 0 new tasks (idempotent)`, kind: "info" });
      else setToast({ message: `Stage → ${next} ✓`, kind: "success" });
      onChanged();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : (e as { error?: string })?.error ?? "Failed";
      setToast({ message: msg, kind: "error" });
    } finally { setLoading(false); }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-zinc-500">Stage</span>
      <Select value={next} onChange={e=>setNext(e.target.value)} className="w-36 h-8 text-xs">
        {STAGES.map(s=> <option key={s} value={s}>{s}</option>)}
      </Select>
      <Button size="sm" onClick={onConfirm} disabled={loading || next === currentStage}>
        {loading ? "…" : "Change"}
      </Button>
      <span className="text-[11px] text-zinc-400 hidden sm:inline">Stopgap — M3 replaces with Kanban drag-and-drop</span>
      {toast && <Toast message={toast.message} kind={toast.kind} onDismiss={()=>setToast(null)} />}
    </div>
  );
}
