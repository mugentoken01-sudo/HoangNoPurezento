/* Hallmark · Workbench · Cobalt — Kanban board (state machine + dnd-kit + a11y live region + optimistic rollback) */
"use client";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { listCustomers, changeStage, type Customer } from "@/lib/api-client";
import { PIPELINE_STAGES, type PipelineStage, PIPELINE_LABELS } from "@/lib/pipeline-stages";
import { boardReducer, createInitialBoardState, customersByStage } from "@/lib/board-state";
import { PipelineColumn } from "./PipelineColumn";
import { PipelineCard } from "./PipelineCard";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function PipelineBoard() {
  const [state, dispatch] = useReducer(boardReducer, null, createInitialBoardState);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; kind: "success" | "error" | "info" } | null>(null);
  const [announce, setAnnounce] = useState("");
  const pendingRef = useRef<Set<string>>(new Set());

  const grouped = useMemo(() => customersByStage(state.customers), [state.customers]);
  const pendingIds = useMemo(() => new Set(state.pending.keys()), [state.pending]);
  const activeCustomer = useMemo(
    () => (state.activeId ? state.customers.find(c => c.id === state.activeId) ?? null : null),
    [state.activeId, state.customers]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchAll = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const data = await listCustomers();
      dispatch({ type: "HYDRATE", customers: data });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : (e as { error?: string })?.error ?? "Failed to load pipeline";
      setErr(msg);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { pendingRef.current = pendingIds; }, [pendingIds]);

  // Keep toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const doTransition = useCallback(async (customerId: string, to: PipelineStage) => {
    const cust = state.customers.find(c => c.id === customerId);
    if (!cust) return;
    const from = cust.stage as PipelineStage;
    if (from === to) return;
    if (pendingRef.current.has(customerId)) {
      setToast({ message: "Transition already in progress — please wait.", kind: "info" });
      return;
    }
    const rollbackTo = from;
    dispatch({ type: "TRANSITION_PENDING", id: customerId, from, to });
    setAnnounce(`Moving ${cust.company_name} from ${PIPELINE_LABELS[from]} to ${PIPELINE_LABELS[to]}`);
    try {
      const res = await changeStage(customerId, to);
      if (!res.ok) {
        const msg = (res.json as { error?: string }).error ?? "Transition failed";
        throw new Error(msg);
      }
      const j = res.json as { noop?: boolean; tasks_created?: number; data?: Customer };
      if (j.noop) {
        dispatch({ type: "TRANSITION_FAILURE", id: customerId, error: "Already in stage", rollbackTo });
        // Re-sync from server canonical customer
        if (j.data) dispatch({ type: "HYDRATE", customers: state.customers.map(c => c.id === customerId ? (j.data as Customer) : c) });
        setToast({ message: "Already in stage — no change.", kind: "info" });
        setAnnounce(`No change for ${cust.company_name}, already in ${PIPELINE_LABELS[to]}`);
        return;
      }
      const tasksCreated = j.tasks_created ?? 0;
      dispatch({ type: "TRANSITION_SUCCESS", id: customerId, to, tasksCreated });
      // Reconcile canonical server state (updated_at, etc.)
      if (j.data) {
        dispatch({ type: "HYDRATE", customers: state.customers.map(c => c.id === customerId ? (j.data as Customer) : c) });
        // Re-derive grouped will pick up server stage (already optimistic, but this corrects updated_at)
      } else {
        // Fallback: refetch if server didn't return customer
        const fresh = await listCustomers();
        dispatch({ type: "HYDRATE", customers: fresh });
      }
      if (to === "credit" && tasksCreated > 0) setToast({ message: `Moved to Credit — ${tasksCreated} checklist tasks created`, kind: "success" });
      else if (to === "credit" && tasksCreated === 0) setToast({ message: "Moved to Credit — checklist already exists (idempotent)", kind: "info" });
      else setToast({ message: `Moved to ${PIPELINE_LABELS[to]}`, kind: "success" });
      setAnnounce(`Moved ${cust.company_name} to ${PIPELINE_LABELS[to]}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : (e as { error?: string })?.error ?? "Transition failed";
      dispatch({ type: "TRANSITION_FAILURE", id: customerId, error: msg, rollbackTo });
      setToast({ message: `Move failed — restored to ${PIPELINE_LABELS[rollbackTo]}: ${msg}`, kind: "error" });
      setAnnounce(`Failed to move ${cust.company_name}, restored to ${PIPELINE_LABELS[rollbackTo]}`);
    }
  }, [state.customers]);

  const handleDragStart = useCallback((e: DragStartEvent) => {
    dispatch({ type: "DRAG_START", id: String(e.active.id) });
    const c = state.customers.find(x => x.id === String(e.active.id));
    if (c) setAnnounce(`Picked up ${c.company_name} from ${PIPELINE_LABELS[c.stage as PipelineStage]}`);
  }, [state.customers]);

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    const activeId = String(e.active.id);
    // over can be a column id (stage) or a card id — resolve to stage by checking if over is a stage
    const overId = e.over ? String(e.over.id) : null;
    let overStage: PipelineStage | null = null;
    if (overId && (PIPELINE_STAGES as readonly string[]).includes(overId)) overStage = overId as PipelineStage;
    else if (overId) {
      const overCustomer = state.customers.find(c => c.id === overId);
      if (overCustomer) overStage = overCustomer.stage as PipelineStage;
    }
    const activeCustomer = state.customers.find(c => c.id === activeId);
    // Reducer does optimistic move; we then fire API
    if (!activeCustomer || !overStage || activeCustomer.stage === overStage) {
      dispatch({ type: "DRAG_END", id: activeId, overStage: null });
      return;
    }
    // Optimistic via reducer
    dispatch({ type: "DRAG_END", id: activeId, overStage });
    // Fire transition (already optimistically moved, but doTransition also handles pending check)
    // Use timeout to let reducer flush
    queueMicrotask(() => doTransition(activeId, overStage!));
  }, [state.customers, doTransition]);

  const handleDragCancel = useCallback(() => {
    dispatch({ type: "DRAG_CANCEL" });
    setAnnounce("Drag cancelled");
  }, []);

  if (loading) return <Card><CardBody><p className="text-sm text-zinc-500">Loading pipeline…</p></CardBody></Card>;
  if (err) return (
    <Card><CardBody>
      <p className="text-sm text-red-600">{err}</p>
      <Button variant="secondary" size="sm" className="mt-3" onClick={fetchAll}>Retry</Button>
    </CardBody></Card>
  );

  return (
    <div className="space-y-3">
      {/* Announcements for screen readers */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">{announce}</div>
      {state.lastError && (
        <div role="alert" className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <span>{state.lastError}</span>
          <Button variant="secondary" size="sm" onClick={() => dispatch({ type: "DISMISS_ERROR" })}>Dismiss</Button>
        </div>
      )}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-lg border px-3 py-2 text-sm ${toast.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : toast.kind === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-zinc-200 bg-zinc-50 text-zinc-700"}`}
        >
          {toast.message}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {/* Horizontal scroller — usable on narrow screens, no horizontal page scroll */}
        <div className="overflow-x-auto pb-2" style={{ scrollbarWidth: "thin" }}>
          <div className="flex gap-3" style={{ minWidth: "max-content" }}>
            {PIPELINE_STAGES.map(stage => (
              <div key={stage} className="w-[300px] shrink-0 sm:w-[320px]">
                <PipelineColumn
                  stage={stage}
                  customers={grouped[stage] ?? []}
                  pendingIds={pendingIds}
                  onMove={(id, to) => doTransition(id, to)}
                />
              </div>
            ))}
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeCustomer ? <PipelineCard customer={activeCustomer} pending={false} onMove={() => {}} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      <p className="text-[11px] text-zinc-400">
        Drag cards between columns or use <span className="rounded bg-zinc-100 px-1">Move to…</span> on each card (keyboard). Profile stage control is now a link to this board.
      </p>
    </div>
  );
}
