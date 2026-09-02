/* Hallmark · macrostructure: Workbench · theme: cobalt · path-skills: layout-and-space, color, typography, interaction-and-states, responsive */
"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Customer } from "@/lib/api-client";
import { PIPELINE_LABELS } from "@/lib/pipeline-stages";
import { timeInStage } from "@/lib/board-state";
import { Badge } from "@/components/ui/Badge";

export function PipelineCard({
  customer,
  pending,
  onMove,
  isOverlay,
}: {
  customer: Customer;
  pending: boolean;
  onMove: (to: string) => void;
  isOverlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: customer.id,
    disabled: pending,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging && !isOverlay ? 0.35 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-lg border bg-white p-3 text-left shadow-sm transition
        ${pending ? "opacity-60 pointer-events-none" : "hover:shadow-md hover:border-zinc-300"}
        ${isOverlay ? "shadow-lg rotate-[0.8deg] border-zinc-300" : ""}
        focus-within:ring-2 focus-within:ring-zinc-900/10`}
      role="article"
      aria-label={`${customer.company_name}, ${PIPELINE_LABELS[customer.stage as keyof typeof PIPELINE_LABELS] ?? customer.stage}`}
    >
      {pending && (
        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-[11px] font-medium text-amber-800" aria-live="polite">
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" /> moving…
        </span>
      )}
      {/* Drag handle — whole card is draggable, handle carries listeners for a11y */}
      <div className="flex items-start justify-between gap-2">
        <a href={`/customers/${customer.id}`} className="min-w-0 flex-1">
          <div className="pr-6 text-sm font-semibold leading-tight line-clamp-2 hover:underline">{customer.company_name}</div>
          <div className="mt-1 text-xs text-zinc-500">{customer.industry ?? "—"} · <Badge value={customer.stage} /></div>
          {(customer.credit_need_amount != null || customer.credit_need_type) && (
            <div className="mt-1.5 text-xs text-zinc-600">
              Need: {[customer.credit_need_type, customer.credit_need_amount != null ? `${Number(customer.credit_need_amount).toLocaleString("vi-VN")} VND` : null].filter(Boolean).join(" · ")}
            </div>
          )}
          <div className="mt-2 flex items-center gap-2 text-[11px] text-zinc-400">
            <span>{timeInStage(customer)} in stage</span>
            <span aria-hidden>·</span>
            <span className="truncate">{customer.status}</span>
          </div>
        </a>
        <button
          type="button"
          aria-label={`Drag ${customer.company_name}`}
          className="shrink-0 rounded-md border bg-zinc-50 px-1.5 py-1 text-[11px] text-zinc-500 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 disabled:opacity-50"
          {...attributes}
          {...listeners}
          disabled={pending}
        >
          ⋮⋮
        </button>
      </div>

      {/* Keyboard / button alternative — always visible, not hover-only */}
      <div className="mt-2 flex items-center gap-1">
        <label className="sr-only" htmlFor={`move-${customer.id}`}>Move {customer.company_name} to stage</label>
        <select
          id={`move-${customer.id}`}
          aria-label={`Move ${customer.company_name} to stage`}
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value;
            if (v) { onMove(v); e.currentTarget.value = ""; }
          }}
          disabled={pending}
          className="h-7 w-full rounded-md border bg-zinc-50 px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 disabled:opacity-50"
        >
          <option value="">Move to…</option>
          {Object.entries(PIPELINE_LABELS).map(([k, label]) => (
            <option key={k} value={k} disabled={k === customer.stage}>{label}{k === customer.stage ? " (current)" : ""}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
