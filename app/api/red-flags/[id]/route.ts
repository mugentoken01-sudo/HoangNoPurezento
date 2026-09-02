import { json, error, requireUser, zodError } from "@/lib/api-helpers";
import { redFlagUpdateSchema } from "@/lib/validations";
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { user, supabase, error: authErr } = await requireUser();
  if (!user) return error(authErr, 401);
  const { data, error: dbErr } = await supabase.from("red_flags").select("*").eq("id", params.id).single();
  if (dbErr) return error(dbErr.message, dbErr.code === "PGRST116" ? 404 : 500);
  return json({ data });
}
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { user, supabase, error: authErr } = await requireUser();
  if (!user) return error(authErr, 401);
  const body = await req.json().catch(() => null);
  const parsed = redFlagUpdateSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);
  const { data, error: dbErr } = await supabase.from("red_flags").update(parsed.data).eq("id", params.id).select().single();
  if (dbErr) return error(dbErr.message, 400);
  return json({ data });
}
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { user, supabase, error: authErr } = await requireUser();
  if (!user) return error(authErr, 401);
  const { error: dbErr } = await supabase.from("red_flags").delete().eq("id", params.id);
  if (dbErr) return error(dbErr.message, 500);
  return json({ ok: true });
}
