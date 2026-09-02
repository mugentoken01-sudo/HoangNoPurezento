// RM Cockpit Module 3 — Phase 4: Board reducer / state machine unit tests
// Covers: reducer transitions, no-op, duplicate guard, rollback, hydration, grouping, idempotency

import { describe, it, expect } from "vitest";
import {
  boardReducer,
  createInitialBoardState,
  customersByStage,
  timeInStage,
} from "@/lib/board-state";
import { PIPELINE_STAGES } from "@/lib/pipeline-stages";
import type { Customer } from "@/lib/api-client";

function cust(overrides: Partial<Customer> = {}): Customer {
  return {
    id: "c1",
    owner_id: "u1",
    company_name: "Công ty ABC",
    industry: "Phân phối",
    revenue_reported: 80_000_000_000,
    credit_need_type: "VLĐ",
    credit_need_amount: 5_000_000_000,
    credit_need_purpose: "Bổ sung vốn lưu động",
    current_banks: ["BIDV"],
    stage: "lead",
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  } as Customer;
}

describe("boardReducer", () => {
  it("HYDRATE replaces customers and resets pending", () => {
    const s = { ...createInitialBoardState(), pending: new Map([["c1", { from: "lead", to: "credit" } as never]]) };
    const next = boardReducer(s, { type: "HYDRATE", customers: [cust()] });
    expect(next.customers).toHaveLength(1);
    expect(next.pending.size).toBe(0);
    expect(next.status).toBe("idle");
  });

  it("DRAG_END no-op when same stage does not create history", () => {
    const s = { ...createInitialBoardState(), customers: [cust({ stage: "lead" })] };
    const next = boardReducer(s, { type: "DRAG_END", id: "c1", overStage: "lead" });
    expect(next.pending.size).toBe(0);
    expect(next.customers[0].stage).toBe("lead");
  });

  it("DRAG_END to new stage is optimistic and marks pending", () => {
    const s = { ...createInitialBoardState(), customers: [cust({ stage: "lead" })] };
    const next = boardReducer(s, { type: "DRAG_END", id: "c1", overStage: "credit" });
    expect(next.status).toBe("pendingTransition");
    expect(next.customers[0].stage).toBe("credit");
    expect(next.pending.get("c1")).toEqual({ from: "lead", to: "credit" });
  });

  it("MOVE_REQUEST duplicate pending is ignored (idempotency guard)", () => {
    const s = {
      ...createInitialBoardState(),
      customers: [cust({ stage: "lead" })],
      pending: new Map([["c1", { from: "lead", to: "credit" } as never]]),
      status: "pendingTransition" as const,
    };
    const next = boardReducer(s, { type: "MOVE_REQUEST", id: "c1", to: "credit" });
    expect(next).toBe(s); // same reference = ignored
  });

  it("TRANSITION_SUCCESS clears pending, keeps stage", () => {
    const s = {
      ...createInitialBoardState(),
      customers: [cust({ stage: "credit" })],
      pending: new Map([["c1", { from: "lead", to: "credit" } as never]]),
      status: "pendingTransition" as const,
    };
    const next = boardReducer(s, { type: "TRANSITION_SUCCESS", id: "c1", to: "credit", tasksCreated: 4 });
    expect(next.pending.size).toBe(0);
    expect(next.customers[0].stage).toBe("credit");
  });

  it("TRANSITION_FAILURE rolls back to original stage", () => {
    const s = {
      ...createInitialBoardState(),
      customers: [cust({ id: "c1", stage: "credit" })],
      pending: new Map([["c1", { from: "lead", to: "credit" } as never]]),
      status: "pendingTransition" as const,
    };
    const next = boardReducer(s, { type: "TRANSITION_FAILURE", id: "c1", error: "Network error", rollbackTo: "lead" });
    expect(next.customers[0].stage).toBe("lead");
    expect(next.pending.size).toBe(0);
    expect(next.lastError).toBe("Network error");
  });

  it("DISMISS_ERROR clears error and returns to idle when no pending", () => {
    const s = { ...createInitialBoardState(), lastError: "boom", status: "rollbackRequired" as const };
    const next = boardReducer(s, { type: "DISMISS_ERROR" });
    expect(next.lastError).toBeNull();
    expect(next.status).toBe("idle");
  });

  it("TRANSITION_PENDING is ignored if already pending (stale response guard)", () => {
    const s = {
      ...createInitialBoardState(),
      pending: new Map([["c1", { from: "lead", to: "credit" } as never]]),
      status: "pendingTransition" as const,
      customers: [cust({ stage: "credit" })],
    };
    const next = boardReducer(s, { type: "TRANSITION_PENDING", id: "c1", from: "lead", to: "credit" });
    expect(next).toBe(s);
  });
});

describe("customersByStage", () => {
  it("groups into seven fixed columns in required order, including empty", () => {
    const customers = [cust({ id: "a", stage: "lead" }), cust({ id: "b", stage: "credit" }), cust({ id: "c", stage: "disbursed" })];
    const grouped = customersByStage(customers);
    expect(Object.keys(grouped)).toEqual([...PIPELINE_STAGES]);
    expect(grouped.lead).toHaveLength(1);
    expect(grouped.contacted).toHaveLength(0);
    expect(grouped.credit).toHaveLength(1);
    expect(grouped.disbursed).toHaveLength(1);
  });
});

describe("timeInStage", () => {
  it("returns today for updated_at == now", () => {
    const c = cust({ updated_at: new Date().toISOString() });
    expect(timeInStage(c)).toBe("today");
  });
  it("returns N days", () => {
    const d = new Date(Date.now() - 3 * 86400000).toISOString();
    expect(timeInStage(cust({ updated_at: d }))).toBe("3 days");
  });
});

describe("PIPELINE_STAGES contract", () => {
  it("is exactly seven in fixed order", () => {
    expect(PIPELINE_STAGES).toEqual(["lead","contacted","qualified","meeting","credit","approved","disbursed"]);
  });
});

describe("feed merge ordering (lib/feed.ts)", () => {
  it("interleaves three sources newest-first (smoke)", async () => {
    const { mergeFeed } = await import("@/lib/feed");
    const now = Date.now();
    const notes = [{ id: "n1", customer_id: "c1", owner_id: "u1", content: "hello", next_action_type: null, next_action_date: null, created_at: new Date(now - 1000).toISOString(), updated_at: new Date(now - 1000).toISOString() } as never];
    const tasks = [{ id: "t1", customer_id: "c1", owner_id: "u1", title: "task", due_date: null, status: "todo", source: "manual", created_at: new Date(now).toISOString(), updated_at: new Date(now).toISOString() } as never];
    const history = [{ id: "h1", customer_id: "c1", owner_id: "u1", from_stage: "lead", to_stage: "meeting", changed_at: new Date(now - 500).toISOString(), created_at: new Date(now - 500).toISOString() } as never];
    const merged = mergeFeed(notes, tasks, history);
    expect(merged[0].kind).toBe("task"); // newest
    expect(merged[1].kind).toBe("stage");
    expect(merged[2].kind).toBe("note");
  });
});
