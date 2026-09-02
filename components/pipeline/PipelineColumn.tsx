/* Hallmark · Workbench · Cobalt — pipeline column (specimen discipline: grid, hairlines, mono labels) */
"use client";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Customer } from "@/lib/api-client";
import { PIPELINE_LABELS, type PipelineStage } from "@/lib/pipeline-stages";
import { PipelineCard } from "./PipelineCard";

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
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const label = PIPELINE_LABELS[stage];

  return (
    <div
      ref={setNodeRef}
      role="region"
      aria-label={`${label} column, ${customers.length} customers`}
      className={`flex min-h-[320px] flex-col rounded-xl border bg-zinc-50/60 ${isOver ? "border-zinc-900 bg-zinc-900/[0.04] ring-1 ring-zinc-900/10" : "border-zinc-200"}`}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-white/80 px-3 py-2.5 backdrop-blur">
        <h2 className="text-xs font-semibold tracking-wide text-zinc-900">{label}</h2>
        <span
          aria-label={`${customers.length} in ${label}`}
          className="rounded-full border bg-white px-2 py-0.5 text-xs font-medium tabular-nums text-zinc-600"
        >
          {customers.length}
        </span>
      </div>

      <SortableContext id={stage} items={customers.map(c => c.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2 p-2">
          {customers.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-white px-3 py-6 text-center">
              <p className="text-xs text-zinc-400">Empty</p>
              <p className="mt-1 text-[11px] text-zinc-400">Drag a card here or use Move to…</p>
            </div>
          ) : (
            customers.map(c => (
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
