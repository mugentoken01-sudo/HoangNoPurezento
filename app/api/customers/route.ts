import { json, error, requireUser, withOwner, zodError } from "@/lib/api-helpers";
import { customerCreateSchema } from "@/lib/validations";

export async function GET(req: Request) {
  const { user, supabase, error: authErr } = await requireUser();
  if (!user) return error(authErr, 401);
  const url = new URL(req.url);
  const stage = url.searchParams.get("stage");
  const industry = url.searchParams.get("industry");
  let q = supabase.from("customers").select("*").order("created_at", { ascending: false });
  if (stage) q = q.eq("stage", stage as never);
  if (industry) q = q.eq("industry", industry);
  const { data, error: dbErr } = await q;
  if (dbErr) return error(dbErr.message, 500);
  return json({ data });
}

export async function POST(req: Request) {
  const { user, supabase, error: authErr } = await requireUser();
  if (!user) return error(authErr, 401);
  const body = await req.json().catch(() => null);
  if (!body) return error("Invalid JSON", 400);
  const parsed = customerCreateSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);
  const row = withOwner(parsed.data as Record<string, unknown>, user.id);
  const { data, error: dbErr } = await supabase.from("customers").insert(row).select().single();
  if (dbErr) return error(dbErr.message, 400);
  await supabase.from("pipeline_stage_history").insert({
    customer_id: data.id, owner_id: user.id, from_stage: null, to_stage: data.stage,
  });
  return json({ data }, 201);
}
