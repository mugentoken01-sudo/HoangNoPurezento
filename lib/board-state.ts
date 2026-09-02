// RM Cockpit Module 3 — Board state machine (Phase 2 contract, Phase 3 implementation)
// States: idle | dragging | pendingTransition | committed | rollbackRequired | error
// Single canonical source of truth for board + stage transitions.
// Used by PipelineBoard and covered by unit tests (Phase 4).

import type { Customer } from "./api-client";
import { PIPELINE_STAGES, type PipelineStage } from "./pipeline-stages";

export type BoardStatus = "idle" | "dragging" | "pendingTransition" | "committed" | "rollbackRequired" | "error";

export type BoardState = {
  status: BoardStatus;
  customers: Customer[];
  pending: Map<string, { from: PipelineStage; to: PipelineStage }>; // customerId -> transition
  lastError: string | null;
  activeId: string | null; // dnd-kit active id during drag
};

export type BoardAction =
  | { type: "HYDRATE"; customers: Customer[] }
  | { type: "DRAG_START"; id: string }
  | { type: "DRAG_END"; id: string; overStage: PipelineStage | null }
  | { type: "DRAG_CANCEL" }
  | { type: "MOVE_REQUEST"; id: string; to: PipelineStage } // keyboard/button alternative
  | { type: "TRANSITION_PENDING"; id: string; from: PipelineStage; to: PipelineStage }
  | { type: "TRANSITION_SUCCESS"; id: string; to: PipelineStage; tasksCreated: number }
  | { type: "TRANSITION_FAILURE"; id: string; error: string; rollbackTo: PipelineStage }
  | { type: "DISMISS_ERROR" };

export function createInitialBoardState(): BoardState {
  return { status: "idle", customers: [], pending: new Map(), lastError: null, activeId: null };
}

export function boardReducer(state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case "HYDRATE":
      return { ...state, customers: action.customers, status: "idle", pending: new Map(), activeId: null };
    case "DRAG_START":
      return { ...state, status: "dragging", activeId: action.id, lastError: null };
    case "DRAG_CANCEL":
      return { ...state, status: "idle", activeId: null };
    case "DRAG_END": {
      if (!action.overStage) return { ...state, status: "idle", activeId: null };
      // No-op if same stage — stays idle, no history/tasks
      const cust = state.customers.find(c => c.id === action.id);
      if (!cust || cust.stage === action.overStage) return { ...state, status: "idle", activeId: null };
      // Optimistic: move card immediately, mark pending (Integration Engineer handles API call)
      return {
        ...state,
        status: "pendingTransition",
        activeId: null,
        customers: state.customers.map(c => c.id === action.id ? { ...c, stage: action.overStage! } : c),
        pending: new Map(state.pending).set(action.id, { from: cust.stage as PipelineStage, to: action.overStage }),
      };
    }
    case "MOVE_REQUEST": {
      const cust = state.customers.find(c => c.id === action.id);
      if (!cust || cust.stage === action.to) return state;
      // Prevent duplicate pending
      if (state.pending.has(action.id)) return state;
      return {
        ...state,
        status: "pendingTransition",
        customers: state.customers.map(c => c.id === action.id ? { ...c, stage: action.to } : c),
        pending: new Map(state.pending).set(action.id, { from: cust.stage as PipelineStage, to: action.to }),
      };
    }
    case "TRANSITION_PENDING": {
      if (state.pending.has(action.id)) return state;
      return {
        ...state,
        status: "pendingTransition",
        customers: state.customers.map(c => c.id === action.id ? { ...c, stage: action.to } : c),
        pending: new Map(state.pending).set(action.id, { from: action.from, to: action.to }),
      };
    }
    case "TRANSITION_SUCCESS": {
      const nextPending = new Map(state.pending);
      nextPending.delete(action.id);
      return { ...state, status: nextPending.size ? "pendingTransition" : "committed", pending: nextPending, lastError: null };
    }
    case "TRANSITION_FAILURE": {
      const nextPending = new Map(state.pending);
      nextPending.delete(action.id);
      return {
        ...state,
        status: nextPending.size ? "pendingTransition" : "rollbackRequired",
        customers: state.customers.map(c => c.id === action.id ? { ...c, stage: action.rollbackTo } : c),
        pending: nextPending,
        lastError: action.error,
      };
    }
    case "DISMISS_ERROR":
      return { ...state, lastError: null, status: state.pending.size ? "pendingTransition" : "idle" };
    default:
      return state;
  }
}

// Helpers for view layer
export function customersByStage(customers: Customer[]): Record<PipelineStage, Customer[]> {
  const map = Object.fromEntries(PIPELINE_STAGES.map(s => [s, [] as Customer[]])) as Record<PipelineStage, Customer[]>;
  for (const c of customers) {
    const stage = (c.stage as PipelineStage) ?? "lead";
    if (map[stage]) map[stage].push(c);
    else map["lead"].push(c);
  }
  return map;
}

export function timeInStage(customer: Customer): string {
  // Best-effort from updated_at (stage history would be more precise, but this avoids extra fetch per card)
  const updated = new Date(customer.updated_at).getTime();
  const days = Math.floor((Date.now() - updated) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "1 day";
  return `${days} days`;
}
