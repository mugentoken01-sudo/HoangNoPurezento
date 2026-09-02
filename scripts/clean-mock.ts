// Clean seeded mock rows — run once after removing mock code
// Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY (or SERVICE_ROLE)
try { (process as unknown as { loadEnvFile?: (p:string)=>void }).loadEnvFile?.(".env.local"); } catch {}
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? "";
if (!url || !key || key.includes("REPLACE_WITH") || key.includes("••••")) {
  console.error("Missing URL/key — fill SUPABASE_SECRET_KEY full value in .env.local (Dashboard → API Keys → Reveal)");
  process.exit(1);
}
const admin = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  console.log("── Clean mock data ──");
  const { data: mocks } = await admin.from("customers").select("id").eq("company_name", "Công ty ABC");
  const ids = (mocks ?? []).map(r => r.id as string);
  if (!ids.length) console.log("No mock customer 'Công ty ABC' — DB already clean.");
  else {
    const { error } = await admin.from("customers").delete().in("id", ids);
    if (error) throw error;
    console.log(`✓ Deleted ${ids.length} mock customer(s) 'Công ty ABC' + cascaded children`);
  }
  const { count: flags2023 } = await admin.from("red_flags").select("id", { count: "exact", head: true }).eq("period", "2023");
  console.log(`Red flags period=2023 remaining: ${flags2023 ?? 0} (0 = clean)`);
  console.log("\nDone. DB clean — only UI-created data remains.");
  console.log("To also delete seed user: uncomment block in this file (rm@demo.local).");
}
main().catch(e => { console.error(e); process.exit(1); });
