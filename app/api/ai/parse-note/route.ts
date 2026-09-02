export const dynamic = "force-dynamic";
import { json, error, requireUser } from "@/lib/api-helpers";
import { sanitizeForPrompt } from "@/lib/pii";
import { parseNoteHeuristic } from "@/lib/heuristic";
import { callGemini, callGeminiWithPool, getSystemKeys } from "@/lib/gemini";
import { canConsumeSystemQuota, resetAtIsoHCM } from "@/lib/ai-rate-limit";
import { todayStrInTZ, DASHBOARD_TIMEZONE } from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/server";

// Allowed: extract next_action_type/date from note content
// Forbidden: never compute ratios, never call stage transition, never sole red-flag source

function buildParsePrompt(sanitized: string, todayStr: string): string {
  return `You are extracting the next action from a CRM note for a bank RM. Return ONLY JSON with keys "next_action_type" ("call"|"meeting"|"email"|null) and "next_action_date" (YYYY-MM-DD in ${DASHBOARD_TIMEZONE} or null) and "confidence" ("high"|"medium"|"low").

Rules:
- "gọi lại", "gọi", "call", "liên hệ" → call
- "hẹn gặp", "gặp", "meeting", "họp" → meeting
- "gửi email", "email" → email
- Dates: explicit dd/mm[/yyyy] or relative: "ngày mai"=tomorrow (+1), "ngày mốt"=+2, "tuần sau"=+7, "hôm nay"=today. Use today=${todayStr} as reference.
- Do not invent — if missing, return null.

Note (sanitized): """${sanitized}"""
Today: ${todayStr}
JSON:`;
}

function tryParseJson(text: string): { next_action_type: string | null; next_action_date: string | null; confidence?: string } | null {
  try {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const o = JSON.parse(m[0]);
    return o;
  } catch { return null; }
}

export async function POST(req: Request) {
  const { user, error: authErr } = await requireUser();
  if (!user) return error(authErr, 401);

  const body = await req.json().catch(() => null);
  if (!body || typeof body.content !== "string") return error("content (string) is required", 400);
  const content: string = body.content;
  const customerId: string | undefined = body.customer_id;

  const todayStr = todayStrInTZ(DASHBOARD_TIMEZONE, new Date());

  // Fetch company name for PII sanitization if customerId provided
  let companyName: string | null = null;
  if (customerId) {
    const supabase = await createClient();
    const { data } = await supabase.from("customers").select("company_name").eq("id", customerId).maybeSingle();
    if (data) companyName = (data as { company_name: string }).company_name;
  }

  const sanitized = sanitizeForPrompt(content, { companyName });
  const prompt = buildParsePrompt(sanitized, todayStr);

  // ---- Key precedence: BYOK pool → system pool (capped) → heuristic
  const rawByokHeader = req.headers.get("x-custom-gemini-key")?.trim() || req.headers.get("x-custom-gemini-key".toLowerCase())?.trim() || "";
  const byokKeys = (await import("@/lib/gemini")).parseKeyList(rawByokHeader);

  // 1) BYOK pool — rotates through all user-provided keys, no rate limit, log metadata only (no key)
  if (byokKeys.length > 0) {
    try {
      const { text, keyIndex, totalKeys } = await callGeminiWithPool(prompt, byokKeys);
      const parsed = tryParseJson(text);
      if (parsed) {
        // Validate shape
        const t = ["call","meeting","email"].includes(parsed.next_action_type as string) ? parsed.next_action_type : null;
        const d = parsed.next_action_date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.next_action_date) ? parsed.next_action_date : null;
        return json({
          next_action_type: t,
          next_action_date: d,
          confidence: (parsed.confidence as string) || "medium",
          source: "gemini_byok",
          key_index: keyIndex,
          keys_in_pool: totalKeys,
        });
      }
    } catch (e) {
      // BYOK failure across all keys → fallback to heuristic
      const h = parseNoteHeuristic(content, todayStr);
      return json({
        ...h,
        source: "heuristic",
        fallback_reason: e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200),
        keys_in_pool: byokKeys.length,
      });
    }
    const h = parseNoteHeuristic(content, todayStr);
    return json({ ...h, source: "heuristic", fallback_reason: "gemini_byok_bad_json", keys_in_pool: byokKeys.length });
  }

  // 2) System pool — capped 10/day, atomic
  const systemKeys = getSystemKeys();
  if (systemKeys.length > 0) {
    const rl = await canConsumeSystemQuota(user.id, 10);
    if (!rl.allowed) {
      const resetAt = resetAtIsoHCM();
      return json({ error: "Too Many Requests — system AI quota exceeded", details: { cap: rl.cap, count: rl.count, reset_at: resetAt } }, 429);
    }
    try {
      const { text } = await callGeminiWithPool(prompt, systemKeys);
      const parsed = tryParseJson(text);
      if (parsed) {
        const t = ["call","meeting","email"].includes(parsed.next_action_type as string) ? parsed.next_action_type : null;
        const d = parsed.next_action_date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.next_action_date) ? parsed.next_action_date : null;
        return json({ next_action_type: t, next_action_date: d, confidence: (parsed.confidence as string) || "medium", source: "gemini_system" });
      }
    } catch {
      // fall through to heuristic
    }
    const h = parseNoteHeuristic(content, todayStr);
    return json({ ...h, source: "heuristic" });
  }

  // 3) No key → heuristic immediately, no network
  const h = parseNoteHeuristic(content, todayStr);
  return json({ ...h, source: "heuristic" });
}
