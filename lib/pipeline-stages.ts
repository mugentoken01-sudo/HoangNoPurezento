// RM Cockpit — Module 3: canonical seven-stage pipeline
// FIXED order — do not reorder, do not make configurable at runtime.
// Matches DB enum pipeline_stage and serves as single source of truth for board + filters + validation.

export const PIPELINE_STAGES = [
  "lead",
  "contacted",
  "qualified",
  "meeting",
  "credit",
  "approved",
  "disbursed",
] as const;

export type PipelineStage = typeof PIPELINE_STAGES[number];

export const PIPELINE_LABELS: Record<PipelineStage, string> = {
  lead: "Lead",
  contacted: "Contacted",
  qualified: "Qualified",
  meeting: "Meeting",
  credit: "Credit",
  approved: "Approved",
  disbursed: "Disbursed",
};

export function isPipelineStage(v: string): v is PipelineStage {
  return (PIPELINE_STAGES as readonly string[]).includes(v);
}
