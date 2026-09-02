export const dynamic = "force-dynamic";
import { json, error, requireUser } from "@/lib/api-helpers";
import { sanitizeForPrompt } from "@/lib/pii";
import { draftCommentaryHeuristic } from "@/lib/heuristic";
import { callGemini, callGeminiWithPool, getSystemKeys } from "@/lib/gemini";
import { canConsumeSystemQuota, resetAtIsoHCM } from "@/lib/ai-rate-limit";
import { createClient } from "@/lib/supabase/server";

// Allowed: narrate already-computed ratios/red_flags
// Forbidden: must not alter ratios, must not trigger stage, never sole flag source

function buildCommentaryPrompt(
  sanitizedCompany: string,
  period: string,
  ratios: Record<string, unknown>,
  flags: { rule_triggered: string; severity: string; description: string }[],
  prevPeriod?: string | null
): string {
  const ratiosLines = Object.entries(ratios)
    .filter(([, v]) => v != null)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");
  const flagsBlock = flags.length
    ? flags.map(f => `- ${f.rule_triggered} (${f.severity}): ${f.description}`).join("\n")
    : "No red flags for this period.";
  return `You are drafting a credit-assessment commentary paragraph for a bank RM. Use ONLY the numbers and flags below — do not alter, recompute, or invent any ratio figures. Narrate what the numbers mean; do not add new metrics.

Company: ${sanitizedCompany}
Period: ${period}${prevPeriod ? ` (previous: ${prevPeriod})` : ""}
Ratios (from rule engine, do not change):
${ratiosLines || "(no ratios)"}
Red flags (from rule engine, narrate only these):
${flagsBlock}

Write one concise paragraph (4-6 sentences) for the RM's credit file. Label it as AI draft. Plain text, no JSON.`;
}

