/* Hallmark · macrostructure: Workbench · theme: cobalt · path-skills: layout-and-space, color, typography, interaction-and-states, responsive, slop-test */
import { PipelineBoard } from "@/components/pipeline/PipelineBoard";

export const metadata = { title: "Pipeline — RM Cockpit" };

export default function PipelinePage() {
  return (
    <div className="space-y-5">
      {/* Workbench header — small, functional, not shouting */}
      <div className="rounded-xl border bg-white px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium tracking-widest text-zinc-400">WORKBENCH · PIPELINE</p>
            <h1 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900">Seven stages, one board.</h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-500">
              Drag a card between columns or use <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs">Move to…</span> on any card.
              Every move is a single <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">POST /api/customers/[id]/stage</code> — atomic via
              <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs"> transition_customer_stage</code> RPC, idempotent on <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">credit</code>.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
            Live — RLS scoped to you
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
          {["lead","contacted","qualified","meeting","credit","approved","disbursed"].map(s => (
            <span key={s} className="rounded-full border bg-zinc-50 px-2 py-0.5 font-mono text-zinc-600">{s}</span>
          ))}
          <span className="text-zinc-400 self-center">— fixed order, not configurable</span>
        </div>
      </div>

      <PipelineBoard />

      <p className="text-center text-[11px] text-zinc-400">
        Canonical stage-change path is this board. The profile-page dropdown was removed in Module 3 to avoid conflicting UI state — profile now links here.
      </p>
    </div>
  );
}
