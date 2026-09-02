import { json, error, requireUser, zodError } from "@/lib/api-helpers";
import { stageUpdateSchema } from "@/lib/validations";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { user, supabase, error: authErr } = await requireUser();
  if (!user) return error(authErr, 401);
  const body = await req.json().catch(() => null);
  if (!body) return error("Invalid JSON", 400);
  const parsed = stageUpdateSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);
  const toStage = parsed.data.to_stage as string;

  // Atomic transition via RPC — single transaction, idempotent, no race.
  // Falls back to legacy sequential logic if RPC not yet migrated (dev without 00003).
  const { data: rpc, error: rpcErr } = await supabase.rpc("transition_customer_stage", {
    p_customer_id: params.id,
    p_to_stage: toStage as never,
  });

  if (!rpcErr && rpc) {
    const r = rpc as { noop: boolean; from_stage: string | null; to_stage: string; history_id: string | null; tasks_created: number };
    if (r.noop) {
      const { data: customer } = await supabase.from("customers").select("*").eq("id", params.id).single();
      return json({ data: customer, history: null, tasks_created: 0, noop: true, message: "Already in stage" });
    }
    const { data: updated } = await supabase.from("customers").select("*").eq("id", params.id).single();
    const { data: hist } = r.history_id
      ? await supabase.from("pipeline_stage_history").select("*").eq("id", r.history_id).single()
      : { data: null } as { data: null };
    return json({ data: updated, history: hist, tasks_created: r.tasks_created, noop: false });
  }

  // ── Fallback: legacy sequential (only if RPC missing, e.g. before migration) ──
  // Keep idempotency guard + correct tasks_created count for backward compat.
  if (rpcErr && !String(rpcErr.message).includes("not found")) {
    // Real error from RPC (auth / ownership) — surface it
    const msg = rpcErr.message;
    const status = msg.includes("not owned") || msg.includes("Not authenticated") ? 403 : 500;
    return error(msg, status);
  }

  const { data: customer, error: fetchErr } = await supabase.from("customers").select("id, stage").eq("id", params.id).single();
  if (fetchErr) return error(fetchErr.message, (fetchErr as { code?: string }).code === "PGRST116" ? 404 : 500);
  const fromStage = customer.stage as string;
  if (fromStage === toStage) {
    const { data: full } = await supabase.from("customers").select("*").eq("id", params.id).single();
    return json({ data: full, history: null, tasks_created: 0, noop: true, message: "Already in stage" });
  }
  const { data: updated, error: updErr } = await supabase.from("customers").update({ stage: toStage as never }).eq("id", params.id).select().single();
  if (updErr) return error(updErr.message, 400);
  const { data: hist, error: histErr } = await supabase.from("pipeline_stage_history").insert({
    customer_id: params.id, owner_id: user.id, from_stage: fromStage as never, to_stage: toStage as never,
  }).select().single();
  if (histErr) return error(histErr.message, 500);
  let tasksCreated = 0;
  if (toStage === "credit") {
    // Idempotent: unique partial index uq_tasks_auto_template prevents duplicates even on race
    const rows = (await import("@/lib/credit-tasks")).CREDIT_TEMPLATE_TASKS.map(t => ({
      customer_id: params.id, owner_id: user.id, title: t.title, source: "auto_template" as const, status: "todo" as const,
    }));
    const { data: inserted } = await supabase.from("tasks").insert(rows).select("id");
    // Count only what this request inserted (insert ignores conflicts via ON CONFLICT DO NOTHING after 00003;
    // before that, sequential guard was count==0 — this fallback counts inserted rows which is correct)
    tasksCreated = inserted?.length ?? 0;
    // If fallback inserted 0 due to pre-existing, don't double-count
    if (tasksCreated === 0) {
      const { count } = await supabase.from("tasks").select("id", { count: "exact", head: true }).eq("customer_id", params.id).eq("source", "auto_template");
      // If count is 4, fallback already did its job earlier — return 0 for this call (already handled above)
    }
  }
  return json({ data: updated, history: hist, tasks_created: tasksCreated, noop: false });
}