export async function POST(req: Request) {
  const { user, error: authErr } = await requireUser();
  if (!user) return error(authErr, 401);

  const body = await req.json().catch(() => null);
  if (!body) return error("Invalid JSON", 400);
  const financial_statement_id: string | undefined = body.financial_statement_id;
  const customer_id: string | undefined = body.customer_id;
  const period: string | undefined = body.period;

  const supabase = await createClient();

  // Resolve FS row + ratios + flags — all owner-scoped via RLS
  let fsRow: Record<string, unknown> | null = null;
  let ratiosRow: Record<string, unknown> | null = null;
  let flagsRows: { rule_triggered: string; severity: string; description: string }[] = [];
  let companyName: string | null = null;
  let resolvedPeriod: string | null = null;

  if (financial_statement_id) {
    const { data: fs } = await supabase.from("financial_statements").select("*").eq("id", financial_statement_id).maybeSingle();
    if (!fs) return error("Financial statement not found", 404);
    fsRow = fs as Record<string, unknown>;
    resolvedPeriod = String((fs as { period: string }).period);
    const { data: ratios } = await supabase.from("financial_ratios").select("*").eq("financial_statement_id", financial_statement_id).maybeSingle();
    ratiosRow = (ratios as Record<string, unknown>) ?? null;
    const cid = (fs as { customer_id: string }).customer_id;
    const { data: cust } = await supabase.from("customers").select("company_name").eq("id", cid).maybeSingle();
    companyName = (cust as { company_name: string } | null)?.company_name ?? null;
    const { data: flags } = await supabase.from("red_flags").select("rule_triggered, severity, description").eq("financial_statement_id", financial_statement_id);
    flagsRows = (flags as typeof flagsRows) ?? [];
    // fallback: legacy flags by period if none found via FK
    if (flagsRows.length === 0) {
      const { data: legacy } = await supabase.from("red_flags").select("rule_triggered, severity, description").eq("customer_id", cid).eq("period", resolvedPeriod);
      flagsRows = (legacy as typeof flagsRows) ?? [];
    }
  } else if (customer_id && period) {
    const { data: fs } = await supabase
      .from("financial_statements")
      .select("*")
      .eq("customer_id", customer_id)
      .eq("period", period)
      .maybeSingle();
    if (!fs) return error("Financial statement not found for customer/period", 404);
    fsRow = fs as Record<string, unknown>;
    resolvedPeriod = String((fs as { period: string }).period);
    const { data: ratios } = await supabase.from("financial_ratios").select("*").eq("financial_statement_id", (fs as { id: string }).id).maybeSingle();
    ratiosRow = (ratios as Record<string, unknown>) ?? null;
    const { data: cust } = await supabase.from("customers").select("company_name").eq("id", customer_id).maybeSingle();
    companyName = (cust as { company_name: string } | null)?.company_name ?? null;
    const { data: flags } = await supabase.from("red_flags").select("rule_triggered, severity, description").eq("financial_statement_id", (fs as { id: string }).id);
    flagsRows = (flags as typeof flagsRows) ?? [];
    if (flagsRows.length === 0) {
      const { data: legacy } = await supabase.from("red_flags").select("rule_triggered, severity, description").eq("customer_id", customer_id).eq("period", period);
      flagsRows = (legacy as typeof flagsRows) ?? [];
    }
  } else {
    return error("Provide financial_statement_id or (customer_id + period)", 400);
  }

  // Ratios for prompt — strip metadata, keep numeric fields
  const ratioNums: Record<string, unknown> = {};
  if (ratiosRow) {
    for (const k of ["revenue_growth","net_income_growth","current_ratio","quick_ratio","debt_to_equity","debt_to_ebitda","interest_coverage","cfo_to_net_income","receivable_days","inventory_days","payable_days"]) {
      if (ratiosRow[k] != null) ratioNums[k] = ratiosRow[k];
    }
  }

  // Try to find prev period for commentary context
  let prevPeriod: string | null = null;
  if (resolvedPeriod) {
    const cid = (fsRow as { customer_id: string }).customer_id;
    const { data: prev } = await supabase
      .from("financial_statements")
      .select("period")
      .eq("customer_id", cid)
      .neq("id", (fsRow as { id: string }).id)
      .order("period", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (prev) prevPeriod = (prev as { period: string }).period;
  }

  const sanitizedCompany = sanitizeForPrompt(companyName ?? "Company", { companyName });
  const prompt = buildCommentaryPrompt(sanitizedCompany, resolvedPeriod ?? period ?? "", ratioNums, flagsRows, prevPeriod);

  // Heuristic input (deterministic fallback)
  const heuristicText = draftCommentaryHeuristic({
    companyName,
    period: resolvedPeriod ?? period ?? "",
    ratios: ratioNums as Record<string, number | null>,
    redFlags: flagsRows,
    prevPeriod,
  });

  const rawByokHeader = req.headers.get("x-custom-gemini-key")?.trim() || "";
  const byokKeys = (await import("@/lib/gemini")).parseKeyList(rawByokHeader);

  // 1) BYOK pool — no cap, rotates through all user-provided keys
  if (byokKeys.length > 0) {
    try {
      const { text, keyIndex, totalKeys } = await callGeminiWithPool(prompt, byokKeys);
      return json({
        draft: text.trim(),
        source: "gemini_byok",
        sanitized_company: sanitizedCompany,
        key_index: keyIndex,
        keys_in_pool: totalKeys,
      });
    } catch (e) {
      return json({
        draft: heuristicText,
        source: "heuristic",
        fallback_reason: e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200),
        keys_in_pool: byokKeys.length,
      });
    }
  }

  // 2) System pool — capped
  const systemKeys = getSystemKeys();
  if (systemKeys.length > 0) {
    const rl = await canConsumeSystemQuota(user.id, 10);
    if (!rl.allowed) {
      return json({ error: "Too Many Requests — system AI quota exceeded", details: { cap: rl.cap, count: rl.count, reset_at: resetAtIsoHCM() } }, 429);
    }
    try {
      const { text } = await callGeminiWithPool(prompt, systemKeys);
      return json({ draft: text.trim(), source: "gemini_system", sanitized_company: sanitizedCompany });
    } catch {
      return json({ draft: heuristicText, source: "heuristic" });
    }
  }

  // 3) No key → heuristic
  return json({ draft: heuristicText, source: "heuristic" });
}
