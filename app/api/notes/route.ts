export const dynamic = "force-dynamic";
import { json, error, requireUser, withOwner, zodError } from "@/lib/api-helpers";
import { noteCreateSchema } from "@/lib/validations";

export async function GET(req: Request) {
  const { user, supabase, error: authErr } = await requireUser();
  if (!user) return error(authErr, 401);
  const url = new URL(req.url);
  const customerId = url.searchParams.get("customer_id");
  if (customerId) {
    const { data: owner } = await supabase.from("customers").select("id").eq("id", customerId).maybeSingle();
    if (!owner) return json({ data: [] });
  }
  let q = supabase.from("notes").select("*").order("created_at", { ascending: false });
  if (customerId) q = q.eq("customer_id", customerId);
  const { data, error: dbErr } = await q;
  if (dbErr) return error(dbErr.message, 500);
  return json({ data });
}

export async function POST(req: Request) {
  const { user, supabase, error: authErr } = await requireUser();
  if (!user) return error(authErr, 401);
  const body = await req.json().catch(() => null);
  if (!body) return error("Invalid JSON", 400);
  const parsed = noteCreateSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);
  const { data: customer } = await supabase.from("customers").select("id").eq("id", parsed.data.customer_id).maybeSingle();
  if (!customer) return error("Customer not found or not owned by caller", 403);
  const row = withOwner(parsed.data as Record<string, unknown>, user.id);
  const { data, error: dbErr } = await supabase.from("notes").insert(row).select().single();
  if (dbErr) return error(dbErr.message, 400);
  return json({ data }, 201);
}
