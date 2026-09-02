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
import { PIPELINE_STAGES, type PipelineStage } from "@/lib/pipeline-stages";
import { boardReducer, createInitialBoardState, customersByStage } from "@/lib/board-state";
import { PipelineColumn } from "./PipelineColumn";
import { PipelineCard } from "./PipelineCard";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n";

export function PipelineBoard() {
  const { t, dict } = useI18n();
  const [state, dispatch] = useReducer(boardReducer, null, createInitialBoardState);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; kind: "success" | "error" | "info" } | null>(null);
  const [announce, setAnnounce] = useState("");
  const pendingRef = useRef<Set<string>>(new Set());

  const grouped = useMemo(() => customersByStage(state.customers), [state.customers]);
  const pendingIds = useMemo(() => new Set(state.pending.keys()), [state.pending]);
  const activeCustomer = useMemo(
    () => (state.activeId ? state.customers.find((c) => c.id === state.activeId) ?? null : null),
    [state.activeId, state.customers]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await listCustomers();
      dispatch({ type: "HYDRATE", customers: data });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : (e as { error?: string })?.error ?? t("common.error");
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    pendingRef.current = pendingIds;
  }, [pendingIds]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const doTransition = useCallback(
    async (customerId: string, to: PipelineStage) => {
      const cust = state.customers.find((c) => c.id === customerId);
      if (!cust) return;
      const from = cust.stage as PipelineStage;
      if (from === to) return;
      if (pendingRef.current.has(customerId)) {
        setToast({ message: t("pipeline.transition_in_progress"), kind: "info" });
        return;
      }
      const rollbackTo = from;
      dispatch({ type: "TRANSITION_PENDING", id: customerId, from, to });
      const localizedTo = dict.stages[to] ?? to;
      setAnnounce(`Moving ${cust.company_name} to ${localizedTo}`);

      try {
        const res = await changeStage(customerId, to);
        if (!res.ok) {
          const msg = (res.json as { error?: string }).error ?? "Transition failed";
          throw new Error(msg);
        }
        const j = res.json as { noop?: boolean; tasks_created?: number; data?: Customer };
        if (j.noop) {
          dispatch({ type: "TRANSITION_FAILURE", id: customerId, error: "Already in stage", rollbackTo });
          if (j.data) {
            dispatch({
              type: "HYDRATE",
              customers: state.customers.map((c) => (c.id === customerId ? (j.data as Customer) : c)),
            });
          }
          setToast({ message: t("pipeline.already_in_stage"), kind: "info" });
          return;
        }

        const tasksCreated = j.tasks_created ?? 0;
        dispatch({ type: "TRANSITION_SUCCESS", id: customerId, to, tasksCreated });

        if (j.data) {
          dispatch({
            type: "HYDRATE",
            customers: state.customers.map((c) => (c.id === customerId ? (j.data as Customer) : c)),
          });
        } else {
          const fresh = await listCustomers();
          dispatch({ type: "HYDRATE", customers: fresh });
        }

        if (to === "credit" && tasksCreated > 0) {
          setToast({
            message: `Chuyển sang Thẩm định tín dụng — Đã tự động tạo ${tasksCreated} checklist nhiệm vụ`,
            kind: "success",
          });
        } else {
          setToast({
            message: t("pipeline.transition_success", { name: cust.company_name, stage: localizedTo }),
            kind: "success",
          });
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : (e as { error?: string })?.error ?? "Transition failed";
        dispatch({ type: "TRANSITION_FAILURE", id: customerId, error: msg, rollbackTo });
        setToast({
          message: t("pipeline.transition_failed", { error: msg }),
          kind: "error",
        });
      }
    },
    [state.customers, dict.stages, t]
  );

  const handleDragStart = useCallback(
    (e: DragStartEvent) => {
      dispatch({ type: "DRAG_START", id: String(e.active.id) });
      const c = state.customers.find((x) => x.id === String(e.active.id));
      if (c) setAnnounce(`Picked up ${c.company_name}`);
    },
    [state.customers]
  );

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      const activeId = String(e.active.id);
      const overId = e.over ? String(e.over.id) : null;
      let overStage: PipelineStage | null = null;
      if (overId && (PIPELINE_STAGES as readonly string[]).includes(overId)) {
        overStage = overId as PipelineStage;
      } else if (overId) {
        const overCustomer = state.customers.find((c) => c.id === overId);
        if (overCustomer) overStage = overCustomer.stage as PipelineStage;
      }
      const activeCustomer = state.customers.find((c) => c.id === activeId);
      if (!activeCustomer || !overStage || activeCustomer.stage === overStage) {
        dispatch({ type: "DRAG_END", id: activeId, overStage: null });
        return;
      }
      dispatch({ type: "DRAG_END", id: activeId, overStage });
      queueMicrotask(() => doTransition(activeId, overStage!));
    },
    [state.customers, doTransition]
  );

  const handleDragCancel = useCallback(() => {
    dispatch({ type: "DRAG_CANCEL" });
    setAnnounce("Drag cancelled");
  }, []);

  if (loading) {
    return (
      <Card>
        <CardBody className="py-12 text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-900 border-r-transparent" />
          <p className="mt-2 text-xs font-medium text-slate-500">{t("common.loading")}</p>
        </CardBody>
      </Card>
    );
  }

  if (err) {
    return (
      <Card>
        <CardBody className="border-l-4 border-red-500 bg-red-50/50 p-6">
          <p className="text-sm font-semibold text-red-700">{err}</p>
          <Button variant="secondary" size="sm" className="mt-3 text-xs" onClick={fetchAll}>
            {t("common.retry")}
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announce}
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-lg border p-3 text-xs font-semibold shadow-xs flex items-center justify-between ${
            toast.kind === "success"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : toast.kind === "error"
              ? "border-red-300 bg-red-50 text-red-800"
              : "border-slate-300 bg-slate-50 text-slate-800"
          }`}
        >
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="overflow-x-auto pb-4" style={{ scrollbarWidth: "thin" }}>
          <div className="flex gap-3.5" style={{ minWidth: "max-content" }}>
            {PIPELINE_STAGES.map((stage) => (
              <div key={stage} className="w-[280px] shrink-0 sm:w-[310px]">
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
          {activeCustomer ? (
            <PipelineCard customer={activeCustomer} pending={false} onMove={() => {}} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
