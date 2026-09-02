"use client";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Customer } from "@/lib/api-client";
import { type PipelineStage } from "@/lib/pipeline-stages";
import { PipelineCard } from "./PipelineCard";
import { useI18n } from "@/lib/i18n";

export function PipelineColumn({
  stage,
  customers,
  pendingIds,
  onMove,
}: {
  stage: PipelineStage;
  customers: Customer[];
  pendingIds: Set<string>;
  onMove: (customerId: string, to: PipelineStage) => void;
}) {
  const { dict, t } = useI18n();
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const label = dict.stages[stage] ?? stage;

  return (
    <div
      ref={setNodeRef}
      role="region"
      aria-label={`${label} column, ${customers.length} customers`}
      className={`flex min-h-[420px] flex-col rounded-xl border transition-all duration-150 ${
        isOver
          ? "border-blue-500 bg-blue-50/20 ring-2 ring-blue-500/20"
          : "border-slate-200/90 bg-slate-50/50"
      }`}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-3.5 py-2.5 backdrop-blur rounded-t-xl">
        <h2 className="text-xs font-bold tracking-tight text-slate-900 uppercase truncate" title={label}>
          {label}
        </h2>
        <span
          aria-label={`${customers.length} in ${label}`}
          className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-bold tabular-nums text-slate-700"
        >
          {customers.length}
        </span>
      </div>

      <SortableContext id={stage} items={customers.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2 p-2">
          {customers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white/60 px-3 py-8 text-center">
              <p className="text-xs font-semibold text-slate-400">{t("pipeline.empty_column")}</p>
              <p className="mt-1 text-[11px] text-slate-400">{t("pipeline.move_to")}</p>
            </div>
          ) : (
            customers.map((c) => (
              <PipelineCard
                key={c.id}
                customer={c}
                pending={pendingIds.has(c.id)}
                onMove={(to) => onMove(c.id, to as PipelineStage)}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}
