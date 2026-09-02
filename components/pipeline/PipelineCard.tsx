"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Customer } from "@/lib/api-client";
import { PIPELINE_STAGES, type PipelineStage } from "@/lib/pipeline-stages";
import { timeInStage } from "@/lib/board-state";
import { Badge } from "@/components/ui/Badge";
import { useI18n } from "@/lib/i18n";

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
  const { t, formatCurrency, dict } = useI18n();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: customer.id,
    disabled: pending,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging && !isOverlay ? 0.35 : undefined,
  };

  const localizedCurrentStage = dict.stages[customer.stage] ?? customer.stage;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-lg border border-slate-200/90 bg-white p-3.5 text-left shadow-2xs transition-all duration-150 ${
        pending ? "opacity-60 pointer-events-none" : "hover:border-slate-300 hover:shadow-xs"
      } ${isOverlay ? "shadow-lg rotate-[0.8deg] border-blue-400 bg-white" : ""} focus-within:ring-2 focus-within:ring-blue-600/20`}
      role="article"
      aria-label={`${customer.company_name}, ${localizedCurrentStage}`}
    >
      {pending && (
        <span
          className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-900"
          aria-live="polite"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />{" "}
          {t("pipeline.transition_in_progress")}
        </span>
      )}

      <div className="flex items-start justify-between gap-2">
        <a href={`/customers/${customer.id}`} className="min-w-0 flex-1">
          <div className="pr-6 text-sm font-bold text-slate-900 leading-tight line-clamp-2 hover:text-blue-600 hover:underline">
            {customer.company_name}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            {customer.industry && <span>{customer.industry}</span>}
            <Badge value={customer.stage} />
          </div>

          {(customer.credit_need_amount != null || customer.credit_need_type) && (
            <div className="mt-1.5 text-xs font-semibold text-slate-700">
              {[
                customer.credit_need_type,
                customer.credit_need_amount != null ? formatCurrency(customer.credit_need_amount) : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
          )}

          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
            <span>{timeInStage(customer)} in stage</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{customer.status}</span>
          </div>
        </a>

        <button
          type="button"
          aria-label={`Drag ${customer.company_name}`}
          className="shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-1 text-[11px] text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50 cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
          disabled={pending}
        >
          ⋮⋮
        </button>
      </div>

      <div className="mt-2.5 flex items-center gap-1 pt-2 border-t border-slate-100">
        <label className="sr-only" htmlFor={`move-${customer.id}`}>
          {t("pipeline.move_to")}
        </label>
        <select
          id={`move-${customer.id}`}
          aria-label={`Move ${customer.company_name} to stage`}
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value;
            if (v) {
              onMove(v);
              e.currentTarget.value = "";
            }
          }}
          disabled={pending}
          className="h-7 w-full rounded border border-slate-200 bg-slate-50/70 px-2 text-[11px] font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 disabled:opacity-50"
        >
          <option value="">{t("pipeline.move_to")}</option>
          {PIPELINE_STAGES.map((s) => (
            <option key={s} value={s} disabled={s === customer.stage}>
              {dict.stages[s] ?? s}
              {s === customer.stage ? " (Hiện tại)" : ""}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
