"use client";
import { PipelineBoard } from "@/components/pipeline/PipelineBoard";
import { useI18n } from "@/lib/i18n";
import { PIPELINE_STAGES } from "@/lib/pipeline-stages";

export default function PipelinePage() {
  const { t, dict } = useI18n();

  return (
    <div className="space-y-6">
      {/* Hallmark Garden Header Banner */}
      <div className="rounded-2xl border border-[#dfd8c8] bg-[#ffffff] p-6 sm:p-7 shadow-[0_10px_30px_-15px_rgba(24,38,21,0.08),0_1px_3px_rgba(24,38,21,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f2efe6] border border-[#d4ccb8] px-3 py-0.5 text-[10px] font-mono font-bold tracking-wider text-[#4a5944] uppercase">
              🌿 {t("pipeline.badge")}
            </span>
            <h1 className="mt-2 text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#182615]">
              {t("pipeline.title")}
            </h1>
            <p className="mt-1.5 max-w-3xl text-xs sm:text-sm leading-relaxed text-[#576750]">
              {t("pipeline.subtitle")}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-[#1b6325] bg-[#eaf5eb] border border-[#bde0c1] rounded-full px-3.5 py-1">
            <span className="h-2 w-2 rounded-full bg-[#288536] animate-pulse" aria-hidden="true" />
            {t("pipeline.live_indicator")}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#eee8db] pt-4 text-xs">
          {PIPELINE_STAGES.map((s) => (
            <span
              key={s}
              className="rounded-full border border-[#dfd8c8] bg-[#f7f4ed] px-3 py-0.5 text-[11px] font-medium text-[#2d3e29] font-mono"
            >
              {dict.stages[s] ?? s}
            </span>
          ))}
          <span className="text-[#7d8c76] self-center text-[11px] pl-1 font-mono">
            — {t("pipeline.stages_order_note")}
          </span>
        </div>
      </div>

      <PipelineBoard />
    </div>
  );
}
