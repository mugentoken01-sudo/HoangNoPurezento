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
      className={`flex min-h-[440px] flex-col rounded-2xl border transition-all duration-200 ${
        isOver
          ? "border-[#265e2b] bg-[#eaf1e8]/40 ring-2 ring-[#265e2b]/20"
          : "border-[#dfd8c8] bg-[#faf8f3]/60"
      }`}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-[#dfd8c8] bg-[#f7f4ed]/95 px-4 py-3 backdrop-blur-md rounded-t-2xl">
        <h2 className="text-xs font-serif font-bold tracking-tight text-[#182615] uppercase truncate" title={label}>
          {label}
        </h2>
        <span
          aria-label={`${customers.length} in ${label}`}
          className="inline-flex items-center rounded-full border border-[#d4ccb8] bg-[#ffffff] px-2.5 py-0.5 text-[11px] font-mono font-bold tabular-nums text-[#2d3e29]"
        >
          {customers.length}
        </span>
      </div>

      <SortableContext id={stage} items={customers.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2.5 p-2.5">
          {customers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#dfd8c8] bg-[#ffffff]/50 px-3 py-10 text-center">
              <p className="text-xs font-semibold text-[#7d8c76]">{t("pipeline.empty_column")}</p>
              <p className="mt-1 text-[11px] text-[#7d8c76]">{t("pipeline.move_to")}</p>
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
