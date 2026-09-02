import { createClient } from "@supabase/supabase-js";

try { (process as any).loadEnvFile?.(".env.local"); } catch {}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? "";
if (!url || !serviceKey || serviceKey.includes("REPLACE_WITH") || serviceKey.includes("••••")) {
  console.error("Missing Supabase URL/service key — paste full SUPABASE_SECRET_KEY from Dashboard → API Keys into .env.local");
  console.error(`  url=${url ? "ok" : "MISSING"}  key=${serviceKey ? serviceKey.slice(0,12)+"…" : "MISSING"}`);
  process.exit(1);
}
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const RM_EMAIL = "rm@demo.local";
const RM_PASSWORD = "Demo1234!";

async function ensureUser(): Promise<string> {
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: RM_EMAIL, password: RM_PASSWORD, email_confirm: true,
  });
  if (created?.user) { console.log(`Created user ${RM_EMAIL} (${created.user.id})`); return created.user.id; }
  if (createErr && !createErr.message.includes("already registered")) throw createErr;
  const { data: listed } = await admin.auth.admin.listUsers();
  const found = listed.users.find(u => u.email === RM_EMAIL);
  if (!found) throw new Error("User not found after create attempt");
  console.log(`Reusing user ${RM_EMAIL} (${found.id})`);
  await admin.auth.admin.updateUserById(found.id, { password: RM_PASSWORD });
  return found.id;
}

async function main() {
  const ownerId = await ensureUser();
  await admin.from("customers").delete().eq("company_name", "Công ty ABC").eq("owner_id", ownerId);
  console.log("Cleaned previous ABC rows");
  const { data: customer, error: cErr } = await admin.from("customers").insert({
    owner_id: ownerId,
    company_name: "Công ty ABC",
    industry: "Phân phối",
    revenue_reported: 80_000_000_000,
    credit_need_type: "VLĐ",
    credit_need_amount: 5_000_000_000,
    credit_need_purpose: "Bổ sung vốn lưu động",
    current_banks: ["BIDV"],
    stage: "lead",
    status: "active",
  }).select().single();
  if (cErr) throw cErr;
  console.log("✓ Customer ABC:", customer.id, customer.stage);
  await admin.from("pipeline_stage_history").insert({
    owner_id: ownerId, customer_id: customer.id, from_stage: null, to_stage: "lead",
  });
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const { data: note } = await admin.from("notes").insert({
    owner_id: ownerId, customer_id: customer.id,
    content: "Gọi khách — khách quan tâm, hẹn gặp tuần sau. Nhu cầu VLĐ 5 tỷ.",
    next_action_type: "call", next_action_date: tomorrow,
  }).select().single();
  console.log("✓ Note:", note!.id, "next_action:", note!.next_action_date);
  await admin.from("customers").update({ stage: "meeting" }).eq("id", customer.id);
  await admin.from("pipeline_stage_history").insert({
    owner_id: ownerId, customer_id: customer.id, from_stage: "lead", to_stage: "meeting",
  });
  console.log("✓ Stage → meeting");
  await admin.from("notes").insert({
    owner_id: ownerId, customer_id: customer.id,
    content: "Gặp tại VP khách — trao đổi nhu cầu, khách cung cấp sơ bộ BCTC 2023.",
    next_action_type: "meeting", next_action_date: tomorrow,
  });
  await admin.from("customers").update({ stage: "credit" }).eq("id", customer.id);
  await admin.from("pipeline_stage_history").insert({
    owner_id: ownerId, customer_id: customer.id, from_stage: "meeting", to_stage: "credit",
  });
  const templateTitles = [
    "Xin BCTC — Request financial statements",
    "Xin dư nợ — Request outstanding debt info",
    "Kiểm tra TSBĐ — Check collateral",
    "Chuẩn bị phương án hạn mức — Prepare credit limit proposal",
  ];
  const { count } = await admin.from("tasks").select("id", { count: "exact", head: true }).eq("customer_id", customer.id).eq("source", "auto_template");
  if ((count ?? 0) === 0) {
    await admin.from("tasks").insert(templateTitles.map(title => ({
      owner_id: ownerId, customer_id: customer.id, title, source: "auto_template", status: "todo",
    })));
  }
  console.log("✓ Stage → credit + 4 auto-tasks");
  const { data: fs } = await admin.from("financial_statements").insert({
    owner_id: ownerId, customer_id: customer.id, period: "2023",
    revenue: 80_000_000_000, cogs: 60_000_000_000, net_income: 3_200_000_000,
    ebit: 5_000_000_000, ebitda: 6_500_000_000, interest_expense: 1_800_000_000,
    total_assets: 45_000_000_000, total_liabilities: 28_000_000_000, total_equity: 17_000_000_000,
    current_assets: 22_000_000_000, current_liabilities: 18_000_000_000,
    inventory: 9_000_000_000, receivables: 7_000_000_000, payables: 5_000_000_000,
    cfo: 1_100_000_000, total_debt: 20_000_000_000, cash: 2_000_000_000,
  }).select().single();
  console.log("✓ FinancialStatement 2023:", fs!.id);
  const current_ratio = fs!.current_assets! / fs!.current_liabilities!;
  const quick_ratio = (fs!.current_assets! - fs!.inventory!) / fs!.current_liabilities!;
  await admin.from("financial_ratios").insert({
    owner_id: ownerId, customer_id: customer.id, financial_statement_id: fs!.id, period: "2023",
    current_ratio, quick_ratio,
    debt_to_equity: fs!.total_debt! / fs!.total_equity!,
    debt_to_ebitda: fs!.total_debt! / fs!.ebitda!,
    interest_coverage: fs!.ebit! / fs!.interest_expense!,
    cfo_to_net_income: fs!.cfo! / fs!.net_income!,
    receivable_days: (fs!.receivables! * 365) / fs!.revenue!,
    inventory_days: (fs!.inventory! * 365) / fs!.cogs!,
    payable_days: (fs!.payables! * 365) / fs!.cogs!,
  });
  console.log("✓ FinancialRatios computed");
  const { data: tasks } = await admin.from("tasks").select("id, title, source").eq("customer_id", customer.id);
  const { data: history } = await admin.from("pipeline_stage_history").select("from_stage, to_stage").eq("customer_id", customer.id).order("changed_at");
  console.log("\n── Seed complete ──");
  console.log(`Customer: ${customer.company_name} (${customer.id}) stage=${customer.stage} → now credit`);
  console.log(`Tasks: ${tasks?.length} (auto_template: ${tasks?.filter(t=>t.source==="auto_template").length})`);
  console.log(`History: ${history?.map(h=>`${h.from_stage ?? "∅"}→${h.to_stage}`).join(", ")}`);
  console.log(`\nNext: test Stage endpoint idempotency → POST /api/customers/${customer.id}/stage { to_stage: "credit" } should create 0 extra tasks`);
}
main().catch(e => { console.error(e); process.exit(1); });
