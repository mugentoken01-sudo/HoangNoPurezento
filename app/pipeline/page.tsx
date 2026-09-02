"use client";
import { PipelineBoard } from "@/components/pipeline/PipelineBoard";
import { useI18n } from "@/lib/i18n";
import { PIPELINE_STAGES } from "@/lib/pipeline-stages";

export default function PipelinePage() {
  const { t, dict } = useI18n();

  return (
    <div className="space-y-6">
      {/* Hallmark Header Banner */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-[10px] font-bold tracking-wider text-slate-700 uppercase">
              {t("pipeline.badge")}
            </span>
            <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {t("pipeline.title")}
            </h1>
            <p className="mt-1.5 max-w-3xl text-xs sm:text-sm leading-relaxed text-slate-600">
              {t("pipeline.subtitle")}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
            {t("pipeline.live_indicator")}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-4 text-xs">
          {PIPELINE_STAGES.map((s) => (
            <span
              key={s}
              className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 font-mono"
            >
              {dict.stages[s] ?? s}
            </span>
          ))}
          <span className="text-slate-400 self-center text-[11px] pl-1">
            — {t("pipeline.stages_order_note")}
          </span>
        </div>
      </div>

      <PipelineBoard />
    </div>
  );
}
