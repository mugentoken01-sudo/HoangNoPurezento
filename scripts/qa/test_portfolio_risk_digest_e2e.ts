import { createClient } from "@supabase/supabase-js";
import { buildRiskDigest, sortRiskDigest, DASHBOARD_TIMEZONE, todayStrInTZ } from "../../lib/dashboard";

async function runE2E() {
  console.log("=== Portfolio Risk Digest End-to-End Integration Test ===");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wxtkigjdfuyswlzsfebp.supabase.co";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!supabaseKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: "thaiphuchung1010@gmail.com",
    password: "123sinhtobo",
  });

  if (authErr || !authData.user) {
    console.error("Auth failed:", authErr);
    process.exit(1);
  }

  const userId = authData.user.id;
  console.log("✔ Authenticated RM:", authData.user.email, "id:", userId);

  const testCompanyName = `QA_Risk_Test_${Date.now()}`;
  let customerId: string | null = null;

  try {
    // Step 1: Create test customer
    const { data: cust, error: custErr } = await supabase
      .from("customers")
      .insert({
        company_name: testCompanyName,
        stage: "credit",
        status: "active",
        owner_id: userId,
      })
      .select()
      .single();

    if (custErr || !cust) throw new Error(`Failed to create test customer: ${custErr?.message}`);
    customerId = cust.id;
    console.log(`✔ Step 1: Created test customer '${testCompanyName}' (id: ${customerId})`);

    // Step 2: Insert distressed red flags
    const { error: flagErr } = await supabase.from("red_flags").insert([
      {
        customer_id: customerId,
        owner_id: userId,
        period: "2024",
        source: "rule_engine",
        rule_triggered: "negative_equity",
        severity: "high",
        description: "Vốn chủ sở hữu âm (-50 tỷ VND) - Rủi ro mất vốn rất cao",
        created_at: new Date().toISOString(),
      },
      {
        customer_id: customerId,
        owner_id: userId,
        period: "2024",
        source: "rule_engine",
        rule_triggered: "debt_to_equity",
        severity: "medium",
        description: "Hệ số nợ/VCSH vượt ngưỡng an toàn",
        created_at: new Date(Date.now() - 60000).toISOString(),
      },
    ]);

    if (flagErr) throw new Error(`Failed to insert red flags: ${flagErr.message}`);
    console.log("✔ Step 2: Inserted High + Medium red flags for customer.");

    // Step 3: Run Summary data extraction (simulating GET /api/dashboard/summary)
    const { data: customers } = await supabase
      .from("customers")
      .select("id, company_name, stage, status, created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    const { data: redFlags } = await supabase
      .from("red_flags")
      .select("customer_id, severity, rule_triggered, description, created_at")
      .order("created_at", { ascending: false })
      .limit(300);

    const digest = sortRiskDigest(buildRiskDigest(customers || [], redFlags || []));
    console.log(`✔ Step 3: Built Risk Digest. Total flagged customers: ${digest.length}`);

    const found = digest.find((r) => r.customer_id === customerId);
    if (!found) {
      throw new Error(`Test customer ${customerId} not found in Risk Digest!`);
    }

    console.log("✔ Found in Risk Digest:", {
      company_name: found.company_name,
      stage: found.stage,
      worst_severity: found.worst_severity,
      flag_count: found.flag_count,
      latest_rule_triggered: found.latest_rule_triggered,
    });

    if (found.worst_severity !== "high") {
      throw new Error(`Expected worst_severity 'high', got '${found.worst_severity}'`);
    }
    if (found.flag_count !== 2) {
      throw new Error(`Expected flag_count 2, got ${found.flag_count}`);
    }
    if (found.latest_rule_triggered !== "negative_equity") {
      throw new Error(`Expected latest_rule_triggered 'negative_equity', got '${found.latest_rule_triggered}'`);
    }
    console.log("✔ Step 4: Digest properties verified (High severity wins, flag_count=2, latest rule correct).");

    // Step 5: Clear flags and verify disappearance
    const { error: delFlagErr } = await supabase.from("red_flags").delete().eq("customer_id", customerId);
    if (delFlagErr) throw new Error(`Failed to delete flags: ${delFlagErr.message}`);

    const { data: redFlagsAfter } = await supabase
      .from("red_flags")
      .select("customer_id, severity, rule_triggered, description, created_at")
      .order("created_at", { ascending: false })
      .limit(300);

    const digestAfter = sortRiskDigest(buildRiskDigest(customers || [], redFlagsAfter || []));
    const foundAfter = digestAfter.find((r) => r.customer_id === customerId);
    if (foundAfter) {
      throw new Error("Customer still present in digest after flags cleared!");
    }
    console.log("✔ Step 5: Cleared flags -> customer immediately disappeared from Risk Digest.");
  } finally {
    // Step 6: Cleanup
    if (customerId) {
      await supabase.from("red_flags").delete().eq("customer_id", customerId);
      await supabase.from("customers").delete().eq("id", customerId);
      console.log(`✔ Step 6: Cleaned up test customer ${customerId}`);
    }
  }

  console.log("==========================================================");
  console.log("🎉 ALL PORTFOLIO RISK DIGEST E2E TESTS PASSED SUCCESSFULLY");
  console.log("==========================================================");
}

runE2E().catch((err) => {
  console.error("E2E Test Failed:", err);
  process.exit(1);
});
