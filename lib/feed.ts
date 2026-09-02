// RM Cockpit — Module 2: unified activity feed merge (consumed by profile page + reusable for M4 cross-customer feed)
// Merges Notes + Tasks + PipelineStageHistory by timestamp, newest first. Distinct kind for rendering.
// Extracted as pure function so M3 Kanban and M4 Dashboard can reuse without duplicating sort logic.

import type { Note, Task, PipelineHistory } from "./api-client";

export type FeedItem =
  | { kind: "note"; ts: string; data: Note }
  | { kind: "task"; ts: string; data: Task }
  | { kind: "stage"; ts: string; data: PipelineHistory };

export function mergeFeed(notes: Note[], tasks: Task[], history: PipelineHistory[]): FeedItem[] {
  const items: FeedItem[] = [
    ...notes.map((n) => ({ kind: "note" as const, ts: n.created_at, data: n })),
    ...tasks.map((t) => ({ kind: "task" as const, ts: t.created_at, data: t })),
    ...history.map((h) => ({ kind: "stage" as const, ts: h.changed_at ?? h.created_at, data: h })),
  ];
  items.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  return items;
}
