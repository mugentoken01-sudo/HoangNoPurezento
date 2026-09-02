export const dynamic = "force-dynamic";
import { json, error, requireUser } from "@/lib/api-helpers";
export async function GET(req: Request) {
  const { user, supabase, error: authErr } = await requireUser();
  if (!user) return error(authErr, 401);
  const customerId = new URL(req.url).searchParams.get("customer_id");
  if (customerId) {
    const { data: owner } = await supabase.from("customers").select("id").eq("id", customerId).maybeSingle();
    if (!owner) return json({ data: [] });
  }
  let q = supabase.from("financial_ratios").select("*").order("period", { ascending: true });
  if (customerId) q = q.eq("customer_id", customerId);
  const { data, error: dbErr } = await q;
  if (dbErr) return error(dbErr.message, 500);
  return json({ data });
}
