import { json, error, requireUser, zodError } from "@/lib/api-helpers";
import { fsUpdateSchema } from "@/lib/validations";
import { computeRatios, evaluateRedFlags } from "@/lib/ratios";
import { normalizeThresholds } from "@/lib/red-flag-thresholds";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { user, supabase, error: authErr } = await requireUser();
  if (!user) return error(authErr, 401);
  const { data, error: dbErr } = await supabase.from("financial_statements").select("*").eq("id", params.id).single();
  if (dbErr) return error(dbErr.message, dbErr.code === "PGRST116" ? 404 : 500);
  const { data: ratios } = await supabase.from("financial_ratios").select("*").eq("financial_statement_id", params.id).maybeSingle();
  const { data: flags } = await supabase.from("red_flags").select("*").eq("financial_statement_id", params.id).order("created_at");
  const { data: legacyFlags } = !flags?.length
    ? await supabase.from("red_flags").select("*").eq("customer_id", data.customer_id).eq("period", data.period).order("created_at")
    : { data: null } as { data: null };
  return json({ data, ratios, flags: flags?.length ? flags : legacyFlags ?? [] });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { user, supabase, error: authErr } = await requireUser();
  if (!user) return error(authErr, 401);
  const raw = await req.json().catch(() => null);
  if (!raw) return error("Invalid JSON", 400);
  const thresholds = raw._thresholds ? normalizeThresholds(raw._thresholds) : undefined;
  const { _thresholds: _t, ...body } = raw as Record<string, unknown> & { _thresholds?: unknown };
  const parsed = fsUpdateSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);
  const { data, error: dbErr } = await supabase.from("financial_statements").update(parsed.data).eq("id", params.id).select().single();
  if (dbErr) return error(dbErr.message, 400);
  const { data: prev } = await supabase.from("financial_statements").select("*").eq("customer_id", data.customer_id).neq("id", data.id).order("period", { ascending: false }).limit(1).maybeSingle();
  const ratios = computeRatios(data as never, prev as never);
  await supabase.from("financial_ratios").upsert({ financial_statement_id: data.id, customer_id: data.customer_id, owner_id: user.id, period: data.period, ...ratios }, { onConflict: "financial_statement_id" });

  await supabase.from("red_flags").delete().eq("financial_statement_id", data.id).eq("source", "rule_engine");
  const flags = evaluateRedFlags(data as never, prev as never, ratios, thresholds);
  if (flags.length) {
    await supabase.from("red_flags").insert(flags.map(f => ({
      customer_id: data.customer_id,
      owner_id: user.id,
      period: data.period,
      financial_statement_id: data.id,
      source: "rule_engine",
      rule_triggered: f.rule,
      severity: f.severity,
      description: f.description,
    })));
  }

  const { data: updatedRatios } = await supabase.from("financial_ratios").select("*").eq("financial_statement_id", data.id).maybeSingle();
  const { data: updatedFlags } = await supabase.from("red_flags").select("*").eq("financial_statement_id", data.id).order("created_at");
  return json({ data, ratios: updatedRatios, flags: updatedFlags ?? [], flags_updated: flags.length });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { user, supabase, error: authErr } = await requireUser();
  if (!user) return error(authErr, 401);
  const { error: dbErr } = await supabase.from("financial_statements").delete().eq("id", params.id);
  if (dbErr) return error(dbErr.message, 500);
  return json({ ok: true });
}
