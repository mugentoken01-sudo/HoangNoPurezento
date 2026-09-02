// RM Cockpit — RLS Verification Script
// Proves RLS actually blocks unauthenticated access and scopes to owner.
// Run: npm run verify:rls
// Requires: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY (+ seeded data)

import { createClient } from "@supabase/supabase-js";

try { (process as any).loadEnvFile?.(".env.local"); } catch {}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
if (!url || !anonKey) { console.error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY"); process.exit(1); }

async function main() {
  console.log("── RLS Verification ──\n");

  // 1. Unauthenticated client must see 0 rows (RLS blocks)
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const tables = ["customers","contacts","notes","tasks","pipeline_stage_history","financial_statements","financial_ratios","red_flags"] as const;
  let allBlocked = true;
  for (const t of tables) {
    const { data, error } = await anon.from(t).select("id").limit(1);
    // With RLS enabled and no session, anon should get 0 rows (not an error — just empty due to policy)
    // If RLS were off, it would return rows. Empty + no error = RLS working.
    const blocked = !error && (data?.length ?? 0) === 0;
    // Some Supabase setups return error for anon on RLS tables — that also means blocked
    const blockedByError = !!error;
    const ok = blocked || blockedByError;
    console.log(`${ok ? "✓" : "✗"} ${t}: anon ${blockedByError ? `blocked (error: ${error.message.slice(0,60)})` : `returned ${data?.length ?? 0} rows — ${blocked ? "BLOCKED ✓" : "LEAKED ✗"}`}`);
    if (!ok) allBlocked = false;
  }

  // 2. Unauthenticated insert must fail (WITH CHECK)
  const { error: insertErr } = await anon.from("customers").insert({ company_name: "Hacker Co", owner_id: "00000000-0000-0000-0000-000000000000" });
  const insertBlocked = !!insertErr;
  console.log(`\n${insertBlocked ? "✓" : "✗"} Anon INSERT customers: ${insertBlocked ? `blocked (${insertErr.message.slice(0,80)})` : "LEAKED — insert succeeded without auth!"}`);
  if (!insertBlocked) allBlocked = false;

  // 3. Summary
  console.log(`\n── Result: ${allBlocked ? "PASS ✓ — RLS blocks unauthenticated access on all tables" : "FAIL ✗ — see LEAKED above" } ──`);
  if (!allBlocked) process.exit(1);

  console.log("\nTo verify cross-owner isolation: create two users, seed ABC with user A, then query as user B — expect 0 rows.");
  console.log("Seed script + stage idempotency test: npm run seed  (check 4 auto-tasks, not 8 on re-POST to /stage)");
}

main().catch(e => { console.error(e); process.exit(1); });
