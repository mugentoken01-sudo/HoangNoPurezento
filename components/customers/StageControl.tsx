"use client";
import { useState } from "react";
import { changeStage } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/FormField";
import { Toast } from "@/components/ui/Toast";
import { PIPELINE_STAGES, type PipelineStage } from "@/lib/pipeline-stages";
import { useI18n } from "@/lib/i18n";

export function StageControl({
  customerId,
  currentStage,
  onChanged,
}: {
  customerId: string;
  currentStage: string;
  onChanged: () => void;
}) {
  const { t, dict } = useI18n();
  const [next, setNext] = useState<string>(currentStage);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; kind: "success" | "error" | "info" } | null>(null);

  async function onConfirm() {
    if (next === currentStage) {
      setToast({ message: t("pipeline.already_in_stage"), kind: "info" });
      return;
    }
    const localizedNext = dict.stages[next] ?? next;
    if (!confirm(`Chuyển giai đoạn: ${dict.stages[currentStage] ?? currentStage} → ${localizedNext}?`)) return;
    setLoading(true);
    try {
      const res = await changeStage(customerId, next);
      if (!res.ok) throw new Error((res.json as { error?: string }).error ?? "Stage change failed");
      const tasksCreated = (res.json as { tasks_created?: number }).tasks_created ?? 0;
      if (tasksCreated > 0) {
        setToast({ message: `Chuyển sang ${localizedNext} ✓ — Đã tạo ${tasksCreated} checklist nhiệm vụ`, kind: "success" });
      } else {
        setToast({ message: `Chuyển sang ${localizedNext} ✓`, kind: "success" });
      }
      onChanged();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : (e as { error?: string })?.error ?? "Failed";
      setToast({ message: msg, kind: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-[#576750]">{t("common.stage")}:</span>
      <Select
        value={next}
        onChange={(e) => setNext(e.target.value)}
        className="w-40 h-8 text-xs py-1 font-medium bg-[#ffffff]"
        aria-label="Chọn giai đoạn chuyển đổi"
      >
        {PIPELINE_STAGES.map((s) => (
          <option key={s} value={s}>
            {dict.stages[s] ?? s}
          </option>
        ))}
      </Select>
      <Button
        size="sm"
        onClick={onConfirm}
        disabled={loading || next === currentStage}
        className="h-8 text-xs font-semibold cursor-pointer"
      >
        {loading ? "…" : t("common.save")}
      </Button>
      {toast && <Toast message={toast.message} kind={toast.kind} onDismiss={() => setToast(null)} />}
    </div>
  );
}

