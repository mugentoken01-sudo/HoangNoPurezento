import { json, error, requireUser, withOwner, zodError } from "@/lib/api-helpers";
import { fsCreateSchema } from "@/lib/validations";
import { computeRatios, evaluateRedFlags } from "@/lib/ratios";
import { normalizeThresholds } from "@/lib/red-flag-thresholds";

export async function GET(req: Request) {
  const { user, supabase, error: authErr } = await requireUser();
  if (!user) return error(authErr, 401);
  const customerId = new URL(req.url).searchParams.get("customer_id");
  if (customerId) {
    const { data: owner } = await supabase.from("customers").select("id").eq("id", customerId).maybeSingle();
    if (!owner) return json({ data: [] });
  }
  let q = supabase.from("financial_statements").select("*").order("period", { ascending: true });
  if (customerId) q = q.eq("customer_id", customerId);
  const { data, error: dbErr } = await q;
  if (dbErr) return error(dbErr.message, 500);
  return json({ data });
}

export async function POST(req: Request) {
  const { user, supabase, error: authErr } = await requireUser();
  if (!user) return error(authErr, 401);
  const raw = await req.json().catch(() => null);
  if (!raw) return error("Invalid JSON", 400);
  const thresholds = raw._thresholds ? normalizeThresholds(raw._thresholds) : undefined;
  const { _thresholds: _t, ...body } = raw as Record<string, unknown> & { _thresholds?: unknown };
  const parsed = fsCreateSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);
  const { data: customer } = await supabase.from("customers").select("id").eq("id", parsed.data.customer_id).maybeSingle();
  if (!customer) return error("Customer not found or not owned by caller", 403);

  const row = withOwner(parsed.data as Record<string, unknown>, user.id);
  const { data: fs, error: dbErr } = await supabase.from("financial_statements").insert(row).select().single();
  if (dbErr) {
    if (dbErr.code === "23505") return error("Duplicate period for this customer (unique customer_id, period)", 409);
    return error(dbErr.message, 400);
  }

  const { data: prev } = await supabase.from("financial_statements")
    .select("*").eq("customer_id", fs.customer_id).neq("id", fs.id)
    .order("period", { ascending: false }).limit(1).maybeSingle();

  const ratios = computeRatios(fs as never, prev as never);
  await supabase.from("financial_ratios").insert({
    customer_id: fs.customer_id, owner_id: user.id,
    financial_statement_id: fs.id, period: fs.period, ...ratios,
  });

  const flags = evaluateRedFlags(fs as never, prev as never, ratios, thresholds);
  if (flags.length) {
    await supabase.from("red_flags").insert(flags.map(f => ({
      customer_id: fs.customer_id, owner_id: user.id, period: fs.period,
      financial_statement_id: fs.id,
      source: "rule_engine",
      rule_triggered: f.rule, severity: f.severity, description: f.description,
    })));
  }

  const { data: createdRatios } = await supabase.from("financial_ratios").select("*").eq("financial_statement_id", fs.id).maybeSingle();
  return json({ data: fs, ratios: createdRatios, flags_created: flags.length }, 201);
}
