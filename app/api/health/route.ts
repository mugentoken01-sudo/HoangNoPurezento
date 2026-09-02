export const dynamic = "force-dynamic";
import { json } from "@/lib/api-helpers";
export async function GET() {
  return json({ ok: true, module: "RM Cockpit M1", time: new Date().toISOString() });
}
