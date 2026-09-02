"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Customer } from "@/lib/api-client";
import { PIPELINE_STAGES } from "@/lib/pipeline-stages";
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
      className={`group relative rounded-xl border border-[#dfd8c8] bg-[#ffffff] p-4 text-left shadow-2xs transition-all duration-200 ${
        pending ? "opacity-60 pointer-events-none" : "hover:border-[#bcc6b1] hover:shadow-[0_8px_20px_-10px_rgba(24,38,21,0.1)]"
      } ${isOverlay ? "shadow-xl rotate-[1.2deg] border-[#265e2b] bg-[#ffffff]" : ""} focus-within:ring-2 focus-within:ring-[#265e2b]/20`}
      role="article"
      aria-label={`${customer.company_name}, ${localizedCurrentStage}`}
    >
      {pending && (
        <span
          className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-[#fdf5e6] border border-[#f2dcba] px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#965a12]"
          aria-live="polite"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#b8731d]" />{" "}
          {t("pipeline.transition_in_progress")}
        </span>
      )}

      <div className="flex items-start justify-between gap-2">
        <a href={`/customers/${customer.id}`} className="min-w-0 flex-1">
          <div className="pr-6 text-sm font-serif font-bold text-[#182615] leading-snug line-clamp-2 hover:text-[#265e2b] hover:underline">
            {customer.company_name}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-[#576750]">
            {customer.industry && <span className="font-medium text-[#41503b]">{customer.industry}</span>}
            <Badge value={customer.stage} />
          </div>

          {(customer.credit_need_amount != null || customer.credit_need_type) && (
            <div className="mt-2 text-xs font-semibold text-[#182615] font-serif">
              {[
                customer.credit_need_type,
                customer.credit_need_amount != null ? formatCurrency(customer.credit_need_amount) : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
          )}

          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-[#7d8c76] font-mono">
            <span>{timeInStage(customer)} in stage</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{customer.status}</span>
          </div>
        </a>

        <button
          type="button"
          aria-label={`Drag ${customer.company_name}`}
          className="shrink-0 rounded-lg border border-[#dfd8c8] bg-[#f7f4ed] px-2 py-1 text-[11px] text-[#576750] hover:bg-[#eee8db] hover:text-[#182615] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#265e2b] disabled:opacity-50 cursor-grab active:cursor-grabbing font-mono"
          {...attributes}
          {...listeners}
          disabled={pending}
        >
          ⋮⋮
        </button>
      </div>

      <div className="mt-3 flex items-center gap-1 pt-2.5 border-t border-[#eee8db]">
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
          className="h-7 w-full rounded-lg border border-[#dfd8c8] bg-[#f7f4ed]/80 px-2.5 text-[11px] font-semibold text-[#2d3e29] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#265e2b] disabled:opacity-50"
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
