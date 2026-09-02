export const dynamic = "force-dynamic";
import { json, error, requireUser, zodError } from "@/lib/api-helpers";
import { customerUpdateSchema } from "@/lib/validations";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { user, supabase, error: authErr } = await requireUser();
  if (!user) return error(authErr, 401);
  const { data, error: dbErr } = await supabase.from("customers").select("*").eq("id", params.id).single();
  if (dbErr) return error(dbErr.message, dbErr.code === "PGRST116" ? 404 : 500);
  return json({ data });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { user, supabase, error: authErr } = await requireUser();
  if (!user) return error(authErr, 401);
  const body = await req.json().catch(() => null);
  if (!body) return error("Invalid JSON", 400);
  const parsed = customerUpdateSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);
  // Prevent stage mutation via generic PATCH — use /stage endpoint
  if ("stage" in parsed.data) return error("Use POST /api/customers/[id]/stage to change stage", 400);
  const { owner_id: _o, ...payload } = parsed.data as Record<string, unknown>;
  const { data, error: dbErr } = await supabase.from("customers").update(payload).eq("id", params.id).select().single();
  if (dbErr) return error(dbErr.message, dbErr.code === "PGRST116" ? 404 : 400);
  return json({ data });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { user, supabase, error: authErr } = await requireUser();
  if (!user) return error(authErr, 401);
  const { error: dbErr } = await supabase.from("customers").delete().eq("id", params.id);
  if (dbErr) return error(dbErr.message, 500);
  return json({ ok: true });
}
