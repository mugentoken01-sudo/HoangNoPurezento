// RM Cockpit Module 5 — Deterministic heuristic fallbacks (no external call, no randomness)
// Two pure functions: parseNoteHeuristic + draftCommentaryHeuristic

import { todayStrInTZ, DASHBOARD_TIMEZONE } from "./dashboard";

// ── Note parsing heuristic ──────────────────────────────────────────────
export type ParsedNoteHeuristic = {
  next_action_type: "call" | "meeting" | "email" | null;
  next_action_date: string | null; // YYYY-MM-DD
  confidence: "high" | "medium" | "low";
};

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function nextWeekday(dateStr: string): string {
  // naive: +7 days
  return addDays(dateStr, 7);
}

export function parseNoteHeuristic(content: string, todayStr?: string): ParsedNoteHeuristic {
  const t = (todayStr ?? todayStrInTZ(DASHBOARD_TIMEZONE, new Date()));
  const lower = (content || "").toLowerCase();
  // Action type — Vietnamese + English, first match wins priority meeting > email > call
  let type: ParsedNoteHeuristic["next_action_type"] = null;
  if (/(hẹn gặp|gặp khách|gặp gỡ|meeting|họp|phỏng vấn)/i.test(lower)) type = "meeting";
  else if (/(gửi email|gui email|gởi email|email|mail cho)/i.test(lower)) type = "email";
  else if (/(gọi lại|goi lai|gọi|goi|call|liên hệ|lien he|alo)/i.test(lower)) type = "call";

  // Date — order: explicit dd/mm, relative phrases
  let date: string | null = null;

  // Explicit dd/mm or dd-mm or dd/mm/yyyy
  const explicit = lower.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if (explicit) {
    const dd = explicit[1].padStart(2, "0");
    const mm = explicit[2].padStart(2, "0");
    let yyyy = explicit[3];
    if (!yyyy) {
      // infer year: if mm/dd already passed this year in tz, roll to next year
      const inferred = `${t.slice(0, 4)}-${mm}-${dd}`;
      date = inferred < t ? `${String(Number(t.slice(0, 4)) + 1)}-${mm}-${dd}` : inferred;
    } else {
      if (yyyy.length === 2) yyyy = "20" + yyyy;
      date = `${yyyy}-${mm}-${dd}`;
    }
    // validate
    const d = new Date(date + "T00:00:00Z");
    if (Number.isNaN(d.getTime())) date = null;
  }

  if (!date) {
    if (/ngày mai|ngay mai|\b(1 ngày nữa|mai)\b/.test(lower) && !/ngày mốt/.test(lower)) {
      // check "ngày mai" beats "ngày mốt"
      if (/ngày mai|ngay mai/.test(lower)) date = addDays(t, 1);
      else if (/\bmai\b/.test(lower)) date = addDays(t, 1);
    }
    if (!date && /ngày mốt|ngay mot/.test(lower)) date = addDays(t, 2);
    if (!date && /tuần sau|tuan sau/.test(lower)) date = nextWeekday(t);
    if (!date && /(hôm nay|hom nay)\b/.test(lower)) date = t;
  }

  const confidence: ParsedNoteHeuristic["confidence"] =
    type && date ? "high" : type || date ? "medium" : "low";

  return { next_action_type: type, next_action_date: date, confidence };
}

// ── Commentary heuristic ────────────────────────────────────────────────
export type CommentaryInput = {
  companyName?: string | null;
  period: string;
  ratios: Record<string, number | null>;
  redFlags: { rule_triggered: string; severity: string; description: string; period?: string | null }[];
  prevPeriod?: string | null;
};

export function draftCommentaryHeuristic(input: CommentaryInput): string {
  const name = input.companyName ? "[COMPANY]" : "the company";
  const period = input.period;
  const r = input.ratios;
  const flags = input.redFlags;

  const parts: string[] = [];
  parts.push(`Credit assessment for ${name} — period ${period}${input.prevPeriod ? ` (vs ${input.prevPeriod})` : ""}.`);

  // Liquidity sentence
  if (r.current_ratio != null) {
    const cr = Number(r.current_ratio).toFixed(2);
    const qr = r.quick_ratio != null ? Number(r.quick_ratio).toFixed(2) : null;
    if (Number(r.current_ratio) < 1) parts.push(`Liquidity is stressed: current ratio ${cr}${qr ? `, quick ratio ${qr}` : ""} — below 1.0, short-term obligations exceed liquid assets.`);
    else if (Number(r.current_ratio) < 1.2) parts.push(`Liquidity is thin: current ratio ${cr}${qr ? `, quick ratio ${qr}` : ""} — buffer under 1.2x.`);
    else parts.push(`Liquidity is adequate: current ratio ${cr}${qr ? `, quick ratio ${qr}` : ""}.`);
  }

  // Leverage
  if (r.debt_to_equity != null) parts.push(`Leverage — Debt/Equity ${Number(r.debt_to_equity).toFixed(2)}${r.debt_to_ebitda != null ? `, Debt/EBITDA ${Number(r.debt_to_ebitda).toFixed(2)}x` : ""}.`);

  // Coverage
  if (r.interest_coverage != null) {
    const ic = Number(r.interest_coverage);
    if (ic < 1) parts.push(`Interest coverage ${ic.toFixed(2)}x — below 1.0x, earnings do not cover interest.`);
    else if (ic < 2) parts.push(`Interest coverage ${ic.toFixed(2)}x — below 2.0x, debt-service risk.`);
    else parts.push(`Interest coverage ${ic.toFixed(2)}x — comfortable.`);
  }

  // Efficiency
  if (r.receivable_days != null || r.inventory_days != null) {
    const segs: string[] = [];
    if (r.receivable_days != null) segs.push(`receivable ${Number(r.receivable_days).toFixed(0)} days`);
    if (r.inventory_days != null) segs.push(`inventory ${Number(r.inventory_days).toFixed(0)} days`);
    if (r.payable_days != null) segs.push(`payable ${Number(r.payable_days).toFixed(0)} days`);
    parts.push(`Working capital — ${segs.join(", ")}.`);
  }

  // Growth
  if (r.revenue_growth != null) parts.push(`Revenue growth ${(Number(r.revenue_growth) * 100).toFixed(1)}%${r.net_income_growth != null ? `, net income growth ${(Number(r.net_income_growth) * 100).toFixed(1)}%` : ""}.`);

  // Flags narration — never the sole source: we narrate already-computed flags
  if (flags.length === 0) {
    parts.push("No rule-engine red flags triggered for this period.");
  } else {
    const high = flags.filter(f => f.severity === "high").length;
    const medium = flags.filter(f => f.severity === "medium").length;
    parts.push(`Red flags (${flags.length}: ${high} high, ${medium} medium) — ${flags.map(f => `${f.rule_triggered} (${f.severity}): ${f.description}`).join(" | ")}`);
  }

  parts.push("This draft is template-based (heuristic) — ratios are from the rule engine, not generated.");

  return parts.join(" ");
}
